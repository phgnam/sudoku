import {
  IsOptional,
  IsString,
  IsObject,
  IsEnum,
  IsNumber,
  IsArray,
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
    description: 'Grid size for the tripod puzzle (default: 7)',
    example: 7,
    default: 7,
  })
  @IsOptional()
  @IsNumber()
  gridSize?: number;
}

export class UpdateBordersDto {
  @ApiProperty({
    description: 'Border state for horizontal and vertical borders',
    example: {
      horizontal: [[false, true], [true, false]],
      vertical: [[false, true], [true, false]],
    },
  })
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
  })
  @IsNumber()
  row: number;

  @ApiProperty({
    description: 'Column index of the border',
    example: 0,
  })
  @IsNumber()
  col: number;
}

export class ValidateTripodDto {
  @ApiProperty({
    description: 'Cell values grid for validation',
    example: [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
  })
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
    location: { row: number; col: number } | { vertexRow: number; vertexCol: number };
    message: string;
  }>;
}

