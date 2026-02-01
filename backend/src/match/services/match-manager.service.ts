import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Match, MatchStatus, Difficulty } from '../../database/entities';

export interface Spectator {
  id: string;
  socketId: string;
  name: string;
}

export interface LiveMatch {
  id: string;
  hostId: string;
  guestId: string | null;
  hostReady: boolean;
  guestReady: boolean;
  hostSocketId: string;
  guestSocketId: string | null;
  difficulty: Difficulty;
  puzzleId: string | null;
  puzzle: number[][] | null;
  solution: number[][] | null;
  hostState: number[][] | null;
  guestState: number[][] | null;
  hostFilledCells: Set<string>; // "row,col" format
  guestFilledCells: Set<string>;
  status: 'waiting' | 'ready' | 'playing' | 'finished' | 'cancelled';
  startTime: number | null;
  finishedAt: number | null; // Timestamp when match finished
  timer: NodeJS.Timeout | null;
  firstSubmitter: string | null;
  winnerId: string | null;
  createdAt: number;
  // Completion times for draw detection (ms from start)
  hostCompletionTime: number | null;
  guestCompletionTime: number | null;
  // Match result for draw logic
  result: 'host_win' | 'guest_win' | 'draw' | null;
  // Spectator support
  spectators: Map<string, Spectator>;
  spectatorCount: number;
  // Rematch support
  rematchRequestedBy: string | null;
  rematchAccepted: boolean;
  rematchTimer: NodeJS.Timeout | null;
}

export interface MatchCompletionResult {
  complete: boolean;
  correct: boolean;
  position: 'first' | 'second' | null;
}

@Injectable()
export class MatchManagerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MatchManagerService.name);
  private matches = new Map<string, LiveMatch>();
  private playerToMatch = new Map<string, string>(); // Quick lookup: playerId -> matchId
  private persistInterval: NodeJS.Timeout | null = null;
  private completionLocks = new Map<string, boolean>(); // Mutex for simultaneous completion

  constructor(
    @InjectRepository(Match)
    private matchRepository: Repository<Match>,
  ) {}

  async onModuleInit() {
    await this.recoverActiveMatches();
    this.persistInterval = setInterval(() => this.persistAllMatches(), 30000);
  }

  async onModuleDestroy() {
    if (this.persistInterval) {
      clearInterval(this.persistInterval);
    }
    // Final persist on shutdown - await to ensure data is saved
    await this.persistAllMatches();
  }

  /**
   * Recover active matches from database on server restart
   */
  private async recoverActiveMatches(): Promise<void> {
    try {
      const activeMatches = await this.matchRepository.find({
        where: {
          status: In([
            MatchStatus.WAITING,
            MatchStatus.READY,
            MatchStatus.PLAYING,
          ]),
        },
        relations: ['puzzle'],
      });

      for (const dbMatch of activeMatches) {
        // Reconstruct in-memory state from database
        const liveMatch: LiveMatch = {
          id: dbMatch.id,
          hostId: dbMatch.hostId,
          guestId: dbMatch.guestId || null,
          hostReady: false, // Players must re-ready after reconnect
          guestReady: false,
          hostSocketId: '', // Players must reconnect
          guestSocketId: null,
          difficulty: dbMatch.difficulty,
          puzzleId: dbMatch.puzzleId || null,
          puzzle: dbMatch.puzzle?.puzzle || null,
          solution: dbMatch.puzzle?.solution || null,
          hostState: dbMatch.hostState || null,
          guestState: dbMatch.guestState || null,
          hostFilledCells: new Set(dbMatch.hostFilledCells || []),
          guestFilledCells: new Set(dbMatch.guestFilledCells || []),
          status: this.mapDbStatusToLive(dbMatch.status),
          startTime: dbMatch.startedAt ? dbMatch.startedAt.getTime() : null,
          finishedAt: null,
          timer: null,
          firstSubmitter: null,
          winnerId: dbMatch.winnerId || null,
          createdAt: dbMatch.createdAt.getTime(),
          // Completion times from database
          hostCompletionTime: dbMatch.hostCompletionTime || null,
          guestCompletionTime: dbMatch.guestCompletionTime || null,
          result: dbMatch.result
            ? this.mapDbResultToLive(dbMatch.result)
            : null,
          spectators: new Map(),
          spectatorCount: 0,
          rematchRequestedBy: null,
          rematchAccepted: false,
          rematchTimer: null,
        };

        this.matches.set(dbMatch.id, liveMatch);

        // Re-establish player-to-match mappings
        this.playerToMatch.set(dbMatch.hostId, dbMatch.id);
        if (dbMatch.guestId) {
          this.playerToMatch.set(dbMatch.guestId, dbMatch.id);
        }
      }

      this.logger.log(
        `Recovered ${activeMatches.length} active matches from database`,
      );
    } catch (error) {
      this.logger.error('Failed to recover active matches:', error);
    }
  }

  /**
   * Map database MatchStatus to LiveMatch status string
   */
  private mapDbStatusToLive(
    status: MatchStatus,
  ): 'waiting' | 'ready' | 'playing' | 'finished' | 'cancelled' {
    switch (status) {
      case MatchStatus.WAITING:
        return 'waiting';
      case MatchStatus.READY:
        return 'ready';
      case MatchStatus.PLAYING:
        return 'playing';
      case MatchStatus.FINISHED:
        return 'finished';
      case MatchStatus.CANCELLED:
        return 'cancelled';
      default:
        return 'waiting';
    }
  }

  /**
   * Map database MatchResult to LiveMatch result string
   */
  private mapDbResultToLive(
    result: 'host_win' | 'guest_win' | 'draw',
  ): 'host_win' | 'guest_win' | 'draw' {
    return result;
  }

  /**
   * Persist all active matches to database periodically
   */
  private async persistAllMatches(): Promise<void> {
    const updates: Promise<unknown>[] = [];

    for (const [id, match] of this.matches) {
      if (match.status === 'playing' || match.status === 'ready') {
        updates.push(
          this.matchRepository.update(id, {
            hostState: match.hostState || undefined,
            guestState: match.guestState || undefined,
            hostFilledCells: Array.from(match.hostFilledCells),
            guestFilledCells: Array.from(match.guestFilledCells),
          }),
        );
      }
    }

    if (updates.length > 0) {
      await Promise.allSettled(updates);
      this.logger.debug(
        `Persisted ${updates.length} active matches to database`,
      );
    }
  }

  /**
   * Create a new match room
   */
  async createMatch(
    hostId: string,
    hostSocketId: string,
    difficulty: Difficulty,
  ): Promise<string> {
    const matchId = await this.generateUniqueMatchId();

    const match: LiveMatch = {
      id: matchId,
      hostId,
      guestId: null,
      hostReady: false,
      guestReady: false,
      hostSocketId,
      guestSocketId: null,
      difficulty,
      puzzleId: null,
      puzzle: null,
      solution: null,
      hostState: null,
      guestState: null,
      hostFilledCells: new Set(),
      guestFilledCells: new Set(),
      status: 'waiting',
      startTime: null,
      finishedAt: null,
      timer: null,
      firstSubmitter: null,
      winnerId: null,
      createdAt: Date.now(),
      // Completion times for draw detection
      hostCompletionTime: null,
      guestCompletionTime: null,
      result: null,
      // Spectator support
      spectators: new Map(),
      spectatorCount: 0,
      // Rematch support
      rematchRequestedBy: null,
      rematchAccepted: false,
      rematchTimer: null,
    };

    this.matches.set(matchId, match);
    this.playerToMatch.set(hostId, matchId);

    this.logger.log(`Match created: ${matchId} by host: ${hostId}`);
    return matchId;
  }

  /**
   * Join an existing match
   */
  joinMatch(
    matchId: string,
    guestId: string,
    guestSocketId: string,
  ): LiveMatch {
    const match = this.matches.get(matchId);

    if (!match) {
      throw new Error('Match not found');
    }
    if (match.guestId) {
      throw new Error('Match is full');
    }
    if (match.hostId === guestId) {
      throw new Error('Cannot join your own match');
    }
    if (match.status !== 'waiting') {
      throw new Error('Match is not accepting players');
    }

    match.guestId = guestId;
    match.guestSocketId = guestSocketId;
    match.status = 'ready'; // Both players present, waiting for ready state

    this.playerToMatch.set(guestId, matchId);

    this.logger.log(`Player ${guestId} joined match ${matchId}`);
    return match;
  }

  /**
   * Set player ready state
   */
  setReady(
    matchId: string,
    playerId: string,
    ready: boolean = true,
  ): { allReady: boolean; match: LiveMatch } {
    const match = this.matches.get(matchId);

    if (!match) {
      throw new Error('Match not found');
    }

    if (playerId === match.hostId) {
      match.hostReady = ready;
    } else if (playerId === match.guestId) {
      match.guestReady = ready;
    } else {
      throw new Error('Player not in match');
    }

    const allReady =
      match.hostReady && match.guestReady && match.guestId !== null;

    this.logger.log(
      `Player ${playerId} ready=${ready} in match ${matchId}. All ready: ${allReady}`,
    );
    return { allReady, match };
  }

  /**
   * Start the match with puzzle
   */
  startMatch(
    matchId: string,
    puzzleId: string,
    puzzle: number[][],
    solution: number[][],
  ): LiveMatch {
    const match = this.matches.get(matchId);
    if (!match) throw new Error('Match not found');

    match.puzzleId = puzzleId;
    match.puzzle = puzzle;
    match.solution = solution;
    match.hostState = puzzle.map((row) => [...row]);
    match.guestState = puzzle.map((row) => [...row]);
    match.status = 'playing';
    match.startTime = Date.now();

    this.logger.log(`Match ${matchId} started with puzzle ${puzzleId}`);
    return match;
  }

  /**
   * Record a move (track filled cell position only)
   */
  recordMove(
    matchId: string,
    playerId: string,
    row: number,
    col: number,
    value: number,
  ): void {
    const match = this.matches.get(matchId);
    if (!match || match.status !== 'playing') return;

    // Validate playerId is a match participant
    if (playerId !== match.hostId && playerId !== match.guestId) {
      this.logger.warn(
        `Invalid playerId ${playerId} attempted to record move in match ${matchId}`,
      );
      return;
    }

    const cellKey = `${row},${col}`;
    const isHost = playerId === match.hostId;
    const state = isHost ? match.hostState : match.guestState;
    const filledCells = isHost ? match.hostFilledCells : match.guestFilledCells;

    if (state) {
      state[row][col] = value;
      if (value !== 0) {
        filledCells.add(cellKey);
      } else {
        filledCells.delete(cellKey);
      }
    }
  }

  /**
   * Check if player's grid is complete and correct
   */
  checkCompletion(matchId: string, playerId: string): MatchCompletionResult {
    const match = this.matches.get(matchId);
    if (!match || !match.solution) {
      return { complete: false, correct: false, position: null };
    }

    const isHost = playerId === match.hostId;
    const grid = isHost ? match.hostState : match.guestState;

    if (!grid) {
      return { complete: false, correct: false, position: null };
    }

    // Check if all cells filled
    const complete = grid.every((row) => row.every((cell) => cell !== 0));
    if (!complete) {
      return { complete: false, correct: false, position: null };
    }

    // Validate against solution
    const correct = grid.every((row, i) =>
      row.every((cell, j) => cell === match.solution![i][j]),
    );

    // Track submission order
    const isFirst = !match.firstSubmitter;
    if (correct && isFirst) {
      match.firstSubmitter = playerId;
    }

    return { complete, correct, position: isFirst ? 'first' : 'second' };
  }

  /**
   * Handle player completion with draw detection
   * Uses mutex to handle simultaneous completion attempts
   * If both players complete within 500ms, result is DRAW
   */
  async handlePlayerComplete(
    matchId: string,
    playerId: string,
    completionTime: number,
  ): Promise<LiveMatch | null> {
    // Acquire lock - if another completion is in progress, wait with retry loop
    const maxRetries = 10;
    const retryDelay = 50; // ms

    for (let i = 0; i < maxRetries; i++) {
      if (!this.completionLocks.get(matchId)) {
        break; // Lock is available
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
      const match = this.matches.get(matchId);
      if (match?.status === 'finished') return match;
    }

    // Check if lock is still held after retry loop - if so, return current match state
    if (this.completionLocks.get(matchId)) {
      const match = this.matches.get(matchId);
      // Another completion is still in progress - return current state without proceeding
      return match || null;
    }

    // Acquire lock now that it's available
    this.completionLocks.set(matchId, true);

    try {
      const match = this.matches.get(matchId);
      if (!match || match.status === 'finished') return match || null;

      const isHost = playerId === match.hostId;

      // Record completion time
      if (isHost) {
        match.hostCompletionTime = completionTime;
      } else {
        match.guestCompletionTime = completionTime;
      }

      // Check for simultaneous completion (within 500ms)
      if (
        match.hostCompletionTime !== null &&
        match.guestCompletionTime !== null
      ) {
        const timeDiff = Math.abs(
          match.hostCompletionTime - match.guestCompletionTime,
        );

        if (timeDiff <= 500) {
          // DRAW - both completed within 500ms of each other
          match.result = 'draw';
          match.winnerId = null;
          this.logger.log(
            `Match ${matchId}: DRAW - both players completed within ${timeDiff}ms`,
          );
        } else if (match.hostCompletionTime < match.guestCompletionTime) {
          match.result = 'host_win';
          match.winnerId = match.hostId;
        } else {
          match.result = 'guest_win';
          match.winnerId = match.guestId;
        }
      } else {
        // First to complete wins (other player hasn't finished)
        match.result = isHost ? 'host_win' : 'guest_win';
        match.winnerId = playerId;
      }

      match.status = 'finished';
      match.finishedAt = Date.now();

      return match;
    } finally {
      this.completionLocks.delete(matchId);
    }
  }

  /**
   * End match with result
   */
  endMatch(
    matchId: string,
    winnerId: string | null,
    reason: string,
  ): LiveMatch | null {
    const match = this.matches.get(matchId);
    if (!match) return null;

    // Clear timeout if exists
    if (match.timer) {
      clearTimeout(match.timer);
      match.timer = null;
    }

    // Clear rematch timer if exists
    if (match.rematchTimer) {
      clearTimeout(match.rematchTimer);
      match.rematchTimer = null;
    }

    match.status = 'finished';
    match.finishedAt = Date.now();
    match.winnerId = winnerId;

    // Remove player-to-match mappings so they can create/join new matches
    this.playerToMatch.delete(match.hostId);
    if (match.guestId) {
      this.playerToMatch.delete(match.guestId);
    }

    this.logger.log(
      `Match ${matchId} ended. Winner: ${winnerId || 'draw'}. Reason: ${reason}`,
    );

    // Schedule cleanup of finished match after 5 minutes (to allow result viewing)
    setTimeout(
      () => {
        if (this.matches.get(matchId)?.status === 'finished') {
          this.matches.delete(matchId);
          this.logger.log(`Cleaned up finished match: ${matchId}`);
        }
      },
      5 * 60 * 1000,
    );

    return match;
  }

  /**
   * Get match by ID
   */
  getMatch(matchId: string): LiveMatch | undefined {
    return this.matches.get(matchId);
  }

  /**
   * Find match by player ID
   * Only returns matches that are still active (not finished/cancelled)
   */
  findMatchByPlayer(playerId: string): LiveMatch | undefined {
    const matchId = this.playerToMatch.get(playerId);
    if (!matchId) return undefined;

    const match = this.matches.get(matchId);

    // Only return if match exists and is still active
    if (match && match.status !== 'finished' && match.status !== 'cancelled') {
      return match;
    }

    // Clean up stale mapping if match is finished/cancelled/deleted
    if (!match || match.status === 'finished' || match.status === 'cancelled') {
      this.playerToMatch.delete(playerId);
    }

    return undefined;
  }

  /**
   * Remove player from match (leave/disconnect)
   * Can be called with just playerId - will find match internally
   */
  removePlayer(playerId: string): {
    removed: boolean;
    matchCancelled: boolean;
  } {
    const matchId = this.playerToMatch.get(playerId);
    if (!matchId) return { removed: false, matchCancelled: false };

    const match = this.matches.get(matchId);
    if (!match) return { removed: false, matchCancelled: false };

    this.playerToMatch.delete(playerId);

    if (playerId === match.hostId) {
      // Host left - cancel match
      match.status = 'cancelled';
      // Clear any pending timers to avoid stale timeouts
      if (match.timer) {
        clearTimeout(match.timer);
        match.timer = null;
      }
      if (match.rematchTimer) {
        clearTimeout(match.rematchTimer);
        match.rematchTimer = null;
      }
      this.playerToMatch.delete(match.guestId || '');
      this.matches.delete(matchId);
      return { removed: true, matchCancelled: true };
    } else if (playerId === match.guestId) {
      // Guest left - reset to waiting
      match.guestId = null;
      match.guestSocketId = null;
      match.guestReady = false;
      match.status = 'waiting';
      return { removed: true, matchCancelled: false };
    }

    return { removed: false, matchCancelled: false };
  }

  /**
   * Update socket ID (for reconnection)
   * Can be called with just playerId and socketId - will find match internally
   */
  updateSocketId(playerId: string, newSocketId: string): void {
    const matchId = this.playerToMatch.get(playerId);
    if (!matchId) return;

    const match = this.matches.get(matchId);
    if (!match) return;

    if (playerId === match.hostId) {
      match.hostSocketId = newSocketId;
    } else if (playerId === match.guestId) {
      match.guestSocketId = newSocketId;
    }
  }

  /**
   * Get opponent filled cells for a player
   */
  getOpponentFilledCells(matchId: string, playerId: string): string[] {
    const match = this.matches.get(matchId);
    if (!match) return [];

    const isHost = playerId === match.hostId;
    const opponentCells = isHost
      ? match.guestFilledCells
      : match.hostFilledCells;
    return Array.from(opponentCells);
  }

  /**
   * Set match timer
   */
  setMatchTimer(matchId: string, timer: NodeJS.Timeout): void {
    const match = this.matches.get(matchId);
    if (match) {
      match.timer = timer;
    }
  }

  /**
   * Generate short readable match ID
   */
  private generateMatchId(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate unique match ID with collision checking
   * Checks both in-memory Map and database for collision
   * Retries with exponential backoff, falls back to UUID prefix after maxRetries
   */
  private async generateUniqueMatchId(maxRetries = 5): Promise<string> {
    for (let i = 0; i < maxRetries; i++) {
      const id = this.generateMatchId();

      // Check in-memory first (fast path)
      if (this.matches.has(id)) {
        continue;
      }

      // Check database for collision
      const existing = await this.matchRepository.findOne({
        where: { id },
        select: ['id'],
      });

      if (!existing) {
        return id;
      }

      // Exponential backoff on collision
      await new Promise((r) => setTimeout(r, Math.pow(2, i) * 100));
    }

    // Fallback: use UUID prefix (8 chars for better uniqueness)
    this.logger.warn(
      `Match ID collision detected after ${maxRetries} retries, falling back to UUID`,
    );
    return uuidv4().substring(0, 8).toUpperCase();
  }

  /**
   * Cleanup old matches (call periodically)
   */
  cleanupStaleMatches(maxAgeMs: number = 30 * 60 * 1000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [matchId, match] of this.matches) {
      const shouldCleanup =
        // Waiting matches that are too old
        (match.status === 'waiting' && now - match.createdAt > maxAgeMs) ||
        // Finished matches older than 5 minutes since finishing
        (match.status === 'finished' &&
          match.finishedAt !== null &&
          now - match.finishedAt > 5 * 60 * 1000) ||
        // Cancelled matches
        match.status === 'cancelled';

      if (shouldCleanup) {
        this.playerToMatch.delete(match.hostId);
        if (match.guestId) this.playerToMatch.delete(match.guestId);
        this.matches.delete(matchId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} stale matches`);
    }
    return cleaned;
  }

  // ============ Spectator Management ============

  /**
   * Add a spectator to a match
   */
  addSpectator(
    matchId: string,
    spectatorId: string,
    socketId: string,
    name: string,
  ): boolean {
    const match = this.matches.get(matchId);
    if (!match) {
      throw new Error('Match not found');
    }
    if (match.spectators.size >= 20) {
      throw new Error('Spectator limit reached (max 20)');
    }
    if (match.hostId === spectatorId || match.guestId === spectatorId) {
      throw new Error('Players cannot spectate their own match');
    }

    match.spectators.set(spectatorId, { id: spectatorId, socketId, name });
    match.spectatorCount = match.spectators.size;
    this.logger.log(`Spectator ${name} joined match ${matchId}`);
    return true;
  }

  /**
   * Remove a spectator from a match
   */
  removeSpectator(matchId: string, spectatorId: string): boolean {
    const match = this.matches.get(matchId);
    if (!match) return false;

    const spectator = match.spectators.get(spectatorId);
    if (spectator) {
      match.spectators.delete(spectatorId);
      match.spectatorCount = match.spectators.size;
      this.logger.log(`Spectator ${spectator.name} left match ${matchId}`);
      return true;
    }
    return false;
  }

  /**
   * Get all spectators for a match
   */
  getSpectators(matchId: string): Array<{ id: string; name: string }> {
    const match = this.matches.get(matchId);
    if (!match) return [];
    return Array.from(match.spectators.values()).map((s) => ({
      id: s.id,
      name: s.name,
    }));
  }

  /**
   * Get spectator socket IDs for a match
   */
  getSpectatorSocketIds(matchId: string): string[] {
    const match = this.matches.get(matchId);
    if (!match) return [];
    return Array.from(match.spectators.values()).map((s) => s.socketId);
  }

  /**
   * Check if user is spectating a match
   */
  isSpectating(matchId: string, spectatorId: string): boolean {
    const match = this.matches.get(matchId);
    if (!match) return false;
    return match.spectators.has(spectatorId);
  }

  /**
   * Get list of active matches available for spectating
   */
  getActiveMatches(): Array<{
    matchId: string;
    hostId: string;
    guestId: string | null;
    difficulty: Difficulty;
    status: string;
    spectatorCount: number;
    startTime: number | null;
  }> {
    const activeMatches: Array<{
      matchId: string;
      hostId: string;
      guestId: string | null;
      difficulty: Difficulty;
      status: string;
      spectatorCount: number;
      startTime: number | null;
    }> = [];

    for (const [matchId, match] of this.matches) {
      if (match.status === 'playing' || match.status === 'ready') {
        activeMatches.push({
          matchId,
          hostId: match.hostId,
          guestId: match.guestId,
          difficulty: match.difficulty,
          status: match.status,
          spectatorCount: match.spectatorCount,
          startTime: match.startTime,
        });
      }
    }

    return activeMatches;
  }

  // ==================== REMATCH SUPPORT ====================

  /**
   * Request a rematch after match ends
   */
  requestRematch(
    matchId: string,
    playerId: string,
  ): {
    success: boolean;
    waitingFor: string | null;
    error?: string;
  } {
    const match = this.matches.get(matchId);
    if (!match || match.status !== 'finished') {
      return {
        success: false,
        waitingFor: null,
        error: 'Match not available for rematch',
      };
    }

    // Validate that playerId is a match participant
    if (playerId !== match.hostId && playerId !== match.guestId) {
      return {
        success: false,
        waitingFor: null,
        error: 'Player is not a participant of this match',
      };
    }

    if (match.rematchRequestedBy === playerId) {
      return { success: false, waitingFor: null, error: 'Already requested' };
    }

    // If other player already requested, this is acceptance
    if (match.rematchRequestedBy && match.rematchRequestedBy !== playerId) {
      match.rematchAccepted = true;
      if (match.rematchTimer) {
        clearTimeout(match.rematchTimer);
        match.rematchTimer = null;
      }
      return { success: true, waitingFor: null }; // Both agreed
    }

    // First request
    match.rematchRequestedBy = playerId;
    const otherPlayer =
      playerId === match.hostId ? match.guestId : match.hostId;
    return { success: true, waitingFor: otherPlayer };
  }

  /**
   * Cancel a pending rematch request
   */
  cancelRematchRequest(matchId: string): void {
    const match = this.matches.get(matchId);
    if (match) {
      match.rematchRequestedBy = null;
      match.rematchAccepted = false;
      if (match.rematchTimer) {
        clearTimeout(match.rematchTimer);
        match.rematchTimer = null;
      }
    }
  }

  /**
   * Set the rematch timer
   */
  setRematchTimer(matchId: string, timer: NodeJS.Timeout): void {
    const match = this.matches.get(matchId);
    if (match) {
      match.rematchTimer = timer;
    }
  }

  /**
   * Create a new match from an old one (rematch)
   * Swaps host/guest roles for fairness
   */
  async createRematch(
    oldMatchId: string,
    hostSocketId: string,
    guestSocketId: string,
  ): Promise<string> {
    const oldMatch = this.matches.get(oldMatchId);
    if (!oldMatch || !oldMatch.guestId) {
      throw new Error('Invalid match for rematch');
    }

    // Swap roles: old guest becomes new host
    const newMatchId = await this.generateUniqueMatchId();

    const newMatch: LiveMatch = {
      id: newMatchId,
      hostId: oldMatch.guestId, // Swapped
      guestId: oldMatch.hostId, // Swapped
      hostReady: false,
      guestReady: false,
      hostSocketId: guestSocketId, // Swapped
      guestSocketId: hostSocketId, // Swapped
      difficulty: oldMatch.difficulty,
      puzzleId: null,
      puzzle: null,
      solution: null,
      hostState: null,
      guestState: null,
      hostFilledCells: new Set(),
      guestFilledCells: new Set(),
      status: 'waiting',
      startTime: null,
      finishedAt: null,
      timer: null,
      firstSubmitter: null,
      winnerId: null,
      createdAt: Date.now(),
      // Reset completion times for new match
      hostCompletionTime: null,
      guestCompletionTime: null,
      result: null,
      spectators: new Map(),
      spectatorCount: 0,
      rematchRequestedBy: null,
      rematchAccepted: false,
      rematchTimer: null,
    };

    // Update mappings
    this.matches.set(newMatchId, newMatch);
    this.playerToMatch.set(newMatch.hostId, newMatchId);
    this.playerToMatch.set(newMatch.guestId!, newMatchId);

    // Cleanup old match timer if any
    if (oldMatch.rematchTimer) {
      clearTimeout(oldMatch.rematchTimer);
    }
    if (oldMatch.timer) {
      clearTimeout(oldMatch.timer);
    }

    // Delete old match
    this.matches.delete(oldMatchId);

    this.logger.log(`Rematch created: ${newMatchId} from ${oldMatchId}`);
    return newMatchId;
  }

  /**
   * Check if match has a pending rematch request
   */
  hasRematchRequest(matchId: string): boolean {
    const match = this.matches.get(matchId);
    return match?.rematchRequestedBy !== null;
  }

  /**
   * Get rematch status
   */
  getRematchStatus(matchId: string): {
    requestedBy: string | null;
    accepted: boolean;
  } {
    const match = this.matches.get(matchId);
    if (!match) {
      return { requestedBy: null, accepted: false };
    }
    return {
      requestedBy: match.rematchRequestedBy,
      accepted: match.rematchAccepted,
    };
  }
}
