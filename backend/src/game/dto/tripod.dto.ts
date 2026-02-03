import {
  IsOptional,
  IsString,
  IsObject,
  IsEnum,
  IsArray,
  IsNotEmpty,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTripodGameDto {
  @ApiPropertyOptional({
    description: 'Optional puzzle ID to load a specific puzzle',
    example: 'puzzle-uuid-12345',
  })
  @IsOptional()
  @IsString()
  puzzleId?: string;

  @ApiPropertyOptional({
    description: 'Grid size for the tripod puzzle (7-9, default: 7)',
    example: 7,
    default: 7,
    minimum: 7,
    maximum: 9,
  })
  @IsOptional()
  @IsInt()
  @Min(7)
  @Max(9)
  gridSize?: number;

  @ApiPropertyOptional({
    description: 'Difficulty level (easy, medium, hard)',
    example: 'easy',
  })
  @IsOptional()
  @IsString()
  difficulty?: string;

  @ApiPropertyOptional({
    description: 'Sub-mode for tripod game (full, borders_only, sudoku_only)',
    enum: ['full', 'borders_only', 'sudoku_only'],
    example: 'full',
    default: 'full',
  })
  @IsOptional()
  @IsEnum(['full', 'borders_only', 'sudoku_only'])
  subMode?: 'full' | 'borders_only' | 'sudoku_only';
}

export class UpdateBordersDto {
  @ApiProperty({
    description: 'Border state for horizontal and vertical borders',
    example: {
      horizontal: [
        [false, true],
        [true, false],
      ],
      vertical: [
        [false, true],
        [true, false],
      ],
    },
  })
  @IsNotEmpty()
  @IsObject()
  borders: {
    horizontal: boolean[][];
    vertical: boolean[][];
  };
}

export class ToggleBorderDto {
  @ApiProperty({
    description: 'Type of border to toggle',
    enum: ['horizontal', 'vertical'],
    example: 'horizontal',
  })
  @IsEnum(['horizontal', 'vertical'])
  type: 'horizontal' | 'vertical';

  @ApiProperty({
    description: 'Row index of the border',
    example: 0,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  row: number;

  @ApiProperty({
    description: 'Column index of the border',
    example: 0,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  col: number;
}

export class ValidateTripodDto {
  @ApiProperty({
    description: 'Cell values grid for validation',
    example: [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ],
  })
  @IsNotEmpty()
  @IsArray()
  cells: number[][];
}

export class TripodValidationResponseDto {
  @ApiProperty({ description: 'Whether the puzzle state is valid' })
  isValid: boolean;

  @ApiProperty({
    description: 'List of validation errors',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        location: { type: 'object' },
        message: { type: 'string' },
      },
    },
  })
  errors: Array<{
    type: string;
    location:
      | { row: number; col: number }
      | { vertexRow: number; vertexCol: number };
    message: string;
  }>;
}
