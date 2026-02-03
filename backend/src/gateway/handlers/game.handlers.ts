import { Injectable } from '@nestjs/common';
import { GameService } from '../../game/services/game.service';
import {
  MutationService,
  MUTATION_INTERVAL_MS,
} from '../../game/services/mutation.service';
import { GameStatus, GameMode } from '../../database/entities';
import type { TypedSocket } from '../types/socket.types';
import { BaseHandler, GatewayContext } from './base.handler';

/**
 * Handles single-player game events:
 * - game:join, game:leave
 * - game:move, game:undo
 * - game:hint, game:hint:apply
 * - game:sync, game:updateTime
 * - Mutation timer management
 */
@Injectable()
export class GameHandlers extends BaseHandler {
  constructor(
    private readonly gameService: GameService,
    private readonly mutationService: MutationService,
  ) {
    // Context will be set by GameGateway after initialization
    super('GameHandlers', null as unknown as GatewayContext);
  }

  /**
   * Handle joining a game room.
   */
  async handleJoinGame(
    client: TypedSocket,
    data: { gameId: string },
  ): Promise<{ event: string; data: { gameId: string } }> {
    const { gameId } = data;
    const userId = client.data.userId;

    // Join game-specific room
    void client.join(`game:${gameId}`);

    this.logger.log(`Client ${client.id} joined game ${gameId}`);

    // Check if game is mutating mode and active - start mutation timer
    try {
      const game = await this.gameService.getGame(gameId);
      if (
        (game.gameMode as GameMode) === GameMode.MUTATING &&
        game.status === GameStatus.ACTIVE
      ) {
        // Only start timer if not already running (prevents reset on multiple tabs)
        if (!this.mutationService.hasActiveTimer(gameId)) {
          this.startMutationTimerForGame(gameId, userId);
        } else {
          this.logger.debug(
            `Mutation timer already running for game ${gameId}, skipping restart`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Failed to check game mode for ${gameId}:`, error);
    }

    return { event: 'game:joined', data: { gameId } };
  }

  /**
   * Handle leaving a game - cleanup mutation timer if needed.
   */
  handleLeaveGame(
    client: TypedSocket,
    data: { gameId: string },
  ): { event: string; data: { gameId: string } } {
    const { gameId } = data;
    const userId = client.data.userId;

    // Leave game-specific room
    void client.leave(`game:${gameId}`);

    // Check if user has other active sockets connected
    // Only stop mutation timer if this was the last connection
    // Note: Current socket is still in room, so check > 1
    const userRoom = this.server.sockets.adapter.rooms.get(`user:${userId}`);
    const hasOtherConnections = userRoom && userRoom.size > 1;

    if (!hasOtherConnections) {
      // Stop mutation timer for this game only if no other connections
      this.stopMutationTimerForGame(gameId, userId);
      this.logger.log(
        `Client ${client.id} left game ${gameId}, stopped mutation timer`,
      );
    } else {
      this.logger.log(
        `Client ${client.id} left game ${gameId}, but user still has ${userRoom?.size ? userRoom.size - 1 : 0} other connections`,
      );
    }

    return { event: 'game:left', data: { gameId } };
  }

  /**
   * Handle making a move in the game.
   */
  async handleMove(
    client: TypedSocket,
    data: {
      gameId: string;
      row: number;
      col: number;
      value: number;
      timeElapsed?: number;
    },
  ): Promise<{ event: string; data: unknown }> {
    try {
      const { gameId, row, col, value, timeElapsed } = data;

      // Make move in game service (with timeElapsed for accurate completion time)
      const updatedGame = await this.gameService.makeMove(
        gameId,
        row,
        col,
        value,
        timeElapsed,
      );

      // Broadcast to all clients in the user's room (all tabs/devices)
      this.server.to(`user:${client.data.userId}`).emit('game:state', {
        gameId,
        currentState: updatedGame.currentState,
        moveHistory: updatedGame.moveHistory,
        mistakes: updatedGame.mistakes,
        status: updatedGame.status,
        timeElapsed: updatedGame.timeElapsed,
      });

      // Stop mutation timer if game is completed or failed
      if (
        (updatedGame.gameMode as GameMode) === GameMode.MUTATING &&
        (updatedGame.status === GameStatus.COMPLETED ||
          updatedGame.status === GameStatus.FAILED)
      ) {
        this.stopMutationTimerForGame(gameId, client.data.userId);
      }

      return { event: 'game:move:success', data: updatedGame };
    } catch (error) {
      this.logger.error('Move error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { event: 'game:error', data: { message } };
    }
  }

  /**
   * Handle undoing the last move.
   */
  async handleUndo(
    client: TypedSocket,
    data: { gameId: string },
  ): Promise<{ event: string; data: unknown }> {
    try {
      const { gameId } = data;

      const updatedGame = await this.gameService.undoMove(gameId);

      // Broadcast to all user's clients
      this.server.to(`user:${client.data.userId}`).emit('game:state', {
        gameId,
        currentState: updatedGame.currentState,
        moveHistory: updatedGame.moveHistory,
        mistakes: updatedGame.mistakes,
        status: updatedGame.status,
      });

      return { event: 'game:undo:success', data: updatedGame };
    } catch (error) {
      this.logger.error('Undo error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { event: 'game:error', data: { message } };
    }
  }

  /**
   * Handle requesting a hint.
   */
  async handleHint(
    client: TypedSocket,
    data: { gameId: string },
  ): Promise<{ event: string; data: unknown }> {
    try {
      const { gameId } = data;

      const hint = await this.gameService.useHint(gameId);

      // Send hint only to requesting client
      return { event: 'game:hint:success', data: hint };
    } catch (error) {
      this.logger.error('Hint error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { event: 'game:error', data: { message } };
    }
  }

  /**
   * Handle applying a hint to the game.
   */
  async handleHintApply(
    client: TypedSocket,
    data: {
      gameId: string;
      row: number;
      col: number;
      value: number;
      timeElapsed?: number;
    },
  ): Promise<{ event: string; data: unknown }> {
    try {
      const { gameId, row, col, value, timeElapsed } = data;

      const updatedGame = await this.gameService.applyHint(
        gameId,
        row,
        col,
        value,
        timeElapsed,
      );

      // Broadcast to all clients in the user's room
      this.server.to(`user:${client.data.userId}`).emit('game:state', {
        gameId,
        currentState: updatedGame.currentState,
        moveHistory: updatedGame.moveHistory,
        mistakes: updatedGame.mistakes,
        hintedCells: updatedGame.hintedCells,
        status: updatedGame.status,
        timeElapsed: updatedGame.timeElapsed,
      });

      return { event: 'game:hint:apply:success', data: updatedGame };
    } catch (error) {
      this.logger.error('Hint apply error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { event: 'game:error', data: { message } };
    }
  }

  /**
   * Handle syncing game state.
   */
  async handleSync(
    client: TypedSocket,
    data: { gameId: string },
  ): Promise<{ event: string; data: unknown }> {
    try {
      const { gameId } = data;

      const game = await this.gameService.getGame(gameId);

      return {
        event: 'game:state',
        data: {
          gameId,
          currentState: game.currentState,
          moveHistory: game.moveHistory,
          hintsUsed: game.hintsUsed,
          mistakes: game.mistakes,
          status: game.status,
          timeElapsed: game.timeElapsed,
        },
      };
    } catch (error) {
      this.logger.error('Sync error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { event: 'game:error', data: { message } };
    }
  }

  /**
   * Handle updating game time.
   */
  async handleUpdateTime(
    client: TypedSocket,
    data: { gameId: string; timeElapsed: number },
  ): Promise<{ event: string; data?: unknown }> {
    try {
      const { gameId, timeElapsed } = data;

      await this.gameService.updateTime(gameId, timeElapsed);

      // Broadcast time update to all user's clients
      this.server.to(`user:${client.data.userId}`).emit('game:timeUpdated', {
        gameId,
        timeElapsed,
      });

      return { event: 'game:time:success' };
    } catch (error) {
      this.logger.error('Update time error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { event: 'game:error', data: { message } };
    }
  }

  /**
   * Start mutation timer for a mutating game.
   */
  startMutationTimerForGame(gameId: string, userId: string): void {
    // Set up callback for mutation events
    this.mutationService.startMutationTimer(gameId, async () => {
      await this.handleMutationTick(gameId, userId);
    });

    // Calculate next mutation time and notify user
    const nextMutationAt = Date.now() + MUTATION_INTERVAL_MS;
    this.server.to(`user:${userId}`).emit('mutation:started', {
      gameId,
      intervalMs: MUTATION_INTERVAL_MS,
      nextMutationAt,
    });

    this.logger.log(`Mutation timer started for game ${gameId}`);
  }

  /**
   * Handle mutation tick - select target and apply mutation.
   */
  private async handleMutationTick(
    gameId: string,
    userId: string,
  ): Promise<void> {
    try {
      // Select a random cell to mutate
      const target = await this.mutationService.selectMutationTarget(gameId);

      if (target) {
        // Apply the mutation
        const mutationEvent = await this.mutationService.applyMutation(
          gameId,
          target.row,
          target.col,
        );

        if (mutationEvent) {
          // Reset failure count on success
          this.mutationService.resetMutationFailures(gameId);

          // Emit mutation:occurred to user
          this.server.to(`user:${userId}`).emit('mutation:occurred', {
            gameId: mutationEvent.gameId,
            row: mutationEvent.row,
            col: mutationEvent.col,
            previousValue: mutationEvent.previousValue,
            mutationNumber: mutationEvent.mutationNumber,
            nextMutationIn: mutationEvent.nextMutationIn,
          });

          this.logger.log(
            `Mutation #${mutationEvent.mutationNumber} occurred in game ${gameId} at (${target.row}, ${target.col})`,
          );
        } else {
          // applyMutation returned null (game completed/failed/empty cell)
          // Record failure - may auto-stop timer
          this.mutationService.recordMutationFailure(gameId);
        }
      } else {
        // No eligible cells - record failure
        // recordMutationFailure will auto-stop after MAX_CONSECUTIVE_FAILURES
        const stopped = this.mutationService.recordMutationFailure(gameId);
        if (!stopped) {
          this.logger.log(
            `No eligible cells for mutation in game ${gameId}, skipping`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Mutation tick error for game ${gameId}:`, error);
      // Record failure on error too
      this.mutationService.recordMutationFailure(gameId);
    }
  }

  /**
   * Stop mutation timer for a game.
   */
  stopMutationTimerForGame(gameId: string, userId?: string): void {
    this.mutationService.stopMutationTimer(gameId);

    if (userId) {
      this.server.to(`user:${userId}`).emit('mutation:stopped', { gameId });
    }

    this.logger.log(`Mutation timer stopped for game ${gameId}`);
  }

  /**
   * Handle user disconnect - Clean up mutation timers.
   */
  async handleDisconnect(
    userId: string,
    hasOtherConnections: boolean,
  ): Promise<void> {
    if (hasOtherConnections) {
      this.logger.debug(
        `User ${userId} still has other active connections, not stopping mutation timers`,
      );
      return;
    }

    try {
      // Find active mutating games for this user
      const activeGames = await this.gameService.findActiveGamesByUser(userId);
      for (const game of activeGames) {
        if ((game.gameMode as GameMode) === GameMode.MUTATING) {
          this.stopMutationTimerForGame(game.id);
          this.logger.debug(
            `Stopped mutation timer for game ${game.id} on user disconnect`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to cleanup mutation timers on disconnect:`,
        error,
      );
    }
  }
}
