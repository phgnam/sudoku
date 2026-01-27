import { IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum LeaderboardPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  ALL_TIME = 'allTime',
}

export enum LeaderboardDifficulty {
  EASY = 'easy',
  NORMAL = 'normal',
  HARD = 'hard',
}

export class LeaderboardQueryDto {
  @ApiPropertyOptional({
    enum: LeaderboardDifficulty,
    default: LeaderboardDifficulty.EASY,
    description: 'Filter by game difficulty',
  })
  @IsOptional()
  @IsEnum(LeaderboardDifficulty)
  difficulty?: LeaderboardDifficulty = LeaderboardDifficulty.EASY;

  @ApiPropertyOptional({
    enum: LeaderboardPeriod,
    default: LeaderboardPeriod.ALL_TIME,
    description: 'Filter by time period',
  })
  @IsOptional()
  @IsEnum(LeaderboardPeriod)
  period?: LeaderboardPeriod = LeaderboardPeriod.ALL_TIME;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 100,
    default: 50,
    description: 'Maximum number of entries to return',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}

