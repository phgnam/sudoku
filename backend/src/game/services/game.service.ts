import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Game,
  GameStatus,
  Move,
  User,
  Puzzle,
  GameHistory,
} from '../../database/entities';
import { SudokuValidatorService } from './sudoku-validator.service';
import { HintService } from './hint.service';
import {
  DashboardStatsResponse,
  DifficultyStats,
  RecentGame,
} from '../dto/game.dto';

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
  ) {}

  // Create a new game
  async createGame(userId: string, difficulty: string) {
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
      where: { difficulty: difficulty as any },
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

  // Make a move
  async makeMove(gameId: string, row: number, col: number, value: number, timeElapsed?: number) {
    const game = await this.getGame(gameId);

    if (game.status !== GameStatus.ACTIVE) {
      throw new Error('Game is not active');
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

      // Update user stats
      await this.updateUserStats(game.userId, game.difficulty);

      // Create game history record for leaderboard
      await this.createGameHistory(game);
    }

    return this.gameRepository.save(game);
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
      throw new Error('No moves to undo (all remaining moves are on hinted cells)');
    }

    const lastMove = game.moveHistory.splice(lastMoveIndex, 1)[0];
    game.currentState[lastMove.row][lastMove.col] = lastMove.previousValue;

    return this.gameRepository.save(game);
  }

  // Apply hint value to game state (without creating a move in history)
  async applyHint(gameId: string, row: number, col: number, value: number, timeElapsed?: number) {
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
      game.status = GameStatus.COMPLETED;
      game.completedAt = new Date();

      // Update user stats
      await this.updateUserStats(game.userId, game.difficulty);

      // Create game history record for leaderboard
      await this.createGameHistory(game);
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
    const abandonedGames = games.filter(
      (g) => g.status === GameStatus.ABANDONED,
    ).length;
    // Calculate win rate based on finished games (completed + failed), excluding active and abandoned
    const finishedGames = completedGames + failedGames;
    const winRate =
      finishedGames > 0 ? Math.round((completedGames / finishedGames) * 100) : 0;

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

      const completedTimes = completed.map((g) => g.timeElapsed).filter((t) => t > 0);
      const bestTime = completedTimes.length > 0 ? Math.min(...completedTimes) : null;
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
      } else if (game.status === GameStatus.FAILED || game.status === GameStatus.ABANDONED) {
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
}
