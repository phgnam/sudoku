import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { GameService } from '../game/services/game.service';
import { Logger } from '@nestjs/common';
import './types/socket.types'; // Import to activate module augmentation
import type {
  JwtPayload,
  TypedSocket,
  TypedServer,
} from './types/socket.types';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: TypedServer;

  private logger = new Logger('GameGateway');

  constructor(
    private jwtService: JwtService,
    private gameService: GameService,
  ) {}

  handleConnection(client: TypedSocket): void {
    try {
      // Get token from auth header or handshake
      const token =
        (client.handshake.auth.token as string | undefined) ||
        client.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn('Client connected without token');
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = this.jwtService.verify<JwtPayload>(token);
      const userId = payload.sub;

      // Store userId in socket data
      client.data = {
        userId,
        isAnonymous: payload.isAnonymous ?? false,
      };

      // Join user's private room for broadcasts
      void client.join(userId);

      this.logger.log(`Client connected: ${client.id}, userId: ${userId}`);
    } catch (error) {
      this.logger.error('Connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: TypedSocket): void {
    this.logger.log(
      `Client disconnected: ${client.id}, userId: ${client.data.userId ?? 'unknown'}`,
    );
  }

  @SubscribeMessage('game:join')
  handleJoinGame(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: { gameId: string },
  ): { event: string; data: { gameId: string } } {
    const { gameId } = data;

    // Join game-specific room
    void client.join(`game:${gameId}`);

    this.logger.log(`Client ${client.id} joined game ${gameId}`);

    return { event: 'game:joined', data: { gameId } };
  }

  @SubscribeMessage('game:move')
  async handleMove(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody()
    data: { gameId: string; row: number; col: number; value: number; timeElapsed?: number },
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
      this.server.to(client.data.userId).emit('game:state', {
        gameId,
        currentState: updatedGame.currentState,
        moveHistory: updatedGame.moveHistory,
        mistakes: updatedGame.mistakes,
        status: updatedGame.status,
        timeElapsed: updatedGame.timeElapsed,
      });

      return { event: 'game:move:success', data: updatedGame };
    } catch (error) {
      this.logger.error('Move error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { event: 'game:error', data: { message } };
    }
  }

  @SubscribeMessage('game:undo')
  async handleUndo(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: { gameId: string },
  ): Promise<{ event: string; data: unknown }> {
    try {
      const { gameId } = data;

      const updatedGame = await this.gameService.undoMove(gameId);

      // Broadcast to all user's clients
      this.server.to(client.data.userId).emit('game:state', {
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

  @SubscribeMessage('game:hint')
  async handleHint(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: { gameId: string },
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

  @SubscribeMessage('game:hint:apply')
  async handleHintApply(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: { gameId: string; row: number; col: number; value: number; timeElapsed?: number },
  ): Promise<{ event: string; data: unknown }> {
    try {
      const { gameId, row, col, value, timeElapsed } = data;

      const updatedGame = await this.gameService.applyHint(gameId, row, col, value, timeElapsed);

      // Broadcast to all clients in the user's room
      this.server.to(client.data.userId).emit('game:state', {
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

  @SubscribeMessage('game:sync')
  async handleSync(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: { gameId: string },
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

  @SubscribeMessage('game:updateTime')
  async handleUpdateTime(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: { gameId: string; timeElapsed: number },
  ): Promise<{ event: string; data?: unknown }> {
    try {
      const { gameId, timeElapsed } = data;

      await this.gameService.updateTime(gameId, timeElapsed);

      // Broadcast time update to all user's clients
      this.server.to(client.data.userId).emit('game:timeUpdated', {
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
}
