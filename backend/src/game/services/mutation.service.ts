import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Game, Puzzle } from '../../database/entities';
import { GameStatus } from '../../database/entities/game.entity';

export interface MutationEvent {
  gameId: string;
  row: number;
  col: number;
  previousValue: number;
  mutationNumber: number;
  nextMutationIn: number; // ms
}

export const MUTATION_INTERVAL_MS = 30000; // 30 seconds

@Injectable()
export class MutationService implements OnModuleDestroy {
  private readonly logger = new Logger(MutationService.name);
  private activeGameTimers: Map<string, NodeJS.Timeout> = new Map();
  private consecutiveFailures: Map<string, number> = new Map();
  private readonly MAX_CONSECUTIVE_FAILURES = 5;

  constructor(
    @InjectRepository(Game)
    private gameRepository: Repository<Game>,
    @InjectRepository(Puzzle)
    private puzzleRepository: Repository<Puzzle>,
  ) {}

  /**
   * Start mutation timer for a game
   * @param gameId - The game ID to start timer for
   * @param callback - Callback function when mutation should occur
   */
  startMutationTimer(
    gameId: string,
    callback: (gameId: string) => Promise<void>,
  ): void {
    // Stop existing timer if any
    this.stopMutationTimer(gameId);

    const timer = setInterval(() => {
      // Wrap callback in error handler to avoid unhandled promise rejections
      callback(gameId).catch((error: unknown) => {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(
          `Mutation callback error for game ${gameId}: ${errorMessage}`,
        );
        // Increment failure count - the calling code should handle stopping timer if too many failures
        this.recordMutationFailure(gameId);
      });
    }, MUTATION_INTERVAL_MS);

    this.activeGameTimers.set(gameId, timer);
  }

  /**
   * Check if a mutation timer is active for a game
   */
  hasActiveTimer(gameId: string): boolean {
    return this.activeGameTimers.has(gameId);
  }

  /**
   * Stop mutation timer for a game
   * @param gameId - The game ID to stop timer for
   */
  stopMutationTimer(gameId: string): void {
    const timer = this.activeGameTimers.get(gameId);
    if (timer) {
      clearInterval(timer);
      this.activeGameTimers.delete(gameId);
    }
    this.consecutiveFailures.delete(gameId);
  }

  /**
   * Record a mutation failure and check if timer should be stopped
   * Returns true if timer should be stopped
   */
  recordMutationFailure(gameId: string): boolean {
    const failures = (this.consecutiveFailures.get(gameId) || 0) + 1;
    this.consecutiveFailures.set(gameId, failures);

    if (failures >= this.MAX_CONSECUTIVE_FAILURES) {
      this.logger.warn(
        `Stopping mutation timer for game ${gameId} after ${failures} consecutive failures`,
      );
      this.stopMutationTimer(gameId);
      this.consecutiveFailures.delete(gameId);
      return true;
    }
    return false;
  }

  /**
   * Reset failure count on successful mutation
   */
  resetMutationFailures(gameId: string): void {
    this.consecutiveFailures.delete(gameId);
  }

  /**
   * Select a random filled cell for mutation
   * Excludes initial puzzle cells and hinted cells
   * @param gameId - The game ID
   * @returns Cell coordinates or null if no valid target
   */
  async selectMutationTarget(
    gameId: string,
  ): Promise<{ row: number; col: number } | null> {
    const game = await this.gameRepository.findOne({
      where: { id: gameId },
      relations: ['puzzle'],
    });

    if (!game || !game.puzzle) {
      return null;
    }

    const puzzle = game.puzzle;
    const currentState = game.currentState;
    const hintedCells = game.hintedCells || [];

    // #9: Validate grid dimensions (9x9 array)
    if (
      !Array.isArray(currentState) ||
      currentState.length !== 9 ||
      !currentState.every((row) => Array.isArray(row) && row.length === 9)
    ) {
      this.logger.error(`Invalid grid dimensions for game ${gameId}`);
      return null;
    }

    // Find all cells that are:
    // 1. Currently filled (not 0)
    // 2. Not part of the initial puzzle (puzzle cell is 0)
    // 3. Not hinted
    const eligibleCells: { row: number; col: number }[] = [];

    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const isFilledByPlayer = currentState[row][col] !== 0;
        const isInitialCell = puzzle.puzzle[row][col] !== 0;
        const isHintedCell = hintedCells.some(
          (c) => c.row === row && c.col === col,
        );

        if (isFilledByPlayer && !isInitialCell && !isHintedCell) {
          eligibleCells.push({ row, col });
        }
      }
    }

    if (eligibleCells.length === 0) {
      return null;
    }

    // Select random cell from eligible cells
    const randomIndex = Math.floor(Math.random() * eligibleCells.length);
    return eligibleCells[randomIndex];
  }

  /**
   * Apply mutation to a specific cell in the game
   * Clears the cell value (sets to 0)
   * @param gameId - The game ID
   * @param row - Row index
   * @param col - Column index
   * @returns MutationEvent or null if mutation failed
   */
  async applyMutation(
    gameId: string,
    row: number,
    col: number,
  ): Promise<MutationEvent | null> {
    try {
      // #8: Wrap in transaction to prevent race with user moves
      return await this.gameRepository.manager.transaction(async (manager) => {
        const game = await manager.findOne(Game, { where: { id: gameId } });

        if (!game) {
          return null;
        }

        // #15/#25: Status guard - only mutate active games
        if (game.status !== GameStatus.ACTIVE) {
          return null;
        }

        const previousValue = game.currentState[row][col];

        // #10: Check not already empty
        if (previousValue === 0) {
          return null;
        }

        // Clear the cell
        game.currentState[row][col] = 0;
        game.mutationCount++;
        game.lastMutationAt = new Date();

        await manager.save(Game, game);

        return {
          gameId,
          row,
          col,
          previousValue,
          mutationNumber: game.mutationCount,
          nextMutationIn: MUTATION_INTERVAL_MS,
        };
      });
    } catch (error) {
      // #7: Log DB save failures - failure tracking in gateway will handle repeated failures
      this.logger.error(
        `Failed to apply mutation for game ${gameId} at (${row}, ${col}):`,
        error,
      );
      return null;
    }
  }

  /**
   * Cleanup all timers on module destroy
   */
  onModuleDestroy(): void {
    for (const [gameId] of this.activeGameTimers) {
      this.stopMutationTimer(gameId);
    }
    this.consecutiveFailures.clear();
  }
}
