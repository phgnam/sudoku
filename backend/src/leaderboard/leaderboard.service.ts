import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameHistory, User } from '../database/entities';
import {
  LeaderboardQueryDto,
  LeaderboardPeriod,
  LeaderboardDifficulty,
  LeaderboardEntryDto,
  LeaderboardResponseDto,
  UserRankResponseDto,
  CompetitiveLeaderboardEntryDto,
  CompetitiveLeaderboardResponseDto,
  CompetitiveStatsDto,
} from './dto';

// Tripod DTOs (will use GameHistory with gameMode filter in future)
export interface TripodLeaderboardEntryDto {
  rank: number;
  userId: string;
  username: string;
  bestTime: number;
  gamesWon: number;
  isCurrentUser?: boolean;
}

export interface TripodLeaderboardResponseDto {
  entries: TripodLeaderboardEntryDto[];
  mode: string;
  period: LeaderboardPeriod;
  total: number;
  userRank?: TripodLeaderboardEntryDto;
}

// Result interfaces for raw SQL queries
interface LeaderboardRawResult {
  userId: string;
  bestTime: number;
  gamesWon: number;
}

interface UserStatsResult {
  bestTime: number | null;
  gamesWon: number;
}

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(GameHistory)
    private gameHistoryRepo: Repository<GameHistory>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  /**
   * Get leaderboard rankings filtered by difficulty and period
   * Only includes registered users (with username)
   */
  async getLeaderboard(
    query: LeaderboardQueryDto,
    currentUserId?: string,
  ): Promise<LeaderboardResponseDto> {
    const difficulty = query.difficulty ?? LeaderboardDifficulty.EASY;
    const period = query.period ?? LeaderboardPeriod.ALL_TIME;
    const limit = query.limit ?? 50;
    const dateFilter = this.getDateFilter(period);

    // Raw SQL for aggregation (SQLite compatible)
    // Filter: Only users with username (registered users)
    const rawQuery = `
      SELECT 
        gh.userId,
        MIN(gh.timeElapsed) as bestTime,
        COUNT(*) as gamesWon
      FROM game_history gh
      INNER JOIN users u ON gh.userId = u.id
      WHERE gh.difficulty = ?
        AND gh.completedAt >= ?
        AND u.username IS NOT NULL
        AND u.username != ''
      GROUP BY gh.userId
      ORDER BY bestTime ASC
      LIMIT ?
    `;

    const results: LeaderboardRawResult[] = await this.gameHistoryRepo.query(
      rawQuery,
      [difficulty, dateFilter.toISOString(), limit],
    );

    // Fetch usernames for results
    const userIds = results.map((r) => r.userId);
    let userMap = new Map<string, string>();

    if (userIds.length > 0) {
      const users = await this.userRepo
        .createQueryBuilder('user')
        .where('user.id IN (:...userIds)', { userIds })
        .getMany();
      userMap = new Map(users.map((u) => [u.id, u.username || 'Anonymous']));
    }

    // Map to response DTOs with rank
    const entries: LeaderboardEntryDto[] = results.map((r, idx) => ({
      rank: idx + 1,
      userId: r.userId,
      username: userMap.get(r.userId) || 'Anonymous',
      bestTime: r.bestTime,
      gamesWon: Number(r.gamesWon),
      isCurrentUser: r.userId === currentUserId,
    }));

    // Get current user rank if authenticated and not in top results
    let userRank: LeaderboardEntryDto | undefined;
    const userInEntries = entries.find((e) => e.isCurrentUser);

    if (!userInEntries && currentUserId) {
      const rankEntry = await this.getUserRankEntry(
        currentUserId,
        difficulty,
        dateFilter,
      );
      userRank = rankEntry ?? undefined;
    }

    return {
      entries,
      difficulty,
      period,
      total: entries.length,
      userRank,
    };
  }

  /**
   * Get current user's rank for a specific difficulty and period
   */
  async getUserRank(
    userId: string,
    difficulty?: LeaderboardDifficulty,
    period?: LeaderboardPeriod,
  ): Promise<UserRankResponseDto | null> {
    const resolvedDifficulty = difficulty ?? LeaderboardDifficulty.EASY;
    const resolvedPeriod = period ?? LeaderboardPeriod.ALL_TIME;
    const dateFilter = this.getDateFilter(resolvedPeriod);
    const entry = await this.getUserRankEntry(
      userId,
      resolvedDifficulty,
      dateFilter,
    );

    if (!entry) {
      return null;
    }

    return {
      rank: entry.rank,
      bestTime: entry.bestTime,
      gamesWon: entry.gamesWon,
      difficulty: resolvedDifficulty,
      period: resolvedPeriod,
    };
  }

  /**
   * Get user's rank entry with position calculation
   */
  private async getUserRankEntry(
    userId: string,
    difficulty: string,
    dateFilter: Date,
  ): Promise<LeaderboardEntryDto | null> {
    // First get user's best time
    const userStatsQuery = `
      SELECT 
        MIN(gh.timeElapsed) as bestTime,
        COUNT(*) as gamesWon
      FROM game_history gh
      WHERE gh.userId = ?
        AND gh.difficulty = ?
        AND gh.completedAt >= ?
    `;

    const userStats: UserStatsResult[] = await this.gameHistoryRepo.query(
      userStatsQuery,
      [userId, difficulty, dateFilter.toISOString()],
    );

    if (!userStats[0] || userStats[0].bestTime === null) {
      return null;
    }

    const { bestTime, gamesWon } = userStats[0];

    // Count how many users have better time (lower = better)
    const rankQuery = `
      SELECT COUNT(DISTINCT gh.userId) as betterCount
      FROM game_history gh
      INNER JOIN users u ON gh.userId = u.id
      WHERE gh.difficulty = ?
        AND gh.completedAt >= ?
        AND u.username IS NOT NULL
        AND u.username != ''
      GROUP BY gh.userId
      HAVING MIN(gh.timeElapsed) < ?
    `;

    const rankResult: unknown[] = await this.gameHistoryRepo.query(rankQuery, [
      difficulty,
      dateFilter.toISOString(),
      bestTime,
    ]);

    const rank = rankResult.length + 1;

    // Get username
    const user = await this.userRepo.findOne({ where: { id: userId } });

    return {
      rank,
      userId,
      username: user?.username || 'Anonymous',
      bestTime,
      gamesWon: Number(gamesWon),
      isCurrentUser: true,
    };
  }

  /**
   * Calculate date filter based on period
   */
  private getDateFilter(period: LeaderboardPeriod): Date {
    const now = new Date();

    switch (period) {
      case LeaderboardPeriod.DAILY:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case LeaderboardPeriod.WEEKLY:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case LeaderboardPeriod.MONTHLY:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case LeaderboardPeriod.ALL_TIME:
      default:
        return new Date(0); // Beginning of time
    }
  }

  // ============ Competitive Leaderboard Methods ============

  /**
   * Get competitive leaderboard ranked by ELO rating
   */
  async getCompetitiveLeaderboard(
    limit: number = 50,
    currentUserId?: string,
  ): Promise<CompetitiveLeaderboardResponseDto> {
    // Get top players by rating who have played at least 1 competitive game
    const users = await this.userRepo
      .createQueryBuilder('user')
      .where('user.competitiveGames > 0')
      .andWhere('user.username IS NOT NULL')
      .andWhere("user.username != ''")
      .orderBy('user.rating', 'DESC')
      .limit(limit)
      .getMany();

    const entries: CompetitiveLeaderboardEntryDto[] = users.map((user, idx) => {
      const winRate =
        user.competitiveGames > 0
          ? Math.round((user.competitiveWins / user.competitiveGames) * 100)
          : 0;

      return {
        rank: idx + 1,
        userId: user.id,
        username: user.username || 'Anonymous',
        rating: user.rating,
        competitiveGames: user.competitiveGames,
        competitiveWins: user.competitiveWins,
        competitiveDraws: user.competitiveDraws,
        winRate,
        isCurrentUser: user.id === currentUserId,
      };
    });

    // Get current user rank if not in top results
    let userRank: CompetitiveLeaderboardEntryDto | undefined;
    const userInEntries = entries.find((e) => e.isCurrentUser);

    if (!userInEntries && currentUserId) {
      userRank = await this.getCompetitiveUserRankEntry(currentUserId);
    }

    return {
      entries,
      total: entries.length,
      userRank,
    };
  }

  /**
   * Get user's competitive stats including rank
   */
  async getCompetitiveStats(
    userId: string,
  ): Promise<CompetitiveStatsDto | null> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) return null;

    const losses =
      user.competitiveGames - user.competitiveWins - user.competitiveDraws;
    const winRate =
      user.competitiveGames > 0
        ? Math.round((user.competitiveWins / user.competitiveGames) * 100)
        : 0;

    // Calculate rank
    let rank: number | undefined;
    if (user.competitiveGames > 0) {
      const higherRatedCount = await this.userRepo
        .createQueryBuilder('user')
        .where('user.competitiveGames > 0')
        .andWhere('user.rating > :rating', { rating: user.rating })
        .andWhere('user.username IS NOT NULL')
        .andWhere("user.username != ''")
        .getCount();
      rank = higherRatedCount + 1;
    }

    return {
      rating: user.rating,
      competitiveGames: user.competitiveGames,
      competitiveWins: user.competitiveWins,
      competitiveDraws: user.competitiveDraws,
      competitiveLosses: losses,
      winRate,
      rank,
    };
  }

  /**
   * Get user's competitive rank entry
   */
  private async getCompetitiveUserRankEntry(
    userId: string,
  ): Promise<CompetitiveLeaderboardEntryDto | undefined> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || user.competitiveGames === 0) return undefined;

    // Count users with higher rating
    const higherRatedCount = await this.userRepo
      .createQueryBuilder('user')
      .where('user.competitiveGames > 0')
      .andWhere('user.rating > :rating', { rating: user.rating })
      .andWhere('user.username IS NOT NULL')
      .andWhere("user.username != ''")
      .getCount();

    const winRate =
      user.competitiveGames > 0
        ? Math.round((user.competitiveWins / user.competitiveGames) * 100)
        : 0;

    return {
      rank: higherRatedCount + 1,
      userId: user.id,
      username: user.username || 'Anonymous',
      rating: user.rating,
      competitiveGames: user.competitiveGames,
      competitiveWins: user.competitiveWins,
      competitiveDraws: user.competitiveDraws,
      winRate,
      isCurrentUser: true,
    };
  }

  // ============ Tripod Leaderboard Methods ============
  // NOTE: Tripod leaderboard will use GameHistory with gameMode='tripod' filter
  // This will be implemented when tripod game completion saves to GameHistory

  /**
   * Get tripod leaderboard - placeholder
   * TODO: Implement using GameHistory with gameMode='tripod' filter
   */
  getTripodLeaderboard(
    mode: string = 'full',
    period: LeaderboardPeriod = LeaderboardPeriod.ALL_TIME,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _limit = 50,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _currentUserId?: string,
  ): TripodLeaderboardResponseDto {
    // Placeholder - return empty leaderboard until tripod games save to GameHistory
    return {
      entries: [],
      mode,
      period,
      total: 0,
      userRank: undefined,
    };
  }
}
