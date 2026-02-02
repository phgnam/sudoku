import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import {
  Game,
  GameStatus,
  GameMode,
  Move,
  User,
  Puzzle,
  GameHistory,
  Difficulty,
} from '../../database/entities';
import { SudokuValidatorService } from './sudoku-validator.service';
import { HintService } from './hint.service';
import { TripodPuzzleService } from '../../puzzle/services/tripod-puzzle.service';
import {
  DashboardStatsResponse,
  DifficultyStats,
  RecentGame,
} from '../dto/game.dto';
import { CreateTripodGameDto } from '../dto/tripod.dto';

@Injectable()
export class GameService {
  constructor(
    @InjectRepository(Game)
    private gameRepository: Repository<Game>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Puzzle)
    private puzzleRepository: Repository<Puzzle>,
    @InjectRepository(GameHistory)
    private gameHistoryRepository: Repository<GameHistory>,
    private validator: SudokuValidatorService,
    private hintService: HintService,
    private tripodPuzzleService: TripodPuzzleService,
  ) {}

  // Create a new game
  async createGame(
    userId: string,
    difficulty: string,
    gameMode: string = GameMode.CLASSIC,
  ) {
    // Verify user exists
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(
        `User not found with ID: ${userId}. Please ensure you are authenticated.`,
      );
    }

    // Abandon any existing active games for this user
    await this.gameRepository.update(
      { userId, status: GameStatus.ACTIVE },
      { status: GameStatus.ABANDONED },
    );

    // Get random puzzle of specified difficulty
    const puzzles = await this.puzzleRepository.find({
      where: { difficulty: difficulty as Difficulty },
    });

    if (puzzles.length === 0) {
      throw new NotFoundException(
        `No puzzles found for difficulty: ${difficulty}`,
      );
    }

    const puzzle = puzzles[Math.floor(Math.random() * puzzles.length)];

    // Create game
    const game = this.gameRepository.create({
      userId,
      puzzleId: puzzle.id,
      difficulty: puzzle.difficulty,
      currentState: puzzle.puzzle,
      moveHistory: [],
      hintsUsed: 0,
      mistakes: 0,
      timeElapsed: 0,
      status: GameStatus.ACTIVE,
      gameMode,
      mutationCount: 0,
      lastMutationAt: null,
    });

    const savedGame = await this.gameRepository.save(game);

    // Return game with puzzle (including solution) for frontend validation
    return {
      ...savedGame,
      puzzle: {
        id: puzzle.id,
        solution: puzzle.solution,
      },
    };
  }

  // Get game by ID
  async getGame(gameId: string) {
    const game = await this.gameRepository.findOne({
      where: { id: gameId },
      relations: ['puzzle'],
    });

    if (!game) {
      throw new NotFoundException('Game not found');
    }

    return game;
  }

  // Make a move with optimistic locking to prevent race conditions
  // Note: SQLite doesn't support pessimistic locking, so we rely on
  // transaction isolation + version check for concurrency control
  async makeMove(
    gameId: string,
    row: number,
    col: number,
    value: number,
    timeElapsed?: number,
    expectedVersion?: number,
  ) {
    return this.gameRepository.manager.transaction(async (manager) => {
      // Fetch game within transaction (SQLite uses SERIALIZABLE by default)
      const game = await manager.findOne(Game, {
        where: { id: gameId },
        relations: ['puzzle'],
      });

      if (!game) {
        throw new NotFoundException('Game not found');
      }

      // Check version for optimistic locking if provided
      if (expectedVersion !== undefined && game.version !== expectedVersion) {
        throw new ConflictException(
          'Game state has changed. Please refresh and try again.',
        );
      }

      if (game.status !== GameStatus.ACTIVE) {
        throw new BadRequestException('Game is not active');
      }

      // Protect initial puzzle cells from modification
      const puzzle = await manager.findOne(Puzzle, {
        where: { id: game.puzzleId },
      });
      if (puzzle && puzzle.puzzle[row][col] !== 0) {
        throw new BadRequestException('Cannot modify initial puzzle cells');
      }

      // Update timeElapsed from client (for display purposes only, NOT used for leaderboard)
      // SECURITY NOTE: Leaderboard uses server-calculated time (completedAt - startedAt)
      if (timeElapsed !== undefined) {
        game.timeElapsed = timeElapsed;
      }

      const previousValue = game.currentState[row][col];

      // Create move record
      const move: Move = {
        row,
        col,
        previousValue,
        newValue: value,
        timestamp: Date.now(),
      };

      // Update game state
      game.currentState[row][col] = value;
      game.moveHistory.push(move);

      // Validate move
      if (
        value !== 0 &&
        !this.validator.isValidMove(game.currentState, row, col, value)
      ) {
        game.mistakes++;

        if (game.mistakes >= 3) {
          game.status = GameStatus.FAILED;
        }
      }

      // Check if game is complete
      if (this.validator.isComplete(game.currentState)) {
        game.status = GameStatus.COMPLETED;
        game.completedAt = new Date();
        await manager.save(Game, game);

        // Update user stats within transaction
        await this.updateUserStatsInTransaction(
          game.userId,
          game.difficulty,
          manager,
        );

        // Create game history record for leaderboard within transaction
        await this.createGameHistoryInTransaction(game, manager);

        return game;
      }

      return manager.save(Game, game);
    });
  }

  // Undo last move (skip hinted cells)
  async undoMove(gameId: string) {
    const game = await this.getGame(gameId);

    if (game.moveHistory.length === 0) {
      throw new Error('No moves to undo');
    }

    // Find the last move that is NOT on a hinted cell
    let lastMoveIndex = game.moveHistory.length - 1;
    while (lastMoveIndex >= 0) {
      const move = game.moveHistory[lastMoveIndex];
      const isHintedCell = (game.hintedCells || []).some(
        (c) => c.row === move.row && c.col === move.col,
      );
      if (!isHintedCell) {
        break;
      }
      lastMoveIndex--;
    }

    if (lastMoveIndex < 0) {
      throw new Error(
        'No moves to undo (all remaining moves are on hinted cells)',
      );
    }

    const lastMove = game.moveHistory.splice(lastMoveIndex, 1)[0];
    game.currentState[lastMove.row][lastMove.col] = lastMove.previousValue;

    return this.gameRepository.save(game);
  }

  // Apply hint value to game state (without creating a move in history)
  async applyHint(
    gameId: string,
    row: number,
    col: number,
    value: number,
    timeElapsed?: number,
  ) {
    const game = await this.getGame(gameId);

    // Update timeElapsed from client (for display purposes only, NOT used for leaderboard)
    // SECURITY NOTE: Leaderboard uses server-calculated time (completedAt - startedAt)
    if (timeElapsed !== undefined) {
      game.timeElapsed = timeElapsed;
    }

    // Update the cell value
    game.currentState[row][col] = value;

    // Add to hintedCells list
    if (!game.hintedCells) {
      game.hintedCells = [];
    }

    // Avoid duplicates
    const alreadyHinted = game.hintedCells.some(
      (c) => c.row === row && c.col === col,
    );
    if (!alreadyHinted) {
      game.hintedCells.push({ row, col });
    }

    // Check if game is complete after applying hint
    if (this.validator.isComplete(game.currentState)) {
      // Wrap completion logic in transaction for atomicity (Issue #12)
      await this.gameRepository.manager.transaction(async (manager) => {
        game.status = GameStatus.COMPLETED;
        game.completedAt = new Date();
        await manager.save(Game, game);

        // Update user stats within transaction
        await this.updateUserStatsInTransaction(
          game.userId,
          game.difficulty,
          manager,
        );

        // Create game history record for leaderboard within transaction
        await this.createGameHistoryInTransaction(game, manager);
      });

      return game;
    }

    return this.gameRepository.save(game);
  }

  // Request hint
  async useHint(gameId: string) {
    const game = await this.getGame(gameId);

    if (game.hintsUsed >= 3) {
      throw new Error('Maximum hints used');
    }

    const hint = this.hintService.generateHint(
      game.currentState,
      game.puzzle.solution,
    );

    game.hintsUsed++;
    await this.gameRepository.save(game);

    return hint;
  }

  // Update time elapsed (only for active games)
  async updateTime(gameId: string, timeElapsed: number) {
    const game = await this.getGame(gameId);
    // Only update time for active games (ignore stale updates from old games)
    if (game.status !== GameStatus.ACTIVE) {
      return game;
    }
    game.timeElapsed = timeElapsed;
    return this.gameRepository.save(game);
  }

  // Handle mutation for mutating game mode
  // retryCount is used internally to limit retries on optimistic lock conflicts
  async handleMutation(
    gameId: string,
    retryCount = 0,
  ): Promise<{
    row: number;
    col: number;
    previousValue: number;
  } | null> {
    const MAX_RETRIES = 3;

    const game = await this.gameRepository.findOne({
      where: { id: gameId },
      relations: ['puzzle'],
    });

    if (!game || game.status !== GameStatus.ACTIVE) {
      return null;
    }

    if (game.gameMode !== GameMode.MUTATING) {
      return null;
    }

    // Guard: ensure puzzle relation exists (can be null if puzzle was deleted)
    const puzzle = game.puzzle;
    if (!puzzle || !puzzle.puzzle) {
      return null;
    }

    const currentState = game.currentState;
    const hintedCells = game.hintedCells || [];

    // Find eligible cells (filled by player, not initial, not hinted)
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

    // Select random cell
    const randomIndex = Math.floor(Math.random() * eligibleCells.length);
    const target = eligibleCells[randomIndex];
    const previousValue = currentState[target.row][target.col];

    // Use optimistic locking with version check to prevent overwriting newer moves
    const currentVersion = game.version;

    // Clear the cell
    game.currentState[target.row][target.col] = 0;
    game.mutationCount++;
    game.lastMutationAt = new Date();

    // Try to save with version check - reload if version mismatch
    const updateResult = await this.gameRepository.update(
      { id: game.id, version: currentVersion },
      {
        currentState: game.currentState,
        mutationCount: game.mutationCount,
        lastMutationAt: game.lastMutationAt,
        version: currentVersion + 1,
      },
    );

    // If no rows affected, the game was modified by another operation
    if (updateResult.affected === 0) {
      // Retry with limit to prevent stack overflow
      if (retryCount >= MAX_RETRIES) {
        // Give up after max retries - the game is under heavy contention
        // The next scheduled mutation tick will try again
        return null;
      }
      // Reload and retry the mutation with incremented retry count
      return this.handleMutation(gameId, retryCount + 1);
    }

    return {
      row: target.row,
      col: target.col,
      previousValue,
    };
  }

  // Update user stats when game completes
  private async updateUserStats(userId: string, difficulty: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) return;

    switch (difficulty) {
      case 'easy':
        user.easyCompleted++;
        break;
      case 'normal':
        user.normalCompleted++;
        break;
      case 'hard':
        user.hardCompleted++;
        break;
    }

    await this.userRepository.save(user);
  }

  // Update user stats within a transaction
  private async updateUserStatsInTransaction(
    userId: string,
    difficulty: string,
    manager: EntityManager,
  ) {
    const user = await manager.findOne(User, { where: { id: userId } });
    if (!user) return;

    switch (difficulty) {
      case 'easy':
        user.easyCompleted++;
        break;
      case 'normal':
        user.normalCompleted++;
        break;
      case 'hard':
        user.hardCompleted++;
        break;
    }

    await manager.save(User, user);
  }

  // Create game history record for leaderboard
  // SECURITY: Calculate timeElapsed on server-side to prevent cheating
  private async createGameHistory(game: Game): Promise<void> {
    const completedAt = game.completedAt || new Date();
    const startedAt = game.startedAt;

    // Calculate timeElapsed server-side (in seconds)
    // This prevents clients from sending fake low times to cheat the leaderboard
    const serverCalculatedTime = Math.floor(
      (completedAt.getTime() - startedAt.getTime()) / 1000,
    );

    const gameHistory = this.gameHistoryRepository.create({
      userId: game.userId,
      gameId: game.id,
      difficulty: game.difficulty,
      timeElapsed: serverCalculatedTime, // ✅ SECURE: Server-calculated, not client-provided
      hintsUsed: game.hintsUsed,
      mistakes: game.mistakes,
      completedAt: completedAt,
    });

    await this.gameHistoryRepository.save(gameHistory);
  }

  // Create game history within a transaction
  private async createGameHistoryInTransaction(
    game: Game,
    manager: EntityManager,
  ): Promise<void> {
    const completedAt = game.completedAt || new Date();
    const startedAt = game.startedAt;

    // Calculate timeElapsed server-side (in seconds)
    const serverCalculatedTime = Math.floor(
      (completedAt.getTime() - startedAt.getTime()) / 1000,
    );

    const gameHistory = manager.create(GameHistory, {
      userId: game.userId,
      gameId: game.id,
      difficulty: game.difficulty,
      timeElapsed: serverCalculatedTime,
      hintsUsed: game.hintsUsed,
      mistakes: game.mistakes,
      completedAt: completedAt,
    });

    await manager.save(GameHistory, gameHistory);
  }

  // Get dashboard stats for a user
  async getDashboardStats(userId: string): Promise<DashboardStatsResponse> {
    // Get all games for this user
    const games = await this.gameRepository.find({
      where: { userId },
      order: { startedAt: 'DESC' },
    });

    // Calculate overall stats
    const totalGames = games.length;
    const completedGames = games.filter(
      (g) => g.status === GameStatus.COMPLETED,
    ).length;
    const failedGames = games.filter(
      (g) => g.status === GameStatus.FAILED,
    ).length;

    // Calculate win rate based on finished games (completed + failed), excluding active and abandoned
    const finishedGames = completedGames + failedGames;
    const winRate =
      finishedGames > 0
        ? Math.round((completedGames / finishedGames) * 100)
        : 0;

    // Calculate total time played (only from completed games)
    const totalTimePlayed = games
      .filter((g) => g.status === GameStatus.COMPLETED)
      .reduce((sum, g) => sum + g.timeElapsed, 0);

    // Calculate per-difficulty stats
    const calculateDifficultyStats = (difficulty: string): DifficultyStats => {
      const diffGames = games.filter((g) => g.difficulty === difficulty);
      const completed = diffGames.filter(
        (g) => g.status === GameStatus.COMPLETED,
      );
      const failed = diffGames.filter((g) => g.status === GameStatus.FAILED);

      const completedTimes = completed
        .map((g) => g.timeElapsed)
        .filter((t) => t > 0);
      const bestTime =
        completedTimes.length > 0 ? Math.min(...completedTimes) : null;
      const avgTime =
        completedTimes.length > 0
          ? Math.round(
              completedTimes.reduce((a, b) => a + b, 0) / completedTimes.length,
            )
          : null;

      return {
        played: diffGames.length,
        completed: completed.length,
        failed: failed.length,
        bestTime,
        avgTime,
      };
    };

    // Calculate current streak (abandoned games also break the streak)
    let currentStreak = 0;
    for (const game of games) {
      if (game.status === GameStatus.COMPLETED) {
        currentStreak++;
      } else if (
        game.status === GameStatus.FAILED ||
        game.status === GameStatus.ABANDONED
      ) {
        break;
      }
      // Active games don't affect streak
    }

    // Get recent games (last 10)
    const recentGames: RecentGame[] = games.slice(0, 10).map((g) => ({
      id: g.id,
      difficulty: g.difficulty,
      timeElapsed: g.timeElapsed,
      mistakes: g.mistakes,
      status: g.status,
      startedAt: g.startedAt,
      completedAt: g.completedAt,
    }));

    return {
      totalGames,
      completedGames,
      failedGames,
      winRate,
      totalTimePlayed,
      currentStreak,
      easy: calculateDifficultyStats('easy'),
      normal: calculateDifficultyStats('normal'),
      hard: calculateDifficultyStats('hard'),
      recentGames,
    };
  }

  /**
   * Find all active games for a user
   */
  async findActiveGamesByUser(userId: string): Promise<Game[]> {
    return this.gameRepository.find({
      where: {
        userId,
        status: GameStatus.ACTIVE,
      },
    });
  }

  // ===================== TRIPOD GAME METHODS =====================

  /**
   * Create a new tripod game
   */
  async createTripodGame(
    userId: string,
    dto: CreateTripodGameDto,
  ): Promise<Game> {
    const gridSize = dto.gridSize || 7;

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(
        `User not found with ID: ${userId}. Please ensure you are authenticated.`,
      );
    }

    // Initialize empty puzzle state
    const initialState = Array.from({ length: gridSize }, () =>
      Array(gridSize).fill(0),
    );

    // Generate sample tripod dots for the puzzle
    const tripodDots = this.generateSampleTripodDots(gridSize);

    // Initialize borders
    const horizontalBorders = Array.from({ length: gridSize + 1 }, () =>
      Array(gridSize).fill(false),
    );
    const verticalBorders = Array.from({ length: gridSize }, () =>
      Array(gridSize + 1).fill(false),
    );

    const game = this.gameRepository.create({
      userId,
      gameMode: GameMode.TRIPOD,
      difficulty: Difficulty.NORMAL,
      gridSize,
      currentState: initialState,
      moveHistory: [],
      hintedCells: [],
      hintsUsed: 0,
      mistakes: 0,
      timeElapsed: 0,
      tripodData: {
        tripodDots,
        horizontalBorders,
        verticalBorders,
      },
      status: GameStatus.ACTIVE,
    });

    return this.gameRepository.save(game);
  }

  /**
   * Generate sample tripod dots grid
   */
  private generateSampleTripodDots(gridSize: number): boolean[][] {
    // Generate empty tripod dots grid - will be populated by sample puzzles
    return Array.from({ length: gridSize + 1 }, () =>
      Array(gridSize + 1).fill(false),
    );
  }

  /**
   * Update tripod game borders
   */
  async updateTripodBorders(
    gameId: string,
    borders: { horizontal: boolean[][]; vertical: boolean[][] },
  ): Promise<Game> {
    const game = await this.gameRepository.findOne({ where: { id: gameId } });
    if (!game) {
      throw new NotFoundException('Game not found');
    }
    if (game.gameMode !== GameMode.TRIPOD) {
      throw new BadRequestException('Not a tripod game');
    }
    if (game.status !== GameStatus.ACTIVE) {
      throw new BadRequestException('Game is not active');
    }

    game.tripodData = {
      ...game.tripodData,
      tripodDots:
        game.tripodData?.tripodDots ||
        this.generateSampleTripodDots(game.gridSize),
      horizontalBorders: borders.horizontal,
      verticalBorders: borders.vertical,
    };

    return this.gameRepository.save(game);
  }

  /**
   * Validate tripod game state
   */
  async validateTripodGame(
    gameId: string,
  ): Promise<{ isValid: boolean; errors: any[] }> {
    const game = await this.gameRepository.findOne({ where: { id: gameId } });
    if (!game) {
      throw new NotFoundException('Game not found');
    }
    if (game.gameMode !== GameMode.TRIPOD) {
      throw new BadRequestException('Not a tripod game');
    }

    const cells = game.currentState;
    const tripodData = game.tripodData;

    if (!tripodData) {
      throw new BadRequestException('Game has no tripod data');
    }

    const { tripodDots, horizontalBorders, verticalBorders } = tripodData;

    const result = this.tripodPuzzleService.validateTripodRules(
      { horizontal: horizontalBorders, vertical: verticalBorders },
      tripodDots,
      cells,
      game.gridSize,
    );

    return {
      isValid: result.isValid,
      errors: result.errors,
    };
  }

  /**
   * Toggle a single border in tripod game
   */
  async toggleTripodBorder(
    gameId: string,
    type: 'horizontal' | 'vertical',
    row: number,
    col: number,
  ): Promise<Game> {
    const game = await this.gameRepository.findOne({ where: { id: gameId } });
    if (!game) {
      throw new NotFoundException('Game not found');
    }
    if (game.gameMode !== GameMode.TRIPOD) {
      throw new BadRequestException('Not a tripod game');
    }
    if (game.status !== GameStatus.ACTIVE) {
      throw new BadRequestException('Game is not active');
    }

    if (!game.tripodData) {
      throw new BadRequestException('Game has no tripod data');
    }

    if (type === 'horizontal') {
      if (!game.tripodData.horizontalBorders[row]) {
        throw new BadRequestException('Invalid border position');
      }
      // Check column bounds
      if (col < 0 || col >= game.tripodData.horizontalBorders[row].length) {
        throw new BadRequestException('Invalid border column position');
      }
      game.tripodData.horizontalBorders[row][col] =
        !game.tripodData.horizontalBorders[row][col];
    } else {
      if (!game.tripodData.verticalBorders[row]) {
        throw new BadRequestException('Invalid border position');
      }
      // Check column bounds
      if (col < 0 || col >= game.tripodData.verticalBorders[row].length) {
        throw new BadRequestException('Invalid border column position');
      }
      game.tripodData.verticalBorders[row][col] =
        !game.tripodData.verticalBorders[row][col];
    }

    return this.gameRepository.save(game);
  }
}
