import { Injectable, BadRequestException } from '@nestjs/common';
import type { TripodBorders, Region } from '../../lib/tripod-region-detection';

export interface VertexValidation {
  isValid: boolean;
  borderCount: number;
  hasDot: boolean;
  error:
    | 'four_way_intersection'
    | 'tripod_mismatch'
    | 'missing_tripod_dot'
    | null;
}

export interface TripodValidationResult {
  isValid: boolean;
  errors: Array<{
    type: string;
    location:
      | { row: number; col: number }
      | { vertexRow: number; vertexCol: number };
    message: string;
  }>;
  regions: Region[];
}

/**
 * Service responsible for validating tripod puzzle rules
 * - Validates tripod dots (vertices with exactly 3 borders)
 * - Validates region sizes (each region must have gridSize cells)
 * - Validates sudoku rules (rows, columns, regions)
 */
@Injectable()
export class TripodValidationService {
  /**
   * Count borders meeting at a vertex
   */
  countBordersAtVertex(
    vertexRow: number,
    vertexCol: number,
    borders: TripodBorders,
    gridSize: number,
  ): number {
    // Validate vertex is within bounds (0 to gridSize inclusive)
    if (
      vertexRow < 0 ||
      vertexRow > gridSize ||
      vertexCol < 0 ||
      vertexCol > gridSize
    ) {
      throw new BadRequestException(
        `Vertex (${vertexRow}, ${vertexCol}) is out of bounds for grid size ${gridSize}`,
      );
    }

    let borderCount = 0;

    // Check horizontal border to the right
    if (vertexCol < gridSize && borders.horizontal[vertexRow]?.[vertexCol]) {
      borderCount++;
    }
    // Check horizontal border to the left
    if (vertexCol > 0 && borders.horizontal[vertexRow]?.[vertexCol - 1]) {
      borderCount++;
    }
    // Check vertical border below
    if (vertexRow < gridSize && borders.vertical[vertexRow]?.[vertexCol]) {
      borderCount++;
    }
    // Check vertical border above
    if (vertexRow > 0 && borders.vertical[vertexRow - 1]?.[vertexCol]) {
      borderCount++;
    }

    return borderCount;
  }

  /**
   * Validate a single vertex (tripod dot constraint)
   */
  validateVertex(
    vertexRow: number,
    vertexCol: number,
    borders: TripodBorders,
    tripodDots: boolean[][],
    gridSize: number,
  ): VertexValidation {
    const borderCount = this.countBordersAtVertex(
      vertexRow,
      vertexCol,
      borders,
      gridSize,
    );
    const hasDot = tripodDots[vertexRow]?.[vertexCol] || false;

    // Four-way intersection is always invalid
    if (borderCount === 4) {
      return {
        isValid: false,
        borderCount,
        hasDot,
        error: 'four_way_intersection',
      };
    }

    // If has tripod dot, must have exactly 3 borders
    if (hasDot && borderCount !== 3) {
      return {
        isValid: false,
        borderCount,
        hasDot,
        error: 'tripod_mismatch',
      };
    }

    // If has 3 borders, must have tripod dot
    if (borderCount === 3 && !hasDot) {
      return {
        isValid: false,
        borderCount,
        hasDot,
        error: 'missing_tripod_dot',
      };
    }

    return {
      isValid: true,
      borderCount,
      hasDot,
      error: null,
    };
  }

  /**
   * Find duplicate values in an array
   */
  private findDuplicates<T>(values: T[]): T[] {
    const seen = new Set<T>();
    const duplicates: T[] = [];
    values.forEach((v) => {
      if (seen.has(v)) {
        duplicates.push(v);
      }
      seen.add(v);
    });
    return duplicates;
  }

  /**
   * Validate region contains no duplicate numbers
   */
  validateRegionNumbers(
    region: Region,
    cells: number[][],
  ): { isValid: boolean; duplicates: number[] } {
    const values = region.cells
      .map(({ row, col }) => cells[row]?.[col])
      .filter((v) => v !== undefined && v !== null && v !== 0);

    const duplicates = this.findDuplicates(values);

    return {
      isValid: duplicates.length === 0,
      duplicates: [...new Set(duplicates)],
    };
  }
}

