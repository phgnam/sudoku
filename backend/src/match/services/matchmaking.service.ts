import { Injectable, Logger } from '@nestjs/common';

export interface QueueEntry {
  playerId: string;
  socketId: string;
  playerName: string;
  rating: number;
  difficulty: string;
  joinedAt: number;
  searchRadius: number;
}

export interface QueueStatus {
  position: number;
  estimatedWait: number;
  searchRadius: number;
}

export interface MatchedPair {
  player1: QueueEntry;
  player2: QueueEntry;
  difficulty: string;
}

// Constants
const INITIAL_SEARCH_RADIUS = 200;
const RADIUS_EXPAND_AMOUNT = 50;
const MAX_SEARCH_RADIUS = 500;
const RADIUS_EXPAND_INTERVAL = 10000; // 10 seconds

@Injectable()
export class MatchmakingService {
  private readonly logger = new Logger(MatchmakingService.name);

  // Queue organized by difficulty
  private queues: Map<string, QueueEntry[]> = new Map([
    ['easy', []],
    ['normal', []],
    ['hard', []],
  ]);

  // Player to queue mapping for quick lookup
  private playerQueue: Map<string, string> = new Map(); // playerId -> difficulty

  addToQueue(
    entry: Omit<QueueEntry, 'joinedAt' | 'searchRadius'>,
  ): QueueStatus {
    // Remove from existing queue if already queued
    this.removeFromQueue(entry.playerId);

    const queueEntry: QueueEntry = {
      ...entry,
      joinedAt: Date.now(),
      searchRadius: INITIAL_SEARCH_RADIUS,
    };

    const queue = this.queues.get(entry.difficulty) || [];
    queue.push(queueEntry);
    this.queues.set(entry.difficulty, queue);
    this.playerQueue.set(entry.playerId, entry.difficulty);

    this.logger.log(
      `Player ${entry.playerName} (${entry.rating}) joined ${entry.difficulty} queue`,
    );

    return this.getQueueStatus(entry.playerId);
  }

  removeFromQueue(playerId: string): boolean {
    const difficulty = this.playerQueue.get(playerId);
    if (!difficulty) return false;

    const queue = this.queues.get(difficulty);
    if (!queue) return false;

    const index = queue.findIndex((e) => e.playerId === playerId);
    if (index === -1) return false;

    queue.splice(index, 1);
    this.playerQueue.delete(playerId);

    this.logger.log(`Player ${playerId} removed from ${difficulty} queue`);
    return true;
  }

  getQueueStatus(playerId: string): QueueStatus {
    const difficulty = this.playerQueue.get(playerId);
    if (!difficulty) {
      return {
        position: 0,
        estimatedWait: 0,
        searchRadius: INITIAL_SEARCH_RADIUS,
      };
    }

    const queue = this.queues.get(difficulty) || [];
    const index = queue.findIndex((e) => e.playerId === playerId);
    const entry = queue[index];

    // Estimate wait: ~5 seconds per position
    const estimatedWait = Math.max(5, (index + 1) * 5);

    return {
      position: index + 1,
      estimatedWait,
      searchRadius: entry?.searchRadius || INITIAL_SEARCH_RADIUS,
    };
  }

  isInQueue(playerId: string): boolean {
    return this.playerQueue.has(playerId);
  }

  getPlayerEntry(playerId: string): QueueEntry | null {
    const difficulty = this.playerQueue.get(playerId);
    if (!difficulty) return null;

    const queue = this.queues.get(difficulty) || [];
    return queue.find((e) => e.playerId === playerId) || null;
  }

  // Expand search radius for players waiting too long
  expandSearchRadii(): void {
    const now = Date.now();

    for (const [, queue] of this.queues) {
      for (const entry of queue) {
        const waitTime = now - entry.joinedAt;
        const expansions = Math.floor(waitTime / RADIUS_EXPAND_INTERVAL);
        const newRadius = Math.min(
          INITIAL_SEARCH_RADIUS + expansions * RADIUS_EXPAND_AMOUNT,
          MAX_SEARCH_RADIUS,
        );

        if (newRadius > entry.searchRadius) {
          entry.searchRadius = newRadius;
        }
      }
    }
  }

  // Find all possible matches
  findMatches(): MatchedPair[] {
    const matches: MatchedPair[] = [];

    for (const [difficulty, queue] of this.queues) {
      const matched = new Set<string>();

      // Sort by wait time (longest waiting first)
      const sortedQueue = [...queue].sort((a, b) => a.joinedAt - b.joinedAt);

      for (let i = 0; i < sortedQueue.length; i++) {
        const player1 = sortedQueue[i];
        if (matched.has(player1.playerId)) continue;

        // Find best match for this player
        let bestMatch: QueueEntry | null = null;
        let bestRatingDiff = Infinity;

        for (let j = i + 1; j < sortedQueue.length; j++) {
          const player2 = sortedQueue[j];
          if (matched.has(player2.playerId)) continue;

          const ratingDiff = Math.abs(player1.rating - player2.rating);
          const maxRadius = Math.max(
            player1.searchRadius,
            player2.searchRadius,
          );

          if (ratingDiff <= maxRadius && ratingDiff < bestRatingDiff) {
            bestMatch = player2;
            bestRatingDiff = ratingDiff;
          }
        }

        if (bestMatch) {
          matched.add(player1.playerId);
          matched.add(bestMatch.playerId);

          matches.push({
            player1,
            player2: bestMatch,
            difficulty,
          });

          this.logger.log(
            `Matched ${player1.playerName} (${player1.rating}) vs ${bestMatch.playerName} (${bestMatch.rating}) - diff: ${bestRatingDiff}`,
          );
        }
      }

      // Remove matched players from queue
      for (const playerId of matched) {
        this.removeFromQueue(playerId);
      }
    }

    return matches;
  }

  // Get all entries for status updates
  getAllQueuedPlayers(): QueueEntry[] {
    const allPlayers: QueueEntry[] = [];
    for (const [, queue] of this.queues) {
      allPlayers.push(...queue);
    }
    return allPlayers;
  }

  getQueueSize(difficulty?: string): number {
    if (difficulty) {
      return this.queues.get(difficulty)?.length || 0;
    }
    let total = 0;
    for (const [, queue] of this.queues) {
      total += queue.length;
    }
    return total;
  }
}
