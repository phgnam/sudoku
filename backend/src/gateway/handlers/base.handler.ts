import { Logger } from '@nestjs/common';
import { RATE_LIMITS, RateLimitEntry } from '../types/rate-limit.types';
import type { TypedServer } from '../types/socket.types';

/**
 * Shared context for all gateway handlers.
 * Contains state and utilities that handlers need access to.
 */
export interface GatewayContext {
  server: TypedServer;
  logger: Logger;

  // Shared state maps
  playerNames: Map<string, string>;
  disconnectTimers: Map<string, NodeJS.Timeout>;
  rateLimits: Map<string, Map<string, RateLimitEntry>>;
  tokenExpiryTimers: Map<
    string,
    { warningTimer?: NodeJS.Timeout; expiryTimer?: NodeJS.Timeout }
  >;

  // Matchmaking state
  matchmakingInterval: NodeJS.Timeout | null;
}

/**
 * Base class for gateway handlers.
 * Provides shared utilities like rate limiting and player name lookup.
 */
export abstract class BaseHandler {
  protected readonly logger: Logger;

  constructor(
    protected readonly handlerName: string,
    protected context: GatewayContext,
  ) {
    this.logger = new Logger(handlerName);
  }

  /**
   * Set the gateway context. Called by GameGateway after initialization.
   */
  setContext(context: GatewayContext): void {
    this.context = context;
  }

  /**
   * Get the WebSocket server instance.
   */
  protected get server(): TypedServer {
    return this.context.server;
  }

  /**
   * Get the player names map.
   */
  protected get playerNames(): Map<string, string> {
    return this.context.playerNames;
  }

  /**
   * Get the disconnect timers map.
   */
  protected get disconnectTimers(): Map<string, NodeJS.Timeout> {
    return this.context.disconnectTimers;
  }

  /**
   * Get player display name by user ID.
   */
  protected getPlayerName(userId: string): string {
    return this.playerNames.get(userId) || 'Player';
  }

  /**
   * Check rate limit for a socket event.
   * Returns false if rate limited, true if allowed.
   */
  protected checkRateLimit(socketId: string, event: string): boolean {
    const config = RATE_LIMITS[event] || RATE_LIMITS.default;
    const rateLimits = this.context.rateLimits;

    if (!rateLimits.has(event)) {
      rateLimits.set(event, new Map());
    }
    const eventLimits = rateLimits.get(event)!;

    const now = Date.now();
    const entry = eventLimits.get(socketId) || {
      count: 0,
      firstRequest: now,
      blocked: false,
    };

    // Check if blocked
    if (entry.blocked && now - entry.firstRequest < config.blockDurationMs) {
      return false;
    }

    // Reset window if expired
    if (now - entry.firstRequest > config.windowMs) {
      entry.count = 0;
      entry.firstRequest = now;
      entry.blocked = false;
    }

    entry.count++;

    if (entry.count > config.maxRequests) {
      entry.blocked = true;
      eventLimits.set(socketId, entry);
      this.logger.warn(
        `Rate limit exceeded for socket ${socketId} on event ${event}`,
      );
      return false;
    }

    eventLimits.set(socketId, entry);
    return true;
  }

  /**
   * Emit event to all of user's connected clients (all tabs/devices).
   */
  protected emitToUser(
    userId: string,
    event: string,

    data: any,
  ): void {
    this.server.to(`user:${userId}`).emit(event as any, data);
  }

  /**
   * Create a standard error response.
   */
  protected errorResponse(
    event: string,
    message: string,
  ): { event: string; data: { message: string } } {
    return { event, data: { message } };
  }

  /**
   * Create a standard success response.
   */
  protected successResponse(
    event: string,
    data: unknown,
  ): { event: string; data: unknown } {
    return { event, data };
  }
}
