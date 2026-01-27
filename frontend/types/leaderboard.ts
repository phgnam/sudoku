/**
 * Leaderboard Types
 * Types for the leaderboard feature API responses and filters
 */

export type Difficulty = "easy" | "normal" | "hard";
export type LeaderboardPeriod = "daily" | "weekly" | "monthly" | "allTime";

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  bestTime: number; // completion time in seconds
  gamesWon: number;
  isCurrentUser?: boolean;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  difficulty: string;
  period: string;
  total: number;
  userRank?: LeaderboardEntry;
}

export interface UserRankResponse {
  rank: number;
  bestTime: number;
  gamesWon: number;
  difficulty: string;
  period: string;
}

export interface LeaderboardFilters {
  difficulty: Difficulty;
  period: LeaderboardPeriod;
}

export const DIFFICULTY_OPTIONS: Difficulty[] = ["easy", "normal", "hard"];

export const PERIOD_OPTIONS: { value: LeaderboardPeriod; labelKey: string }[] =
  [
    { value: "daily", labelKey: "leaderboard.period.daily" },
    { value: "weekly", labelKey: "leaderboard.period.weekly" },
    { value: "monthly", labelKey: "leaderboard.period.monthly" },
    { value: "allTime", labelKey: "leaderboard.period.allTime" },
  ];

