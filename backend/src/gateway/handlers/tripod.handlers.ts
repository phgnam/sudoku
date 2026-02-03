import { Injectable } from '@nestjs/common';
import { GameService } from '../../game/services/game.service';
import type { TypedSocket } from '../types/socket.types';
import { BaseHandler, GatewayContext } from './base.handler';
import { Throttle } from '../../common/decorators/throttle.decorator';

/**
 * Handles Tripod Sudoku game events:
 * - tripod:join, tripod:leave
 * - tripod:toggleBorder, tripod:updateBorders
 * - tripod:validate, tripod:sync
 */
@Injectable()
export class TripodHandlers extends BaseHandler {
  constructor(private readonly gameService: GameService) {
    // Context will be set by GameGateway after initialization
    super('TripodHandlers', null as unknown as GatewayContext);
  }

  /**
   * Convert tripodDots 2D boolean grid to array of dot coordinates.
   */
  private convertTripodDotsToArray(
    tripodDots: boolean[][],
  ): Array<{ row: number; col: number }> {
    const dots: Array<{ row: number; col: number }> = [];
    if (!tripodDots) return dots;
    for (let row = 0; row < tripodDots.length; row++) {
      for (let col = 0; col < tripodDots[row].length; col++) {
        if (tripodDots[row][col]) {
          dots.push({ row, col });
        }
      }
    }
    return dots;
  }

  /**
   * Handle joining a tripod game room.
   */
  async handleTripodJoin(
    client: TypedSocket,
    data: { gameId: string },
  ): Promise<{ event: string; data: { gameId: string } }> {
    const { gameId } = data;

    // Join tripod game room
    void client.join(`tripod:${gameId}`);

    this.logger.log(`Client ${client.id} joined tripod game ${gameId}`);

    // Try to send current state
    try {
      const game = await this.gameService.getGame(gameId);
      if (game.gameMode === 'tripod' && game.tripodData) {
        // Extract givens from initial cells (non-zero cells from puzzle start)
        const givens: Array<{ row: number; col: number; value: number }> = [];
        const initialCells = game.tripodData.initialCells;
        if (initialCells) {
          initialCells.forEach((row, rowIndex) => {
            row.forEach((value, colIndex) => {
              if (value !== 0) {
                givens.push({ row: rowIndex, col: colIndex, value });
              }
            });
          });
        }

        client.emit('tripod:state', {
          gameId,
          currentState: game.currentState,
          borders: {
            horizontal: game.tripodData.horizontalBorders,
            vertical: game.tripodData.verticalBorders,
          },
          dots: this.convertTripodDotsToArray(game.tripodData.tripodDots),
          status: game.status,
          timeElapsed: game.timeElapsed,
          givens, // Include original puzzle givens
        });
      }
    } catch (error) {
      this.logger.error(`Failed to send tripod state for ${gameId}:`, error);
    }

    return { event: 'tripod:joined', data: { gameId } };
  }

  /**
   * Handle leaving a tripod game.
   */
  handleTripodLeave(
    client: TypedSocket,
    data: { gameId: string },
  ): { event: string; data: { gameId: string } } {
    const { gameId } = data;

    void client.leave(`tripod:${gameId}`);
    this.logger.log(`Client ${client.id} left tripod game ${gameId}`);

    return { event: 'tripod:left', data: { gameId } };
  }

  /**
   * Handle toggling a single border segment.
   * Throttled to 100ms to reduce excessive updates during rapid placements
   */
  @Throttle(100)
  async handleTripodToggleBorder(
    client: TypedSocket,
    data: {
      gameId: string;
      type: 'horizontal' | 'vertical';
      row: number;
      col: number;
    },
  ): Promise<{ event: string; data: unknown }> {
    try {
      const { gameId, type, row, col } = data;
      const userId = client.data.userId;

      // Rate limit check
      if (!this.checkRateLimit(client.id, 'tripod:toggleBorder')) {
        return {
          event: 'tripod:error',
          data: { message: 'Rate limit exceeded' },
        };
      }

      // Authorization check: verify user owns the game
      const game = await this.gameService.getGame(gameId);
      if (game.userId !== userId) {
        return { event: 'tripod:error', data: { message: 'Unauthorized' } };
      }

      // Toggle the border
      const updatedGame = await this.gameService.toggleTripodBorder(
        gameId,
        type,
        row,
        col,
      );

      // Get new border value from tripodData
      const tripodData = updatedGame.tripodData;
      const newValue =
        type === 'horizontal'
          ? (tripodData?.horizontalBorders[row]?.[col] ?? false)
          : (tripodData?.verticalBorders[row]?.[col] ?? false);

      // Broadcast to all clients in the tripod game room
      this.server.to(`tripod:${gameId}`).emit('tripod:borderUpdated', {
        gameId,
        type,
        row,
        col,
        value: newValue,
      });

      // Also broadcast to user's room for cross-tab sync
      this.server
        .to(`user:${client.data.userId}`)
        .emit('tripod:borderUpdated', {
          gameId,
          type,
          row,
          col,
          value: newValue,
        });

      return {
        event: 'tripod:toggleBorder:success',
        data: { type, row, col, value: newValue },
      };
    } catch (error) {
      this.logger.error('Tripod toggle border error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { event: 'tripod:error', data: { message } };
    }
  }

  /**
   * Handle updating all borders at once.
   */
  async handleTripodUpdateBorders(
    client: TypedSocket,
    data: {
      gameId: string;
      borders: {
        horizontal: boolean[][];
        vertical: boolean[][];
      };
    },
  ): Promise<{ event: string; data: unknown }> {
    try {
      const { gameId, borders } = data;

      // Update all borders
      const updatedGame = await this.gameService.updateTripodBorders(
        gameId,
        borders,
      );

      // Broadcast full state to all clients
      if (updatedGame.tripodData) {
        this.server.to(`tripod:${gameId}`).emit('tripod:state', {
          gameId,
          currentState: updatedGame.currentState,
          borders: {
            horizontal: updatedGame.tripodData.horizontalBorders,
            vertical: updatedGame.tripodData.verticalBorders,
          },
          dots: this.convertTripodDotsToArray(
            updatedGame.tripodData.tripodDots,
          ),
          status: updatedGame.status,
          timeElapsed: updatedGame.timeElapsed,
        });
      }

      return { event: 'tripod:updateBorders:success', data: { gameId } };
    } catch (error) {
      this.logger.error('Tripod update borders error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { event: 'tripod:error', data: { message } };
    }
  }

  /**
   * Handle validating a tripod game solution.
   * Throttled to 500ms to prevent excessive validation calls
   * Combined with client-side debouncing (300ms), this achieves 80%+ reduction
   */
  @Throttle(500)
  async handleTripodValidate(
    client: TypedSocket,
    data: { gameId: string },
  ): Promise<{ event: string; data: unknown }> {
    try {
      const { gameId } = data;

      const result = await this.gameService.validateTripodGame(gameId);

      // Send validation result to all clients in game room
      this.server.to(`tripod:${gameId}`).emit('tripod:validated', {
        gameId,
        isValid: result.isValid,
        errors: result.errors,
        borderErrors: (
          result as {
            borderErrors?: Array<{ type: string; row: number; col: number }>;
          }
        ).borderErrors,
      });

      // If valid, emit completion event
      if (result.isValid) {
        const game = await this.gameService.getGame(gameId);
        this.server.to(`tripod:${gameId}`).emit('tripod:completed', {
          gameId,
          timeElapsed: game.timeElapsed,
          isValid: true,
        });
      }

      return { event: 'tripod:validate:success', data: result };
    } catch (error) {
      this.logger.error('Tripod validate error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { event: 'tripod:error', data: { message } };
    }
  }

  /**
   * Handle syncing tripod game state.
   */
  async handleTripodSync(
    client: TypedSocket,
    data: { gameId: string },
  ): Promise<{ event: string; data: unknown }> {
    try {
      const { gameId } = data;

      const game = await this.gameService.getGame(gameId);

      if (game.gameMode !== 'tripod' || !game.tripodData) {
        return {
          event: 'tripod:error',
          data: { message: 'Not a tripod game' },
        };
      }

      // Extract givens from initial cells (non-zero cells from puzzle start)
      const givens: Array<{ row: number; col: number; value: number }> = [];
      const initialCells = game.tripodData.initialCells;
      if (initialCells) {
        initialCells.forEach((row, rowIndex) => {
          row.forEach((value, colIndex) => {
            if (value !== 0) {
              givens.push({ row: rowIndex, col: colIndex, value });
            }
          });
        });
      }

      return {
        event: 'tripod:state',
        data: {
          gameId,
          currentState: game.currentState,
          borders: {
            horizontal: game.tripodData.horizontalBorders,
            vertical: game.tripodData.verticalBorders,
          },
          dots: this.convertTripodDotsToArray(game.tripodData.tripodDots),
          status: game.status,
          timeElapsed: game.timeElapsed,
          givens, // Include original puzzle givens
        },
      };
    } catch (error) {
      this.logger.error('Tripod sync error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { event: 'tripod:error', data: { message } };
    }
  }
}
