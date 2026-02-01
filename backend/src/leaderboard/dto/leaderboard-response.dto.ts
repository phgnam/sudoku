import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LeaderboardEntryDto {
  @ApiProperty({ example: 1, description: 'Player rank position' })
  rank: number;

  @ApiProperty({ example: 'user-uuid-123', description: 'User ID' })
  userId: string;

  @ApiProperty({ example: 'PlayerOne', description: 'Username' })
  username: string;

  @ApiProperty({
    description: 'Best completion time in seconds',
    example: 180,
  })
  bestTime: number;

  @ApiProperty({ example: 15, description: 'Total games won' })
  gamesWon: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether this entry is the current user',
  })
  isCurrentUser?: boolean;
}

export class LeaderboardResponseDto {
  @ApiProperty({
    type: [LeaderboardEntryDto],
    description: 'List of leaderboard entries',
  })
  entries: LeaderboardEntryDto[];

  @ApiProperty({ example: 'easy', description: 'Difficulty filter applied' })
  difficulty: string;

  @ApiProperty({ example: 'allTime', description: 'Period filter applied' })
  period: string;

  @ApiProperty({ example: 50, description: 'Total entries returned' })
  total: number;

  @ApiPropertyOptional({
    type: LeaderboardEntryDto,
    description:
      "Current user's rank (if authenticated and not in top entries)",
  })
  userRank?: LeaderboardEntryDto;
}

export class UserRankResponseDto {
  @ApiProperty({ example: 42, description: 'User rank position' })
  rank: number;

  @ApiProperty({ example: 180, description: 'Best completion time in seconds' })
  bestTime: number;

  @ApiProperty({ example: 15, description: 'Total games won' })
  gamesWon: number;

  @ApiProperty({ example: 'easy', description: 'Difficulty' })
  difficulty: string;

  @ApiProperty({ example: 'allTime', description: 'Period' })
  period: string;
}

// ============ Competitive Leaderboard DTOs ============

export class CompetitiveLeaderboardEntryDto {
  @ApiProperty({ example: 1, description: 'Rank position' })
  rank: number;

  @ApiProperty({ example: 'user-uuid-123', description: 'User ID' })
  userId: string;

  @ApiProperty({ example: 'PlayerOne', description: 'Username' })
  username: string;

  @ApiProperty({ example: 1250, description: 'ELO rating' })
  rating: number;

  @ApiProperty({ example: 50, description: 'Total competitive matches played' })
  competitiveGames: number;

  @ApiProperty({ example: 30, description: 'Competitive wins' })
  competitiveWins: number;

  @ApiProperty({ example: 5, description: 'Competitive draws' })
  competitiveDraws: number;

  @ApiPropertyOptional({
    example: 60,
    description: 'Win rate percentage',
  })
  winRate?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether this entry is the current user',
  })
  isCurrentUser?: boolean;
}

export class CompetitiveLeaderboardResponseDto {
  @ApiProperty({
    type: [CompetitiveLeaderboardEntryDto],
    description: 'List of competitive leaderboard entries',
  })
  entries: CompetitiveLeaderboardEntryDto[];

  @ApiProperty({ example: 50, description: 'Total entries returned' })
  total: number;

  @ApiPropertyOptional({
    type: CompetitiveLeaderboardEntryDto,
    description:
      "Current user's rank (if authenticated and not in top entries)",
  })
  userRank?: CompetitiveLeaderboardEntryDto;
}

export class CompetitiveStatsDto {
  @ApiProperty({ example: 1250, description: 'Current ELO rating' })
  rating: number;

  @ApiProperty({ example: 50, description: 'Total competitive games' })
  competitiveGames: number;

  @ApiProperty({ example: 30, description: 'Competitive wins' })
  competitiveWins: number;

  @ApiProperty({ example: 5, description: 'Competitive draws' })
  competitiveDraws: number;

  @ApiProperty({ example: 15, description: 'Competitive losses' })
  competitiveLosses: number;

  @ApiProperty({ example: 60, description: 'Win rate percentage' })
  winRate: number;

  @ApiPropertyOptional({
    example: 42,
    description: 'Rank position (if available)',
  })
  rank?: number;
}
