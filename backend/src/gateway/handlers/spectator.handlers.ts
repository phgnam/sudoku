import { Injectable } from '@nestjs/common';
import { MatchManagerService } from '../../match/services';
import type { TypedSocket } from '../types/socket.types';
import { BaseHandler, GatewayContext } from './base.handler';

/**
 * Handles spectator events:
 * - match:spectate, match:spectateLeave
 * - match:activeMatches
 * - Rematch request/decline
 */
@Injectable()
export class SpectatorHandlers extends BaseHandler {
  constructor(private readonly matchManager: MatchManagerService) {
    // Context will be set by GameGateway after initialization
    super('SpectatorHandlers', null as unknown as GatewayContext);
  }

  /**
   * Handle joining as spectator.
   */
  handleSpectate(client: TypedSocket, data: { matchId: string }) {
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
      void client.join(`match:${matchId}:spectators`);

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

  /**
   * Handle leaving as spectator.
   */
  handleSpectateLeave(client: TypedSocket, data: { matchId: string }) {
    const userId = client.data.userId;
    if (!userId) {
      return { event: 'match:error', data: { message: 'Not authenticated' } };
    }

    const { matchId } = data;
    this.matchManager.removeSpectator(matchId, userId);
    void client.leave(`match:${matchId}:spectators`);

    const match = this.matchManager.getMatch(matchId);
    if (match) {
      this.server.to(`match:${matchId}`).emit('match:spectatorCount', {
        count: match.spectatorCount,
      });
    }

    this.logger.log(`Spectator left match ${matchId}`);
    return { event: 'match:spectateLeave:success', data: {} };
  }

  /**
   * Handle getting list of active matches.
   */
  handleGetActiveMatches(client: TypedSocket) {
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

  /**
   * Handle rematch request.
   */
  async handleRematchRequest(client: TypedSocket, data: { matchId: string }) {
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
    const newMatchId = await this.matchManager.createRematch(
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

  /**
   * Handle rematch decline.
   */
  handleRematchDecline(client: TypedSocket, data: { matchId: string }) {
    const userId = client.data.userId;
    if (!userId) {
      return { event: 'match:error', data: { message: 'Not authenticated' } };
    }

    const match = this.matchManager.getMatch(data.matchId);
    if (match) {
      // Authorization check: only participants can decline
      if (userId !== match.hostId && userId !== match.guestId) {
        return {
          event: 'match:error',
          data: { message: 'Not authorized: only participants can decline rematch' },
        };
      }

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
}
