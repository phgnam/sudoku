import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MatchManagerService,
  MatchService,
  MatchmakingService,
} from '../../match/services';
import { Difficulty, User } from '../../database/entities';
import type { TypedSocket, MatchPlayer } from '../types/socket.types';
import { BaseHandler, GatewayContext } from './base.handler';

// Match timeout in milliseconds (20 minutes)
const MATCH_DURATION_MS = 20 * 60 * 1000;

/**
 * Handles matchmaking queue events:
 * - matchmaking:join, matchmaking:cancel
 * - Matchmaking loop and match creation from queue
 */
@Injectable()
export class MatchmakingHandlers extends BaseHandler {
  constructor(
    private readonly matchManager: MatchManagerService,
    private readonly matchService: MatchService,
    private readonly matchmakingService: MatchmakingService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    // Context will be set by GameGateway after initialization
    super('MatchmakingHandlers', null as unknown as GatewayContext);
  }

  /**
   * Start the matchmaking loop.
   */
  startMatchmakingLoop(): void {
    // Run every 2 seconds
    this.context.matchmakingInterval = setInterval(() => {
      void this.processMatchmaking();
    }, 2000);
  }

  /**
   * Process matchmaking queue - find matches and send status updates.
   */
  async processMatchmaking(): Promise<void> {
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

  /**
   * Create a match from matched queue players.
   */
  async createMatchFromQueue(matchedPair: {
    player1: {
      playerId: string;
      socketId: string;
      playerName: string;
      rating: number;
    };
    player2: {
      playerId: string;
      socketId: string;
      playerName: string;
      rating: number;
    };
    difficulty: string;
  }): Promise<void> {
    const { player1, player2, difficulty } = matchedPair;

    try {
      // Create the match (requires socketId as second param)
      const matchId = await this.matchManager.createMatch(
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
      const puzzle = await this.matchService.getRandomPuzzle(
        difficulty as Difficulty,
      );
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
      const hostPlayer: MatchPlayer = {
        id: player1.playerId,
        name: player1.playerName,
      };
      const guestPlayer: MatchPlayer = {
        id: player2.playerId,
        name: player2.playerName,
      };

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

  /**
   * Handle joining the matchmaking queue.
   */
  async handleMatchmakingJoin(
    client: TypedSocket,
    data: { difficulty: string },
  ) {
    const userId = client.data.userId;
    if (!userId) {
      return {
        event: 'matchmaking:error',
        data: { message: 'Not authenticated' },
      };
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

  /**
   * Handle cancelling matchmaking.
   */
  handleMatchmakingCancel(client: TypedSocket) {
    const userId = client.data.userId;
    if (!userId) {
      return {
        event: 'matchmaking:error',
        data: { message: 'Not authenticated' },
      };
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

  /**
   * Handle user disconnect - remove from queue.
   */
  handleDisconnect(userId: string): void {
    if (this.matchmakingService.isInQueue(userId)) {
      this.matchmakingService.removeFromQueue(userId);
      this.logger.log(
        `Removed disconnected player ${userId} from matchmaking queue`,
      );
    }
  }
}
