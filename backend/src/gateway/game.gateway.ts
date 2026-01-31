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
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameService } from '../game/services/game.service';
import {
  MatchManagerService,
  MatchService,
  EloService,
  MatchmakingService,
} from '../match/services';
import { Logger, OnModuleDestroy } from '@nestjs/common';
import './types/socket.types'; // Import to activate module augmentation
import type {
  JwtPayload,
  TypedSocket,
  TypedServer,
  MatchPlayer,
} from './types/socket.types';
import { Difficulty, User } from '../database/entities';

// Match timeout in milliseconds (20 minutes)
const MATCH_DURATION_MS = 20 * 60 * 1000;

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy {
  @WebSocketServer()
  server: TypedServer;

  private logger = new Logger('GameGateway');

  // Track reconnection grace periods (playerId -> timeout)
  private disconnectTimers = new Map<string, NodeJS.Timeout>();

  // Track player names (userId -> name)
  private playerNames = new Map<string, string>();

  // Matchmaking interval handle
  private matchmakingInterval: NodeJS.Timeout | null = null;

  constructor(
    private jwtService: JwtService,
    private gameService: GameService,
    private matchManager: MatchManagerService,
    private matchService: MatchService,
    private eloService: EloService,
    private matchmakingService: MatchmakingService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    // Start matchmaking interval
    this.startMatchmakingLoop();
  }

  onModuleDestroy(): void {
    // Clean up matchmaking interval to prevent memory leaks
    if (this.matchmakingInterval) {
      clearInterval(this.matchmakingInterval);
      this.matchmakingInterval = null;
      this.logger.log('Matchmaking interval cleared');
    }
  }

  private startMatchmakingLoop(): void {
    // Run every 2 seconds
    this.matchmakingInterval = setInterval(() => {
      this.processMatchmaking();
    }, 2000);
  }

  private async processMatchmaking(): Promise<void> {
    try {
      // Expand search radius for waiting players
      this.matchmakingService.expandSearchRadii();

      // Find and process matches
      const matches = this.matchmakingService.findMatches();

      for (const match of matches) {
        await this.createMatchFromQueue(match);
      }

      // Send status updates to queued players
      const queuedPlayers = this.matchmakingService.getAllQueuedPlayers();
      for (const player of queuedPlayers) {
        const status = this.matchmakingService.getQueueStatus(player.playerId);
        this.server.to(player.socketId).emit('matchmaking:status', status);
      }
    } catch (error) {
      this.logger.error('Matchmaking error:', error);
    }
  }

  private async createMatchFromQueue(matchedPair: {
    player1: { playerId: string; socketId: string; playerName: string; rating: number };
    player2: { playerId: string; socketId: string; playerName: string; rating: number };
    difficulty: string;
  }): Promise<void> {
    const { player1, player2, difficulty } = matchedPair;

    try {
      // Create the match (requires socketId as second param)
      const matchId = this.matchManager.createMatch(
        player1.playerId,
        player1.socketId,
        difficulty as Difficulty,
      );

      const liveMatch = this.matchManager.getMatch(matchId);
      if (!liveMatch) {
        throw new Error('Failed to create match');
      }

      // Add player1 to match room
      const socket1 = this.server.sockets.sockets.get(player1.socketId);
      if (socket1) {
        await socket1.join(matchId);
      }

      // Join player2 to match (joinMatch throws on error, returns LiveMatch)
      this.matchManager.joinMatch(matchId, player2.playerId, player2.socketId);

      // Add player2 to match room
      const socket2 = this.server.sockets.sockets.get(player2.socketId);
      if (socket2) {
        await socket2.join(matchId);
      }

      // Store player names
      this.playerNames.set(player1.playerId, player1.playerName);
      this.playerNames.set(player2.playerId, player2.playerName);

      // Set both players ready
      this.matchManager.setReady(matchId, player1.playerId, true);
      this.matchManager.setReady(matchId, player2.playerId, true);

      // Get puzzle for this difficulty
      const puzzle = await this.matchService.getRandomPuzzle(difficulty as Difficulty);
      if (!puzzle) {
        throw new Error('No puzzle available for this difficulty');
      }

      // Start the match with puzzle
      this.matchManager.startMatch(
        matchId,
        puzzle.id,
        puzzle.puzzle,
        puzzle.solution,
      );

      const updatedMatch = this.matchManager.getMatch(matchId);
      if (!updatedMatch) return;

      // Create player objects
      const hostPlayer: MatchPlayer = { id: player1.playerId, name: player1.playerName };
      const guestPlayer: MatchPlayer = { id: player2.playerId, name: player2.playerName };

      // Notify player1 of match found and start
      this.server.to(player1.socketId).emit('matchmaking:found', {
        matchId,
        opponent: {
          opponentId: player2.playerId,
          opponentName: player2.playerName,
          opponentRating: player2.rating,
        },
      });

      // Send start event to player1
      this.server.to(player1.socketId).emit('match:start', {
        puzzle: puzzle.puzzle,
        startTime: updatedMatch.startTime!,
        maxDuration: MATCH_DURATION_MS,
        opponent: guestPlayer,
      });

      // Notify player2 of match found and start
      this.server.to(player2.socketId).emit('matchmaking:found', {
        matchId,
        opponent: {
          opponentId: player1.playerId,
          opponentName: player1.playerName,
          opponentRating: player1.rating,
        },
      });

      // Send start event to player2
      this.server.to(player2.socketId).emit('match:start', {
        puzzle: puzzle.puzzle,
        startTime: updatedMatch.startTime!,
        maxDuration: MATCH_DURATION_MS,
        opponent: hostPlayer,
      });

      this.logger.log(
        `Quick match started: ${player1.playerName} vs ${player2.playerName} on ${difficulty}`,
      );
    } catch (error) {
      this.logger.error('Failed to create match from queue:', error);

      // Notify players of failure
      this.server.to(player1.socketId).emit('matchmaking:cancelled', {
        reason: 'Failed to create match. Please try again.',
      });
      this.server.to(player2.socketId).emit('matchmaking:cancelled', {
        reason: 'Failed to create match. Please try again.',
      });
    }
  }

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

      // Store player name from handshake if provided
      const playerName = client.handshake.auth.name as string | undefined;
      if (playerName) {
        this.playerNames.set(userId, playerName);
      }

      // Cancel any pending disconnect timer (reconnection)
      const existingTimer = this.disconnectTimers.get(userId);
      if (existingTimer) {
        clearTimeout(existingTimer);
        this.disconnectTimers.delete(userId);
        this.logger.log(
          `Player ${userId} reconnected, cancelling disconnect timer`,
        );

        // Update socket ID in match manager
        this.matchManager.updateSocketId(userId, client.id);

        // Rejoin match room if in a match
        const match = this.matchManager.findMatchByPlayer(userId);
        if (match && match.status === 'playing') {
          void client.join(`match:${match.id}`);
          this.logger.log(`Player ${userId} rejoined match room ${match.id}`);

          // Send full match state for client to restore
          const isHost = match.hostId === userId;
          const opponentId = isHost ? match.guestId : match.hostId;
          const opponentName = opponentId
            ? this.playerNames.get(opponentId) || 'Opponent'
            : 'Opponent';
          const myState = isHost ? match.hostState : match.guestState;
          const opponentFilledCells = this.matchManager.getOpponentFilledCells(
            match.id,
            userId,
          );

          client.emit('match:rejoin', {
            matchId: match.id,
            status: match.status,
            isHost,
            difficulty: match.difficulty,
            opponent: { id: opponentId || '', name: opponentName },
            puzzle: match.puzzle || [],
            myState: myState || [],
            startTime: match.startTime || Date.now(),
            maxDuration: MATCH_DURATION_MS,
            opponentFilledCells,
            opponentFilledCount: opponentFilledCells.length,
            spectatorCount: match.spectators.size,
          });
          this.logger.log(
            `Sent match:rejoin state to player ${userId} for match ${match.id}`,
          );

          // Notify opponent that player has reconnected
          if (opponentId) {
            const opponentSocketId = isHost
              ? match.guestSocketId
              : match.hostSocketId;
            if (opponentSocketId) {
              this.server.to(opponentSocketId).emit('match:playerReconnected', {
                playerId: userId,
                playerName: this.playerNames.get(userId) || 'Opponent',
              });
              this.logger.log(
                `Notified opponent ${opponentId} that player ${userId} reconnected`,
              );
            }
          }
        }
      }

      this.logger.log(`Client connected: ${client.id}, userId: ${userId}`);
    } catch (error) {
      this.logger.error('Connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: TypedSocket): void {
    const userId = client.data.userId;
    this.logger.log(
      `Client disconnected: ${client.id}, userId: ${userId ?? 'unknown'}`,
    );

    if (!userId) return;

    // Remove from matchmaking queue if queued
    if (this.matchmakingService.isInQueue(userId)) {
      this.matchmakingService.removeFromQueue(userId);
      this.logger.log(`Removed disconnected player ${userId} from matchmaking queue`);
    }

    // Check if player is in a match
    const match = this.matchManager.findMatchByPlayer(userId);
    if (!match) return;

    if (match.status === 'waiting' || match.status === 'ready') {
      // In lobby: immediately remove player and notify
      this.matchManager.removePlayer(userId);

      // Notify other player
      this.server.to(`match:${match.id}`).emit('match:playerLeft', {
        reason: 'Player disconnected',
      });

      // If host left waiting room, cancel the match
      if (match.hostId === userId) {
        this.matchManager.endMatch(match.id, null, 'cancelled');
        this.server.to(`match:${match.id}`).emit('match:cancelled', {
          reason: 'Host left the room',
        });
      }
    } else if (match.status === 'playing') {
      // In game: start 30-second grace period for reconnection
      this.logger.log(
        `Starting 30s reconnection grace period for ${userId} in match ${match.id}`,
      );

      const timer = setTimeout(() => {
        this.handleMatchDisconnectTimeout(userId, match.id);
      }, 30000);

      this.disconnectTimers.set(userId, timer);

      // Notify opponent about disconnection
      const opponentId = match.hostId === userId ? match.guestId : match.hostId;
      const opponentSocketId =
        match.hostId === userId ? match.guestSocketId : match.hostSocketId;
      if (opponentId && opponentSocketId) {
        this.server.to(opponentSocketId).emit('match:playerLeft', {
          reason:
            'Opponent disconnected. Waiting 30 seconds for reconnection...',
        });
      }
    }
  }

  /**
   * Handle disconnect timeout - forfeit the match
   */
  private async handleMatchDisconnectTimeout(
    userId: string,
    matchId: string,
  ): Promise<void> {
    this.disconnectTimers.delete(userId);

    const match = this.matchManager.getMatch(matchId);
    if (!match || match.status !== 'playing') {
      this.logger.log(
        `handleMatchDisconnectTimeout: Match ${matchId} not found or not playing (status: ${match?.status}), skipping`,
      );
      return;
    }

    // Log detailed info for debugging
    this.logger.log(
      `handleMatchDisconnectTimeout: Processing disconnect for userId=${userId}, matchId=${matchId}`,
    );
    this.logger.log(
      `handleMatchDisconnectTimeout: hostId=${match.hostId}, guestId=${match.guestId}`,
    );

    // Determine winner (the one who didn't disconnect)
    // userId is the player who disconnected, so the OTHER player wins
    const disconnectedIsHost = match.hostId === userId;
    const winnerId = disconnectedIsHost ? match.guestId : match.hostId;
    const matchResult = disconnectedIsHost ? 'guest_win' : 'host_win';

    this.logger.log(
      `handleMatchDisconnectTimeout: disconnectedIsHost=${disconnectedIsHost}, winnerId=${winnerId}, matchResult=${matchResult}`,
    );

    this.matchManager.endMatch(matchId, winnerId, 'finished');

    // Calculate and apply ELO changes
    let eloChanges = {
      hostChange: 0,
      hostNewRating: 1000,
      guestChange: 0,
      guestNewRating: 1000,
    };
    if (match.guestId) {
      eloChanges = await this.applyEloChanges(
        match.hostId,
        match.guestId,
        matchResult as 'host_win' | 'guest_win',
      );
    }

    // Calculate result for each player
    const hostResult = matchResult === 'host_win' ? 'win' : 'lose';
    const guestResult = matchResult === 'guest_win' ? 'win' : 'lose';

    this.logger.log(
      `handleMatchDisconnectTimeout: Sending results - host(${match.hostId})=${hostResult}, guest(${match.guestId})=${guestResult}`,
    );

    // Notify host
    this.server.to(match.hostSocketId).emit('match:ended', {
      result: hostResult,
      winnerId: winnerId ?? undefined,
      reason: 'Opponent disconnected (timeout)',
      ratingChange: eloChanges.hostChange,
      newRating: eloChanges.hostNewRating,
      opponentRatingChange: eloChanges.guestChange,
    });

    // Notify guest
    if (match.guestSocketId) {
      this.server.to(match.guestSocketId).emit('match:ended', {
        result: guestResult,
        winnerId: winnerId ?? undefined,
        reason: 'Opponent disconnected (timeout)',
        ratingChange: eloChanges.guestChange,
        newRating: eloChanges.guestNewRating,
        opponentRatingChange: eloChanges.hostChange,
      });
    }

    // Notify spectators about match end
    if (match.spectatorCount > 0) {
      this.server
        .to(`match:${matchId}:spectators`)
        .emit('match:spectatorEnded', {
          matchId,
          winnerId: winnerId ?? undefined,
          result: matchResult,
          reason: 'Opponent disconnected (timeout)',
          hostName: this.playerNames.get(match.hostId) || 'Host',
          guestName: match.guestId
            ? this.playerNames.get(match.guestId) || 'Guest'
            : null,
        });
    }

    // Persist match to database
    const endedMatch = this.matchManager.getMatch(matchId);
    if (endedMatch) {
      void this.matchService.persistMatch(endedMatch);
    }

    this.logger.log(
      `Match ${matchId} ended due to disconnect timeout. Winner: ${winnerId}`,
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
    @MessageBody()
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

  // ===== MATCH (COMPETITIVE) HANDLERS =====

  @SubscribeMessage('match:create')
  async handleMatchCreate(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: { difficulty: string },
  ): Promise<{ event: string; data: unknown }> {
    try {
      const userId = client.data.userId;
      const difficulty = data.difficulty as Difficulty;

      // Check if player is already in a match
      const existingMatch = this.matchManager.findMatchByPlayer(userId);
      if (existingMatch) {
        return {
          event: 'match:error',
          data: {
            message: 'You are already in a match',
            code: 'ALREADY_IN_MATCH',
          },
        };
      }

      const matchId = this.matchManager.createMatch(
        userId,
        client.id,
        difficulty,
      );

      // Join match room
      void client.join(`match:${matchId}`);

      this.logger.log(`Match ${matchId} created by ${userId}`);

      client.emit('match:created', { matchId, difficulty: data.difficulty });

      return { event: 'match:create:success', data: { matchId } };
    } catch (error) {
      this.logger.error('Match create error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { event: 'match:error', data: { message } };
    }
  }

  @SubscribeMessage('match:join')
  async handleMatchJoin(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: { matchId: string },
  ): Promise<{ event: string; data: unknown }> {
    try {
      const userId = client.data.userId;
      const { matchId } = data;

      // Check if player is already in a match
      const existingMatch = this.matchManager.findMatchByPlayer(userId);
      if (existingMatch) {
        return {
          event: 'match:error',
          data: {
            message: 'You are already in a match',
            code: 'ALREADY_IN_MATCH',
          },
        };
      }

      const match = this.matchManager.joinMatch(matchId, userId, client.id);

      // Join match room
      void client.join(`match:${matchId}`);

      // Get player names
      const hostName = this.playerNames.get(match.hostId) || 'Player 1';
      const guestName = this.playerNames.get(userId) || 'Player 2';

      const hostPlayer: MatchPlayer = { id: match.hostId, name: hostName };
      const guestPlayer: MatchPlayer = { id: userId, name: guestName };

      // Notify guest about joining
      client.emit('match:joined', {
        matchId,
        opponent: hostPlayer,
      });

      // Notify host that guest joined
      this.server.to(match.hostSocketId).emit('match:playerJoined', {
        opponent: guestPlayer,
      });

      this.logger.log(`Player ${userId} joined match ${matchId}`);

      return { event: 'match:join:success', data: { matchId } };
    } catch (error) {
      this.logger.error('Match join error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { event: 'match:error', data: { message } };
    }
  }

  @SubscribeMessage('match:leave')
  handleMatchLeave(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: { matchId: string },
  ): { event: string; data: unknown } {
    try {
      const userId = client.data.userId;
      const { matchId } = data;

      const match = this.matchManager.getMatch(matchId);
      if (!match) {
        return { event: 'match:error', data: { message: 'Match not found' } };
      }

      // Leave socket room
      void client.leave(`match:${matchId}`);

      // Remove player from match
      this.matchManager.removePlayer(userId);

      // Notify other player
      this.server.to(`match:${matchId}`).emit('match:playerLeft', {
        reason: 'Player left the room',
      });

      // If host left, cancel match
      if (match.hostId === userId) {
        this.matchManager.endMatch(matchId, null, 'cancelled');
        this.server.to(`match:${matchId}`).emit('match:cancelled', {
          reason: 'Host left the room',
        });
      }

      this.logger.log(`Player ${userId} left match ${matchId}`);

      return { event: 'match:leave:success', data: { matchId } };
    } catch (error) {
      this.logger.error('Match leave error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { event: 'match:error', data: { message } };
    }
  }

  @SubscribeMessage('match:surrender')
  async handleMatchSurrender(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: { matchId: string },
  ): Promise<{ event: string; data: unknown }> {
    try {
      const surrenderId = client.data.userId;
      const { matchId } = data;

      const match = this.matchManager.getMatch(matchId);
      if (!match) {
        return { event: 'match:error', data: { message: 'Match not found' } };
      }

      // Only allow surrender during active play
      if (match.status !== 'playing') {
        return {
          event: 'match:error',
          data: { message: 'Can only surrender during active match' },
        };
      }

      // Determine winner (opponent of surrendering player)
      // When match is 'playing', guestId is guaranteed to exist
      const winnerId =
        match.hostId === surrenderId ? match.guestId! : match.hostId;
      const matchResult: 'host_win' | 'guest_win' =
        match.hostId === winnerId ? 'host_win' : 'guest_win';

      // End match with surrender reason
      this.matchManager.endMatch(matchId, winnerId, 'finished');

      // Calculate and apply ELO changes
      let eloChanges = {
        hostChange: 0,
        hostNewRating: 1000,
        guestChange: 0,
        guestNewRating: 1000,
      };
      if (match.guestId) {
        eloChanges = await this.applyEloChanges(
          match.hostId,
          match.guestId,
          matchResult,
        );
      }

      // Notify surrendering player (loser)
      client.emit('match:ended', {
        result: 'lose',
        winnerId,
        reason: 'You surrendered',
        ratingChange:
          match.hostId === surrenderId
            ? eloChanges.hostChange
            : eloChanges.guestChange,
        newRating:
          match.hostId === surrenderId
            ? eloChanges.hostNewRating
            : eloChanges.guestNewRating,
        opponentRatingChange:
          match.hostId === surrenderId
            ? eloChanges.guestChange
            : eloChanges.hostChange,
      });

      // Notify winner
      const winnerSocketId =
        match.hostId === winnerId ? match.hostSocketId : match.guestSocketId;
      if (winnerSocketId) {
        this.server.to(winnerSocketId).emit('match:ended', {
          result: 'win',
          winnerId,
          reason: 'Opponent surrendered',
          ratingChange:
            match.hostId === winnerId
              ? eloChanges.hostChange
              : eloChanges.guestChange,
          newRating:
            match.hostId === winnerId
              ? eloChanges.hostNewRating
              : eloChanges.guestNewRating,
          opponentRatingChange:
            match.hostId === winnerId
              ? eloChanges.guestChange
              : eloChanges.hostChange,
        });
      }

      // Notify spectators
      if (match.spectatorCount > 0) {
        this.server
          .to(`match:${matchId}:spectators`)
          .emit('match:spectatorEnded', {
            matchId,
            winnerId,
            result: matchResult,
            reason: 'Opponent surrendered',
            hostName: this.playerNames.get(match.hostId) || 'Host',
            guestName: match.guestId
              ? (this.playerNames.get(match.guestId) ?? 'Guest')
              : null,
          });
      }

      // Persist match
      const endedMatch = this.matchManager.getMatch(matchId);
      if (endedMatch) {
        await this.matchService.persistMatch(endedMatch);
      }

      // Leave socket room
      void client.leave(`match:${matchId}`);

      this.logger.log(
        `Player ${surrenderId} surrendered match ${matchId}. Winner: ${winnerId}`,
      );

      return { event: 'match:surrender:success', data: { matchId } };
    } catch (error) {
      this.logger.error('Match surrender error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { event: 'match:error', data: { message } };
    }
  }

  @SubscribeMessage('match:ready')
  async handleMatchReady(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: { matchId: string },
  ): Promise<{ event: string; data: unknown }> {
    try {
      const userId = client.data.userId;
      const { matchId } = data;

      const { allReady, match } = this.matchManager.setReady(
        matchId,
        userId,
        true,
      );

      // Notify other player about ready status
      this.server
        .to(`match:${matchId}`)
        .emit('match:playerReady', { playerId: userId, ready: true });

      // If both players are ready, start the match
      if (allReady && match.guestId) {
        // Get a random puzzle based on difficulty
        const puzzle = await this.matchService.getRandomPuzzle(
          match.difficulty,
        );

        if (!puzzle) {
          return {
            event: 'match:error',
            data: { message: 'No puzzle available for this difficulty' },
          };
        }

        // Start the match
        this.matchManager.startMatch(
          matchId,
          puzzle.id,
          puzzle.puzzle,
          puzzle.solution,
        );

        // Get player names
        const hostName = this.playerNames.get(match.hostId) || 'Player 1';
        const guestName = this.playerNames.get(match.guestId) || 'Player 2';

        const hostPlayer: MatchPlayer = { id: match.hostId, name: hostName };
        const guestPlayer: MatchPlayer = { id: match.guestId, name: guestName };

        // Send start event to host
        this.server.to(match.hostSocketId).emit('match:start', {
          puzzle: puzzle.puzzle,
          startTime: Date.now(),
          maxDuration: MATCH_DURATION_MS,
          opponent: guestPlayer,
        });

        // Send start event to guest
        if (match.guestSocketId) {
          this.server.to(match.guestSocketId).emit('match:start', {
            puzzle: puzzle.puzzle,
            startTime: Date.now(),
            maxDuration: MATCH_DURATION_MS,
            opponent: hostPlayer,
          });
        }

        // Set 20-minute timeout
        const timer = setTimeout(() => {
          this.handleMatchTimeout(matchId);
        }, MATCH_DURATION_MS);

        this.matchManager.setMatchTimer(matchId, timer);

        this.logger.log(`Match ${matchId} started with puzzle ${puzzle.id}`);
      }

      return { event: 'match:ready:success', data: { matchId, allReady } };
    } catch (error) {
      this.logger.error('Match ready error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { event: 'match:error', data: { message } };
    }
  }

  @SubscribeMessage('match:unready')
  handleMatchUnready(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: { matchId: string },
  ): { event: string; data: unknown } {
    try {
      const userId = client.data.userId;
      const { matchId } = data;

      this.matchManager.setReady(matchId, userId, false);

      // Notify other player
      this.server
        .to(`match:${matchId}`)
        .emit('match:playerReady', { playerId: userId, ready: false });

      return { event: 'match:unready:success', data: { matchId } };
    } catch (error) {
      this.logger.error('Match unready error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { event: 'match:error', data: { message } };
    }
  }

  @SubscribeMessage('match:move')
  handleMatchMove(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody()
    data: { matchId: string; row: number; col: number; value: number },
  ): { event: string; data: unknown } {
    try {
      const userId = client.data.userId;
      const { matchId, row, col, value } = data;

      const match = this.matchManager.getMatch(matchId);
      if (!match || match.status !== 'playing') {
        return {
          event: 'match:error',
          data: { message: 'Match not in progress' },
        };
      }

      // Record the move
      this.matchManager.recordMove(matchId, userId, row, col, value);

      // Notify opponent about cell filled (position only, no value)
      const opponentId = match.hostId === userId ? match.guestId : match.hostId;
      if (opponentId) {
        this.server.to(opponentId).emit('match:opponentMoved', { row, col });
      }

      // Broadcast full move data to spectators
      const updatedMatch = this.matchManager.getMatch(matchId);
      if (updatedMatch && updatedMatch.spectatorCount > 0) {
        this.server
          .to(`match:${matchId}:spectators`)
          .emit('match:spectatorUpdate', {
            playerId: userId,
            playerRole: userId === match.hostId ? 'host' : 'guest',
            row,
            col,
            value,
            hostState: updatedMatch.hostState,
            guestState: updatedMatch.guestState,
          });
      }

      return { event: 'match:move:success', data: { row, col } };
    } catch (error) {
      this.logger.error('Match move error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { event: 'match:error', data: { message } };
    }
  }

  @SubscribeMessage('match:submit')
  async handleMatchSubmit(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: { matchId: string },
  ): Promise<{ event: string; data: unknown }> {
    try {
      const userId = client.data.userId;
      const { matchId } = data;

      const match = this.matchManager.getMatch(matchId);
      if (!match || match.status !== 'playing') {
        return {
          event: 'match:error',
          data: { message: 'Match not in progress' },
        };
      }

      // Check completion
      const result = this.matchManager.checkCompletion(matchId, userId);

      if (result.complete && result.correct) {
        // Player wins!
        this.matchManager.endMatch(matchId, userId, 'finished');

        // Determine match result for ELO
        const matchResult = userId === match.hostId ? 'host_win' : 'guest_win';

        // Calculate and apply ELO changes
        let eloChanges = {
          hostChange: 0,
          hostNewRating: 1000,
          guestChange: 0,
          guestNewRating: 1000,
        };
        if (match.guestId) {
          eloChanges = await this.applyEloChanges(
            match.hostId,
            match.guestId,
            matchResult,
          );
        }

        // Notify both players with ELO changes
        this.server.to(match.hostSocketId).emit('match:ended', {
          result: match.hostId === userId ? 'win' : 'lose',
          winnerId: userId,
          reason: 'Completed correctly first!',
          ratingChange: eloChanges.hostChange,
          newRating: eloChanges.hostNewRating,
          opponentRatingChange: eloChanges.guestChange,
        });

        if (match.guestSocketId) {
          this.server.to(match.guestSocketId).emit('match:ended', {
            result: match.guestId === userId ? 'win' : 'lose',
            winnerId: userId,
            reason: 'Opponent completed correctly first!',
            ratingChange: eloChanges.guestChange,
            newRating: eloChanges.guestNewRating,
            opponentRatingChange: eloChanges.hostChange,
          });
        }

        // Notify spectators about match end
        if (match.spectatorCount > 0) {
          const matchResult =
            userId === match.hostId ? 'host_win' : 'guest_win';
          this.server
            .to(`match:${matchId}:spectators`)
            .emit('match:spectatorEnded', {
              matchId,
              winnerId: userId,
              result: matchResult,
              reason: 'Completed correctly first!',
              hostName: this.playerNames.get(match.hostId) || 'Host',
              guestName: match.guestId
                ? this.playerNames.get(match.guestId) || 'Guest'
                : null,
            });
        }

        // Persist match
        const endedMatch = this.matchManager.getMatch(matchId);
        if (endedMatch) {
          await this.matchService.persistMatch(endedMatch);
        }

        this.logger.log(`Match ${matchId} won by ${userId}`);
      } else {
        // Submission was incorrect - emit rejection event
        client.emit('match:submitRejected', { reason: 'incorrect' });
        return {
          event: 'match:submit:rejected',
          data: { reason: 'incorrect' },
        };
      }

      return { event: 'match:submit:success', data: { won: true } };
    } catch (error) {
      this.logger.error('Match submit error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { event: 'match:error', data: { message } };
    }
  }

  @SubscribeMessage('match:sync')
  handleMatchSync(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: { matchId: string },
  ): { event: string; data: unknown } {
    try {
      const userId = client.data.userId;
      const { matchId } = data;

      const match = this.matchManager.getMatch(matchId);
      if (!match) {
        return { event: 'match:error', data: { message: 'Match not found' } };
      }

      // Get opponent's filled cells
      const opponentCells = this.matchManager.getOpponentFilledCells(
        matchId,
        userId,
      );

      // Calculate remaining time
      const remaining = match.startTime
        ? MATCH_DURATION_MS - (Date.now() - match.startTime)
        : MATCH_DURATION_MS;

      // Send time sync
      client.emit('match:timeSync', {
        serverTime: Date.now(),
        remaining: Math.max(0, remaining),
      });

      // Send opponent progress
      client.emit('match:opponentProgress', {
        filledCells: opponentCells,
        filledCount: opponentCells.length,
        totalEmpty:
          81 - (match.puzzle?.flat().filter((v) => v !== 0).length || 0),
      });

      return { event: 'match:sync:success', data: { matchId } };
    } catch (error) {
      this.logger.error('Match sync error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { event: 'match:error', data: { message } };
    }
  }

  /**
   * Handle 20-minute match timeout
   */
  private async handleMatchTimeout(matchId: string): Promise<void> {
    const match = this.matchManager.getMatch(matchId);
    if (!match || match.status !== 'playing') return;

    this.logger.log(`Match ${matchId} timeout - determining result`);

    // Count filled cells to determine winner or draw
    const hostFilledCount = match.hostFilledCells.size;
    const guestFilledCount = match.guestFilledCells.size;

    let winnerId: string | null = null;
    let matchResult: 'host_win' | 'guest_win' | 'draw' = 'draw';
    let reason = '20-minute timeout - Draw!';

    // If someone has more filled cells, they win
    if (hostFilledCount > guestFilledCount) {
      winnerId = match.hostId;
      matchResult = 'host_win';
      reason = `20-minute timeout - Winner by progress (${hostFilledCount} vs ${guestFilledCount} cells)!`;
    } else if (guestFilledCount > hostFilledCount) {
      winnerId = match.guestId;
      matchResult = 'guest_win';
      reason = `20-minute timeout - Winner by progress (${guestFilledCount} vs ${hostFilledCount} cells)!`;
    }

    this.matchManager.endMatch(matchId, winnerId, 'finished');

    // Calculate and apply ELO changes
    let eloChanges = {
      hostChange: 0,
      hostNewRating: 1000,
      guestChange: 0,
      guestNewRating: 1000,
    };
    if (match.guestId) {
      eloChanges = await this.applyEloChanges(
        match.hostId,
        match.guestId,
        matchResult,
      );
    }

    // Notify host
    this.server.to(match.hostSocketId).emit('match:ended', {
      result:
        matchResult === 'host_win'
          ? 'win'
          : matchResult === 'guest_win'
            ? 'lose'
            : 'draw',
      winnerId: winnerId ?? undefined,
      reason: reason,
      ratingChange: eloChanges.hostChange,
      newRating: eloChanges.hostNewRating,
      opponentRatingChange: eloChanges.guestChange,
    });

    // Notify guest
    if (match.guestSocketId) {
      this.server.to(match.guestSocketId).emit('match:ended', {
        result:
          matchResult === 'guest_win'
            ? 'win'
            : matchResult === 'host_win'
              ? 'lose'
              : 'draw',
        winnerId: winnerId ?? undefined,
        reason: reason,
        ratingChange: eloChanges.guestChange,
        newRating: eloChanges.guestNewRating,
        opponentRatingChange: eloChanges.hostChange,
      });
    }

    // Notify spectators about match end
    if (match.spectatorCount > 0) {
      this.server
        .to(`match:${matchId}:spectators`)
        .emit('match:spectatorEnded', {
          matchId,
          winnerId: winnerId ?? undefined,
          result: matchResult,
          reason: reason,
          hostName: this.playerNames.get(match.hostId) || 'Host',
          guestName: match.guestId
            ? this.playerNames.get(match.guestId) || 'Guest'
            : null,
        });
    }

    // Persist match
    void this.matchService.persistMatch(match);

    this.logger.log(
      `Match ${matchId} ended due to timeout. Host: ${hostFilledCount} cells, Guest: ${guestFilledCount} cells`,
    );
  }

  /**
   * Helper: Get player display name
   */
  getPlayerName(userId: string): string {
    return this.playerNames.get(userId) || `Player ${userId.substring(0, 6)}`;
  }

  /**
   * Calculate and apply ELO rating changes after match ends
   * Returns rating changes for host and guest
   */
  private async applyEloChanges(
    hostId: string,
    guestId: string,
    matchResult: 'host_win' | 'guest_win' | 'draw',
  ): Promise<{
    hostChange: number;
    hostNewRating: number;
    guestChange: number;
    guestNewRating: number;
  }> {
    try {
      // Fetch current ratings
      const [host, guest] = await Promise.all([
        this.userRepository.findOne({ where: { id: hostId } }),
        this.userRepository.findOne({ where: { id: guestId } }),
      ]);

      if (!host || !guest) {
        this.logger.error('Could not find users for ELO calculation');
        return {
          hostChange: 0,
          hostNewRating: 1000,
          guestChange: 0,
          guestNewRating: 1000,
        };
      }

      // Calculate ELO changes
      const eloResults = this.eloService.calculateMatchRatings(
        host.rating,
        host.competitiveGames,
        guest.rating,
        guest.competitiveGames,
        matchResult,
      );

      // Update host
      await this.userRepository.update(hostId, {
        rating: eloResults.host.newRating,
        competitiveGames: host.competitiveGames + 1,
        ...(matchResult === 'host_win' && {
          competitiveWins: host.competitiveWins + 1,
        }),
        ...(matchResult === 'draw' && {
          competitiveDraws: host.competitiveDraws + 1,
        }),
      });

      // Update guest
      await this.userRepository.update(guestId, {
        rating: eloResults.guest.newRating,
        competitiveGames: guest.competitiveGames + 1,
        ...(matchResult === 'guest_win' && {
          competitiveWins: guest.competitiveWins + 1,
        }),
        ...(matchResult === 'draw' && {
          competitiveDraws: guest.competitiveDraws + 1,
        }),
      });

      this.logger.log(
        `ELO updated: ${host.username || hostId} ${host.rating} -> ${eloResults.host.newRating} (${eloResults.host.change >= 0 ? '+' : ''}${eloResults.host.change}), ` +
          `${guest.username || guestId} ${guest.rating} -> ${eloResults.guest.newRating} (${eloResults.guest.change >= 0 ? '+' : ''}${eloResults.guest.change})`,
      );

      return {
        hostChange: eloResults.host.change,
        hostNewRating: eloResults.host.newRating,
        guestChange: eloResults.guest.change,
        guestNewRating: eloResults.guest.newRating,
      };
    } catch (error) {
      this.logger.error('Error calculating ELO:', error);
      return {
        hostChange: 0,
        hostNewRating: 1000,
        guestChange: 0,
        guestNewRating: 1000,
      };
    }
  }

  // ============ Spectator Handlers ============

  @SubscribeMessage('match:spectate')
  handleSpectate(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: { matchId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) {
      return { event: 'match:error', data: { message: 'Not authenticated' } };
    }

    const { matchId } = data;
    const name = this.playerNames.get(userId) || 'Spectator';

    try {
      const match = this.matchManager.getMatch(matchId);
      if (!match) {
        return { event: 'match:error', data: { message: 'Match not found' } };
      }

      this.matchManager.addSpectator(matchId, userId, client.id, name);
      client.join(`match:${matchId}:spectators`);

      // Notify players about new spectator count
      this.server.to(`match:${matchId}`).emit('match:spectatorCount', {
        count: match.spectatorCount,
      });

      // Send current match state to spectator
      client.emit('match:spectateState', {
        matchId,
        status: match.status,
        hostId: match.hostId,
        hostName: this.playerNames.get(match.hostId) || 'Host',
        guestId: match.guestId,
        guestName: match.guestId
          ? this.playerNames.get(match.guestId) || 'Guest'
          : null,
        hostState: match.hostState,
        guestState: match.guestState,
        puzzle: match.puzzle,
        difficulty: match.difficulty,
        startTime: match.startTime,
        spectatorCount: match.spectatorCount,
      });

      this.logger.log(`Spectator ${name} joined match ${matchId}`);
      return { event: 'match:spectate:success', data: { matchId } };
    } catch (error) {
      return {
        event: 'match:error',
        data: {
          message:
            error instanceof Error
              ? error.message
              : 'Failed to join as spectator',
        },
      };
    }
  }

  @SubscribeMessage('match:spectateLeave')
  handleSpectateLeave(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: { matchId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) {
      return { event: 'match:error', data: { message: 'Not authenticated' } };
    }

    const { matchId } = data;
    this.matchManager.removeSpectator(matchId, userId);
    client.leave(`match:${matchId}:spectators`);

    const match = this.matchManager.getMatch(matchId);
    if (match) {
      this.server.to(`match:${matchId}`).emit('match:spectatorCount', {
        count: match.spectatorCount,
      });
    }

    this.logger.log(`Spectator left match ${matchId}`);
    return { event: 'match:spectateLeave:success', data: {} };
  }

  @SubscribeMessage('match:activeMatches')
  handleGetActiveMatches(@ConnectedSocket() client: TypedSocket) {
    const userId = client.data.userId;
    if (!userId) {
      return { event: 'match:error', data: { message: 'Not authenticated' } };
    }

    const matches = this.matchManager.getActiveMatches();

    // Add player names to matches
    const matchesWithNames = matches.map((match) => ({
      ...match,
      hostName: this.playerNames.get(match.hostId) || 'Unknown',
      guestName: match.guestId
        ? this.playerNames.get(match.guestId) || 'Unknown'
        : null,
    }));

    return {
      event: 'match:activeMatches:response',
      data: { matches: matchesWithNames },
    };
  }

  // ==================== REMATCH HANDLERS ====================

  @SubscribeMessage('match:rematchRequest')
  handleRematchRequest(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: { matchId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) {
      return { event: 'match:error', data: { message: 'Not authenticated' } };
    }

    const { matchId } = data;
    const match = this.matchManager.getMatch(matchId);

    if (!match) {
      return { event: 'match:error', data: { message: 'Match not found' } };
    }

    const result = this.matchManager.requestRematch(matchId, userId);

    if (!result.success) {
      return { event: 'match:error', data: { message: result.error } };
    }

    if (result.waitingFor) {
      // Notify other player about rematch request
      const otherSocketId =
        userId === match.hostId ? match.guestSocketId : match.hostSocketId;
      if (otherSocketId) {
        this.server.to(otherSocketId).emit('match:rematchRequested', {
          requestedBy: userId,
          requestedByName: this.playerNames.get(userId) || 'Opponent',
        });
      }

      // Set 30s timeout
      const timer = setTimeout(() => {
        this.matchManager.cancelRematchRequest(matchId);
        this.server.to(`match:${matchId}`).emit('match:rematchExpired', {});
        this.logger.log(`Rematch request expired for match ${matchId}`);
      }, 30000);
      this.matchManager.setRematchTimer(matchId, timer);

      client.emit('match:rematchPending', { waitingFor: result.waitingFor });
      this.logger.log(`Rematch requested for match ${matchId} by ${userId}`);
      return {
        event: 'match:rematchRequest:pending',
        data: { waitingFor: result.waitingFor },
      };
    }

    // Both agreed - create new match
    const hostSocketId = match.hostSocketId;
    const guestSocketId = match.guestSocketId!;
    const newMatchId = this.matchManager.createRematch(
      matchId,
      hostSocketId,
      guestSocketId,
    );
    const newMatch = this.matchManager.getMatch(newMatchId)!;

    // Notify both players
    this.server.to(`match:${matchId}`).emit('match:rematchCreated', {
      newMatchId,
      hostId: newMatch.hostId,
      guestId: newMatch.guestId!,
      hostName: this.playerNames.get(newMatch.hostId) || 'Host',
      guestName: this.playerNames.get(newMatch.guestId!) || 'Guest',
      difficulty: newMatch.difficulty,
    });

    this.logger.log(`Rematch created: ${newMatchId} from ${matchId}`);
    return { event: 'match:rematchRequest:success', data: { newMatchId } };
  }

  @SubscribeMessage('match:rematchDecline')
  handleRematchDecline(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: { matchId: string },
  ) {
    const userId = client.data.userId;
    if (!userId) {
      return { event: 'match:error', data: { message: 'Not authenticated' } };
    }

    const match = this.matchManager.getMatch(data.matchId);
    if (match) {
      this.matchManager.cancelRematchRequest(data.matchId);
      this.server.to(`match:${data.matchId}`).emit('match:rematchDeclined', {
        declinedBy: userId,
      });
      this.logger.log(
        `Rematch declined for match ${data.matchId} by ${userId}`,
      );
    }
    return { event: 'match:rematchDecline:success', data: {} };
  }

  // ==================== MATCHMAKING ====================

  @SubscribeMessage('matchmaking:join')
  async handleMatchmakingJoin(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: { difficulty: string },
  ) {
    const userId = client.data.userId;
    if (!userId) {
      return { event: 'matchmaking:error', data: { message: 'Not authenticated' } };
    }

    const difficulty = data.difficulty || 'normal';

    // Get player rating from database
    let rating = 1000;
    let playerName = this.playerNames.get(userId) || 'Player';

    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (user) {
        rating = user.rating || 1000;
        playerName = user.username || user.email?.split('@')[0] || playerName;
      }
    } catch (error) {
      this.logger.warn(`Failed to get user rating: ${error}`);
    }

    // Add to matchmaking queue
    const status = this.matchmakingService.addToQueue({
      playerId: userId,
      socketId: client.id,
      playerName,
      rating,
      difficulty,
    });

    this.logger.log(
      `Player ${playerName} (${rating}) joined ${difficulty} queue - position: ${status.position}`,
    );

    return {
      event: 'matchmaking:joined',
      data: status,
    };
  }

  @SubscribeMessage('matchmaking:cancel')
  handleMatchmakingCancel(@ConnectedSocket() client: TypedSocket) {
    const userId = client.data.userId;
    if (!userId) {
      return { event: 'matchmaking:error', data: { message: 'Not authenticated' } };
    }

    const removed = this.matchmakingService.removeFromQueue(userId);

    if (removed) {
      this.logger.log(`Player ${userId} cancelled matchmaking`);
    }

    return {
      event: 'matchmaking:cancelled',
      data: { reason: 'Cancelled by user' },
    };
  }
}
