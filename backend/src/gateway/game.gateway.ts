import { Logger, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { MatchManagerService } from '../match/services/match-manager.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RateLimitEntry } from './types/rate-limit.types';
import type {
  TypedServer,
  TypedSocket,
  JwtPayload,
} from './types/socket.types';

// Import handlers
import {
  GameHandlers,
  MatchHandlers,
  MatchmakingHandlers,
  SpectatorHandlers,
  TripodHandlers,
  GatewayContext,
} from './handlers';

// Match timeout in milliseconds (20 minutes)
const MATCH_DURATION_MS = 20 * 60 * 1000;

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: 'game',
})
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class GameGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  private readonly logger = new Logger(GameGateway.name);

  // Shared state maps
  private readonly playerNames = new Map<string, string>();
  private readonly disconnectTimers = new Map<string, NodeJS.Timeout>();
  private readonly rateLimits = new Map<string, Map<string, RateLimitEntry>>();
  private readonly tokenExpiryTimers = new Map<
    string,
    { warningTimer?: NodeJS.Timeout; expiryTimer?: NodeJS.Timeout }
  >();

  @WebSocketServer()
  server: TypedServer;

  constructor(
    private readonly jwtService: JwtService,
    private readonly matchManager: MatchManagerService,
    // Injected handlers
    private readonly gameHandlers: GameHandlers,
    private readonly matchHandlers: MatchHandlers,
    private readonly matchmakingHandlers: MatchmakingHandlers,
    private readonly spectatorHandlers: SpectatorHandlers,
    private readonly tripodHandlers: TripodHandlers,
  ) {}

  afterInit() {
    this.logger.log('GameGateway initialized');

    // Create shared context
    const context: GatewayContext = {
      server: this.server,
      logger: this.logger,
      playerNames: this.playerNames,
      disconnectTimers: this.disconnectTimers,
      rateLimits: this.rateLimits,
      tokenExpiryTimers: this.tokenExpiryTimers,
      matchmakingInterval: null, // Initialized in handler
    };

    // Initialize handlers with context
    this.gameHandlers.setContext(context);
    this.matchHandlers.setContext(context);
    this.matchmakingHandlers.setContext(context);
    this.spectatorHandlers.setContext(context);
    this.tripodHandlers.setContext(context);

    // Start matchmaking loop
    this.matchmakingHandlers.startMatchmakingLoop();
  }

  /**
   * Handle new WebSocket connection
   */
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
      const payload = this.jwtService.verify<JwtPayload & { exp?: number }>(
        token,
      );
      const userId = payload.sub;

      // Store userId in socket data
      client.data = {
        userId,
        isAnonymous: payload.isAnonymous ?? false,
      };

      // Store auth state with token expiry info
      if (payload.exp) {
        client.data.authState = {
          userId,
          tokenExp: payload.exp * 1000, // Convert to ms
          refreshAt: payload.exp * 1000 - 5 * 60 * 1000, // 5 min before expiry
        };

        // Schedule token expiry warning and disconnect
        this.scheduleTokenExpiryCheck(client);
      }

      // Join user's private room for broadcasts
      void client.join(`user:${userId}`);

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

  /**
   * Handle client disconnect
   */
  async handleDisconnect(client: TypedSocket): Promise<void> {
    const userId = client.data.userId;
    this.logger.log(
      `Client disconnected: ${client.id}, userId: ${userId ?? 'unknown'}`,
    );

    // Clean up rate limits and token expiry timers for this socket
    this.cleanupRateLimits(client.id);
    this.cleanupTokenExpiryTimers(client.id);

    if (!userId) return;

    // Check if user has other active sockets connected
    const userRoom = this.server.sockets.adapter.rooms.get(`user:${userId}`);
    // Prior to this disconnect, the socket was in the room.
    // NestJS handleDisconnect is called AFTER the socket leaves??
    // Actually typically onGatewayDisconnect happens after.
    // In the original code: "Note: On 'disconnect' event, the socket has already left all rooms"
    // So userRoom.size is remaining connections.
    const hasOtherConnections = userRoom && userRoom.size > 0;

    // Delegate cleanup to handlers
    this.matchmakingHandlers.handleDisconnect(userId);
    await this.gameHandlers.handleDisconnect(userId, !!hasOtherConnections);
    this.matchHandlers.handleDisconnect(userId);

    this.logger.debug(`Disconnect cleanup complete for user ${userId}`);
  }

  // ====================== UTILITIES ======================

  /**
   * Clean up rate limits for a disconnected socket
   */
  private cleanupRateLimits(socketId: string): void {
    for (const [, socketLimits] of this.rateLimits) {
      socketLimits.delete(socketId);
    }
  }

  /**
   * Schedule token expiry check and warning
   */
  private scheduleTokenExpiryCheck(client: TypedSocket): void {
    const authState = client.data.authState;
    if (!authState) return;

    const now = Date.now();
    const timeUntilRefresh = authState.refreshAt - now;
    const timeUntilExpiry = authState.tokenExp - now;

    // Clear existing timers if any
    this.cleanupTokenExpiryTimers(client.id);

    const timers: {
      warningTimer?: NodeJS.Timeout;
      expiryTimer?: NodeJS.Timeout;
    } = {};

    // Schedule warning/refresh suggestion
    if (timeUntilRefresh > 0) {
      timers.warningTimer = setTimeout(() => {
        client.emit('auth:tokenExpiring', {
          expiresIn: 5 * 60, // 5 minutes
        });
      }, timeUntilRefresh);
    }

    // Schedule disconnect on expiry
    if (timeUntilExpiry > 0) {
      timers.expiryTimer = setTimeout(() => {
        client.emit('auth:tokenExpired', { message: 'Session expired' });
        client.disconnect();
      }, timeUntilExpiry);
    }

    if (timers.warningTimer || timers.expiryTimer) {
      this.tokenExpiryTimers.set(client.id, timers);
    }
  }

  /**
   * Clean up token expiry timers for a disconnected socket
   */
  private cleanupTokenExpiryTimers(socketId: string): void {
    const timers = this.tokenExpiryTimers.get(socketId);
    if (timers) {
      if (timers.warningTimer) clearTimeout(timers.warningTimer);
      if (timers.expiryTimer) clearTimeout(timers.expiryTimer);
      this.tokenExpiryTimers.delete(socketId);
    }
  }

  // ====================== DELEGATED HANDLERS ======================

  // ----- Game Handlers -----

  @SubscribeMessage('game:join')
  async handleJoinGame(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: { gameId: string },
  ) {
    return this.gameHandlers.handleJoinGame(client, data);
  }

  @SubscribeMessage('game:leave')
  handleLeaveGame(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: { gameId: string },
  ) {
    return this.gameHandlers.handleLeaveGame(client, data);
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
  ) {
    return this.gameHandlers.handleMove(client, data);
  }

  @SubscribeMessage('game:undo')
  async handleUndo(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: { gameId: string },
  ) {
    return this.gameHandlers.handleUndo(client, data);
  }

  @SubscribeMessage('game:hint')
  async handleHint(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: { gameId: string },
  ) {
    return this.gameHandlers.handleHint(client, data);
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
  ) {
    return this.gameHandlers.handleHintApply(client, data);
  }

  @SubscribeMessage('game:sync')
  async handleSync(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: { gameId: string },
  ) {
    return this.gameHandlers.handleSync(client, data);
  }

  @SubscribeMessage('game:updateTime')
  async handleUpdateTime(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: { gameId: string; timeElapsed: number },
  ) {
    return this.gameHandlers.handleUpdateTime(client, data);
  }

  // ----- Match Handlers -----

  @SubscribeMessage('match:create')
  async handleMatchCreate(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: { difficulty: string },
  ) {
    return this.matchHandlers.handleMatchCreate(client, data);
  }

  @SubscribeMessage('match:join')
  handleMatchJoin(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: { matchId: string },
  ) {
    return this.matchHandlers.handleMatchJoin(client, data);
  }

  @SubscribeMessage('match:leave')
  handleMatchLeave(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: { matchId: string },
  ) {
    return this.matchHandlers.handleMatchLeave(client, data);
  }

  @SubscribeMessage('match:surrender')
  async handleMatchSurrender(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: { matchId: string },
  ) {
    return this.matchHandlers.handleMatchSurrender(client, data);
  }

  @SubscribeMessage('match:ready')
  async handleMatchReady(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: { matchId: string },
  ) {
    return this.matchHandlers.handleMatchReady(client, data);
  }

  @SubscribeMessage('match:unready')
  handleMatchUnready(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: { matchId: string },
  ) {
    return this.matchHandlers.handleMatchUnready(client, data);
  }

  @SubscribeMessage('match:move')
  handleMatchMove(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody()
    data: { matchId: string; row: number; col: number; value: number },
  ) {
    return this.matchHandlers.handleMatchMove(client, data);
  }

  @SubscribeMessage('match:submit')
  async handleMatchSubmit(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: { matchId: string },
  ) {
    return this.matchHandlers.handleMatchSubmit(client, data);
  }

  @SubscribeMessage('match:sync')
  handleMatchSync(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: { matchId: string },
  ) {
    return this.matchHandlers.handleMatchSync(client, data);
  }

  // ----- Spectator Handlers -----

  @SubscribeMessage('match:spectate')
  handleSpectate(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: { matchId: string },
  ) {
    return this.spectatorHandlers.handleSpectate(client, data);
  }

  @SubscribeMessage('match:spectateLeave')
  handleSpectateLeave(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: { matchId: string },
  ) {
    return this.spectatorHandlers.handleSpectateLeave(client, data);
  }

  @SubscribeMessage('match:activeMatches')
  handleGetActiveMatches(@ConnectedSocket() client: TypedSocket) {
    return this.spectatorHandlers.handleGetActiveMatches(client);
  }

  @SubscribeMessage('match:rematchRequest')
  async handleRematchRequest(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: { matchId: string },
  ) {
    return this.spectatorHandlers.handleRematchRequest(client, data);
  }

  @SubscribeMessage('match:rematchDecline')
  handleRematchDecline(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: { matchId: string },
  ) {
    return this.spectatorHandlers.handleRematchDecline(client, data);
  }

  // ----- Matchmaking Handlers -----

  @SubscribeMessage('matchmaking:join')
  async handleMatchmakingJoin(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: { difficulty: string },
  ) {
    return this.matchmakingHandlers.handleMatchmakingJoin(client, data);
  }

  @SubscribeMessage('matchmaking:cancel')
  handleMatchmakingCancel(@ConnectedSocket() client: TypedSocket) {
    return this.matchmakingHandlers.handleMatchmakingCancel(client);
  }

  // ----- Tripod Handlers -----

  @SubscribeMessage('tripod:join')
  async handleTripodJoin(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: { gameId: string },
  ) {
    return this.tripodHandlers.handleTripodJoin(client, data);
  }

  @SubscribeMessage('tripod:leave')
  handleTripodLeave(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: { gameId: string },
  ) {
    return this.tripodHandlers.handleTripodLeave(client, data);
  }

  @SubscribeMessage('tripod:toggleBorder')
  async handleTripodToggleBorder(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody()
    data: {
      gameId: string;
      type: 'horizontal' | 'vertical';
      row: number;
      col: number;
    },
  ) {
    return this.tripodHandlers.handleTripodToggleBorder(client, data);
  }

  @SubscribeMessage('tripod:updateBorders')
  async handleTripodUpdateBorders(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody()
    data: {
      gameId: string;
      borders: {
        horizontal: boolean[][];
        vertical: boolean[][];
      };
    },
  ) {
    return this.tripodHandlers.handleTripodUpdateBorders(client, data);
  }

  @SubscribeMessage('tripod:validate')
  async handleTripodValidate(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: { gameId: string },
  ) {
    return this.tripodHandlers.handleTripodValidate(client, data);
  }

  @SubscribeMessage('tripod:sync')
  async handleTripodSync(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: { gameId: string },
  ) {
    return this.tripodHandlers.handleTripodSync(client, data);
  }
}
