import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MatchManagerService,
  MatchService,
  EloService,
} from '../../match/services';
import { Difficulty, User } from '../../database/entities';
import type { TypedSocket, MatchPlayer } from '../types/socket.types';
import { BaseHandler, GatewayContext } from './base.handler';

// Match timeout in milliseconds (20 minutes)
const MATCH_DURATION_MS = 20 * 60 * 1000;

/**
 * Handles competitive match events:
 * - match:create, match:join, match:leave
 * - match:ready, match:unready
 * - match:move, match:submit, match:sync
 * - match:surrender
 * - match:rematchRequest, match:rematchDecline
 * - Match timeout handling
 * - ELO calculations
 */
@Injectable()
export class MatchHandlers extends BaseHandler {
  constructor(
    private readonly matchManager: MatchManagerService,
    private readonly matchService: MatchService,
    private readonly eloService: EloService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    // Context will be set by GameGateway after initialization
    super('MatchHandlers', null as unknown as GatewayContext);
  }

  /**
   * Handle creating a new match.
   */
  async handleMatchCreate(
    client: TypedSocket,
    data: { difficulty: string },
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

      const matchId = await this.matchManager.createMatch(
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

  /**
   * Handle joining an existing match.
   */
  handleMatchJoin(
    client: TypedSocket,
    data: { matchId: string },
  ): { event: string; data: unknown } {
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

  /**
   * Handle leaving a match.
   */
  handleMatchLeave(
    client: TypedSocket,
    data: { matchId: string },
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

  /**
   * Handle player surrendering.
   */
  async handleMatchSurrender(
    client: TypedSocket,
    data: { matchId: string },
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

  /**
   * Handle player ready.
   */
  async handleMatchReady(
    client: TypedSocket,
    data: { matchId: string },
  ): Promise<{ event: string; data: unknown }> {
    // Rate limit check
    if (!this.checkRateLimit(client.id, 'match:ready')) {
      client.emit('match:error', {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please wait before trying again.',
      });
      return {
        event: 'match:error',
        data: { message: 'Rate limited', code: 'RATE_LIMITED' },
      };
    }

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
          void this.handleMatchTimeout(matchId);
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

  /**
   * Handle player unready.
   */
  handleMatchUnready(
    client: TypedSocket,
    data: { matchId: string },
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

  /**
   * Handle making a move in match.
   */
  handleMatchMove(
    client: TypedSocket,
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
      const opponentSocketId =
        match.hostId === userId ? match.guestSocketId : match.hostSocketId;
      if (opponentSocketId) {
        this.server.to(opponentSocketId).emit('match:opponentMoved', { row, col });
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

  /**
   * Handle submitting match solution.
   */
  async handleMatchSubmit(
    client: TypedSocket,
    data: { matchId: string },
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

  /**
   * Handle syncing match state.
   */
  handleMatchSync(
    client: TypedSocket,
    data: { matchId: string },
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
   * Handle 20-minute match timeout.
   */
  async handleMatchTimeout(matchId: string): Promise<void> {
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
   * Handle disconnect timeout - forfeit the match.
   */
  async handleMatchDisconnectTimeout(
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
        matchResult,
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

  /**
   * Calculate and apply ELO rating changes after match ends.
   * Returns rating changes for host and guest.
   */
  async applyEloChanges(
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

  /**
   * Handle user disconnect - Leave match or start reconnection timer.
   */
  handleDisconnect(userId: string): void {
    const match = this.matchManager.findMatchByPlayer(userId);
    if (!match) {
      // No match found for user, nothing to do
      return;
    }

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
        void this.handleMatchDisconnectTimeout(userId, match.id);
      }, 30000);

      this.disconnectTimers.set(userId, timer);

      // Notify opponent about disconnection
      const opponentSocketId =
        match.hostId === userId ? match.guestSocketId : match.hostSocketId;
      if (opponentSocketId) {
        this.server.to(opponentSocketId).emit('match:playerLeft', {
          reason:
            'Opponent disconnected. Waiting 30 seconds for reconnection...',
        });
      }
    }
  }
}
