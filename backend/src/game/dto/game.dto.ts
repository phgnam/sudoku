import { IsNotEmpty, IsNumber, Min, Max, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGameDto {
  @ApiProperty({
    description: 'Game difficulty level',
    enum: ['easy', 'normal', 'hard'],
    example: 'easy',
  })
  @IsNotEmpty()
  @IsString()
  difficulty: string; // 'easy' | 'normal' | 'hard'
}

export class MakeMoveDto {
  @ApiProperty({
    description: 'Row index (0-8)',
    minimum: 0,
    maximum: 8,
    example: 4,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(8)
  row: number;

  @ApiProperty({
    description: 'Column index (0-8)',
    minimum: 0,
    maximum: 8,
    example: 5,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(8)
  col: number;

  @ApiProperty({
    description: 'Value to place (0-9, where 0 clears the cell)',
    minimum: 0,
    maximum: 9,
    example: 7,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(9)
  value: number; // 0-9, 0 = clear cell
}

export class UpdateTimeDto {
  @ApiProperty({
    description: 'Time elapsed in seconds',
    minimum: 0,
    example: 120,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  timeElapsed: number; // in seconds
}

export class ApplyHintDto {
  @ApiProperty({
    description: 'Row index (0-8)',
    minimum: 0,
    maximum: 8,
    example: 2,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(8)
  row: number;

  @ApiProperty({
    description: 'Column index (0-8)',
    minimum: 0,
    maximum: 8,
    example: 3,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(8)
  col: number;

  @ApiProperty({
    description: 'Value to place',
    minimum: 1,
    maximum: 9,
    example: 5,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @Max(9)
  value: number;
}

// Dashboard stats response DTOs
export class DifficultyStatsDto {
  @ApiProperty({ description: 'Number of games played', example: 10 })
  played: number;

  @ApiProperty({ description: 'Number of games completed', example: 8 })
  completed: number;

  @ApiProperty({ description: 'Number of games failed', example: 2 })
  failed: number;

  @ApiPropertyOptional({
    description: 'Best completion time in seconds',
    example: 180,
    nullable: true,
  })
  bestTime: number | null;

  @ApiPropertyOptional({
    description: 'Average completion time in seconds',
    example: 240,
    nullable: true,
  })
  avgTime: number | null;
}

export class RecentGameDto {
  @ApiProperty({
    description: 'Game ID',
    example: 'game-uuid-12345',
  })
  id: string;

  @ApiProperty({
    description: 'Game difficulty',
    enum: ['easy', 'normal', 'hard'],
    example: 'normal',
  })
  difficulty: string;

  @ApiProperty({
    description: 'Time elapsed in seconds',
    example: 300,
  })
  timeElapsed: number;

  @ApiProperty({
    description: 'Number of mistakes made',
    example: 1,
  })
  mistakes: number;

  @ApiProperty({
    description: 'Game status',
    enum: ['active', 'completed', 'failed'],
    example: 'completed',
  })
  status: string;

  @ApiProperty({
    description: 'Game start timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  startedAt: Date;

  @ApiPropertyOptional({
    description: 'Game completion timestamp',
    example: '2024-01-15T10:35:00.000Z',
    nullable: true,
  })
  completedAt: Date | null;
}

export class DashboardStatsResponseDto {
  @ApiProperty({ description: 'Total number of games played', example: 25 })
  totalGames: number;

  @ApiProperty({ description: 'Total number of completed games', example: 20 })
  completedGames: number;

  @ApiProperty({ description: 'Total number of failed games', example: 5 })
  failedGames: number;

  @ApiProperty({
    description: 'Win rate percentage',
    example: 80,
    minimum: 0,
    maximum: 100,
  })
  winRate: number;

  @ApiProperty({
    description: 'Total time played in seconds',
    example: 3600,
  })
  totalTimePlayed: number;

  @ApiProperty({ description: 'Current winning streak', example: 5 })
  currentStreak: number;

  @ApiProperty({ description: 'Easy difficulty stats', type: DifficultyStatsDto })
  easy: DifficultyStatsDto;

  @ApiProperty({ description: 'Normal difficulty stats', type: DifficultyStatsDto })
  normal: DifficultyStatsDto;

  @ApiProperty({ description: 'Hard difficulty stats', type: DifficultyStatsDto })
  hard: DifficultyStatsDto;

  @ApiProperty({
    description: 'Recent games list',
    type: [RecentGameDto],
  })
  recentGames: RecentGameDto[];
}

export class GameResponseDto {
  @ApiProperty({ description: 'Game ID', example: 'game-uuid-12345' })
  id: string;

  @ApiProperty({ description: 'User ID', example: 'user-uuid-12345' })
  userId: string;

  @ApiProperty({
    description: 'Game difficulty',
    enum: ['easy', 'normal', 'hard'],
    example: 'normal',
  })
  difficulty: string;

  @ApiProperty({
    description: 'Current puzzle state (9x9 grid)',
    example: [[5, 3, 0, 0, 7, 0, 0, 0, 0], []],
  })
  puzzle: number[][];

  @ApiProperty({
    description: 'Solution (9x9 grid)',
    example: [[5, 3, 4, 6, 7, 8, 9, 1, 2], []],
  })
  solution: number[][];

  @ApiProperty({
    description: 'Current board state (9x9 grid)',
    example: [[5, 3, 0, 0, 7, 0, 0, 0, 0], []],
  })
  currentState: number[][];

  @ApiProperty({
    description: 'Game status',
    enum: ['active', 'completed', 'failed'],
    example: 'active',
  })
  status: string;

  @ApiProperty({ description: 'Number of mistakes', example: 1 })
  mistakes: number;

  @ApiProperty({ description: 'Number of hints used', example: 0 })
  hintsUsed: number;

  @ApiProperty({ description: 'Time elapsed in seconds', example: 120 })
  timeElapsed: number;

  @ApiProperty({
    description: 'Game start timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  startedAt: Date;

  @ApiPropertyOptional({
    description: 'Game completion timestamp',
    nullable: true,
  })
  completedAt: Date | null;
}

export class MoveResponseDto {
  @ApiProperty({ description: 'Whether the move was correct', example: true })
  isCorrect: boolean;

  @ApiProperty({ description: 'Updated game state', type: GameResponseDto })
  game: GameResponseDto;
}

export class HintResponseDto {
  @ApiProperty({ description: 'Row index of the hint cell', example: 2 })
  row: number;

  @ApiProperty({ description: 'Column index of the hint cell', example: 3 })
  col: number;

  @ApiProperty({ description: 'Correct value for the cell', example: 7 })
  value: number;

  @ApiProperty({
    description: 'Explanation of the hint reasoning',
    example: 'This cell can only be 7 because...',
  })
  explanation: string;
}

// Legacy interfaces (kept for backward compatibility)
export interface DifficultyStats {
  played: number;
  completed: number;
  failed: number;
  bestTime: number | null;
  avgTime: number | null;
}

export interface RecentGame {
  id: string;
  difficulty: string;
  timeElapsed: number;
  mistakes: number;
  status: string;
  startedAt: Date;
  completedAt: Date | null;
}

export interface DashboardStatsResponse {
  totalGames: number;
  completedGames: number;
  failedGames: number;
  winRate: number;
  totalTimePlayed: number;
  currentStreak: number;
  easy: DifficultyStats;
  normal: DifficultyStats;
  hard: DifficultyStats;
  recentGames: RecentGame[];
}
