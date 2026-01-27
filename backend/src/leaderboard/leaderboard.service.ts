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
} from './dto';

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

    const results = await this.gameHistoryRepo.query(rawQuery, [
      difficulty,
      dateFilter.toISOString(),
      limit,
    ]);

    // Fetch usernames for results
    const userIds = results.map((r: any) => r.userId);
    let userMap = new Map<string, string>();

    if (userIds.length > 0) {
      const users = await this.userRepo
        .createQueryBuilder('user')
        .where('user.id IN (:...userIds)', { userIds })
        .getMany();
      userMap = new Map(users.map((u) => [u.id, u.username || 'Anonymous']));
    }

    // Map to response DTOs with rank
    const entries: LeaderboardEntryDto[] = results.map(
      (r: any, idx: number) => ({
        rank: idx + 1,
        userId: r.userId,
        username: userMap.get(r.userId) || 'Anonymous',
        bestTime: r.bestTime,
        gamesWon: Number(r.gamesWon),
        isCurrentUser: r.userId === currentUserId,
      }),
    );

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

    const userStats = await this.gameHistoryRepo.query(userStatsQuery, [
      userId,
      difficulty,
      dateFilter.toISOString(),
    ]);

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

    const rankResult = await this.gameHistoryRepo.query(rankQuery, [
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
}

