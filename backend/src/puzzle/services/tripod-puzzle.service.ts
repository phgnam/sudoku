import { Injectable } from '@nestjs/common';

export interface TripodBorders {
  horizontal: boolean[][];
  vertical: boolean[][];
}

export interface Region {
  id: number;
  cells: Array<{ row: number; col: number }>;
  size: number;
}

export interface VertexValidation {
  isValid: boolean;
  borderCount: number;
  hasDot: boolean;
  error: 'four_way_intersection' | 'tripod_mismatch' | 'missing_tripod_dot' | null;
}

export interface TripodValidationResult {
  isValid: boolean;
  errors: Array<{
    type: string;
    location: { row: number; col: number } | { vertexRow: number; vertexCol: number };
    message: string;
  }>;
  regions: Region[];
}

@Injectable()
export class TripodPuzzleService {
  /**
   * Initialize empty borders for a given grid size
   */
  initializeBorders(gridSize: number): TripodBorders {
    // horizontal: gridSize+1 rows, gridSize columns (borders between rows)
    const horizontal = Array(gridSize + 1)
      .fill(null)
      .map(() => Array(gridSize).fill(false));

    // vertical: gridSize rows, gridSize+1 columns (borders between columns)
    const vertical = Array(gridSize)
      .fill(null)
      .map(() => Array(gridSize + 1).fill(false));

    return { horizontal, vertical };
  }

  /**
   * Initialize tripod dots grid (all false initially)
   */
  initializeTripodDots(gridSize: number): boolean[][] {
    return Array(gridSize + 1)
      .fill(null)
      .map(() => Array(gridSize + 1).fill(false));
  }

  /**
   * Detect connected regions using BFS
   */
  detectRegions(borders: TripodBorders, gridSize: number): Region[] {
    const visited: boolean[][] = Array(gridSize)
      .fill(null)
      .map(() => Array(gridSize).fill(false));

    const regions: Region[] = [];
    let regionId = 0;

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (!visited[r][c]) {
          const cells = this.bfs(r, c, borders, visited, gridSize);
          regions.push({
            id: regionId++,
            cells,
            size: cells.length,
          });
        }
      }
    }

    return regions;
  }

  private bfs(
    startR: number,
    startC: number,
    borders: TripodBorders,
    visited: boolean[][],
    gridSize: number,
  ): Array<{ row: number; col: number }> {
    const queue: Array<{ row: number; col: number }> = [{ row: startR, col: startC }];
    const cells: Array<{ row: number; col: number }> = [];

    while (queue.length > 0) {
      const { row, col } = queue.shift()!;

      if (visited[row][col]) continue;
      visited[row][col] = true;
      cells.push({ row, col });

      // Up: check horizontal border at [row][col]
      if (row > 0 && !borders.horizontal[row][col] && !visited[row - 1][col]) {
        queue.push({ row: row - 1, col });
      }
      // Down: check horizontal border at [row + 1][col]
      if (row < gridSize - 1 && !borders.horizontal[row + 1][col] && !visited[row + 1][col]) {
        queue.push({ row: row + 1, col });
      }
      // Left: check vertical border at [row][col]
      if (col > 0 && !borders.vertical[row][col] && !visited[row][col - 1]) {
        queue.push({ row, col: col - 1 });
      }
      // Right: check vertical border at [row][col + 1]
      if (col < gridSize - 1 && !borders.vertical[row][col + 1] && !visited[row][col + 1]) {
        queue.push({ row, col: col + 1 });
      }
    }

    return cells;
  }

  /**
   * Count borders meeting at a vertex
   */
  countBordersAtVertex(
    vertexRow: number,
    vertexCol: number,
    borders: TripodBorders,
    gridSize: number,
  ): number {
    let count = 0;

    // Horizontal border to the right of vertex
    if (vertexCol < gridSize && borders.horizontal[vertexRow]?.[vertexCol]) {
      count++;
    }
    // Horizontal border to the left of vertex
    if (vertexCol > 0 && borders.horizontal[vertexRow]?.[vertexCol - 1]) {
      count++;
    }
    // Vertical border below vertex
    if (vertexRow < gridSize && borders.vertical[vertexRow]?.[vertexCol]) {
      count++;
    }
    // Vertical border above vertex
    if (vertexRow > 0 && borders.vertical[vertexRow - 1]?.[vertexCol]) {
      count++;
    }

    return count;
  }

  /**
   * Validate a single vertex
   */
  validateVertex(
    vertexRow: number,
    vertexCol: number,
    borders: TripodBorders,
    tripodDots: boolean[][],
    gridSize: number,
  ): VertexValidation {
    const borderCount = this.countBordersAtVertex(vertexRow, vertexCol, borders, gridSize);
    const hasDot = tripodDots[vertexRow]?.[vertexCol] ?? false;

    let error: VertexValidation['error'] = null;
    let isValid = true;

    if (borderCount === 4) {
      error = 'four_way_intersection';
      isValid = false;
    } else if (hasDot && borderCount !== 3) {
      error = 'tripod_mismatch';
      isValid = false;
    } else if (!hasDot && borderCount === 3) {
      error = 'missing_tripod_dot';
      isValid = false;
    }

    return { isValid, borderCount, hasDot, error };
  }

  /**
   * Validate entire tripod puzzle
   */
  validateTripodRules(
    borders: TripodBorders,
    tripodDots: boolean[][],
    cells: number[][],
    gridSize: number,
  ): TripodValidationResult {
    const errors: TripodValidationResult['errors'] = [];

    // 1. Detect regions
    const regions = this.detectRegions(borders, gridSize);

    // 2. Validate region sizes
    regions.forEach((region) => {
      if (region.size !== gridSize) {
        errors.push({
          type: 'region_size',
          location: region.cells[0],
          message: `Region has ${region.size} cells, needs ${gridSize}`,
        });
      }
    });

    // 3. Validate all vertices
    for (let r = 0; r <= gridSize; r++) {
      for (let c = 0; c <= gridSize; c++) {
        const validation = this.validateVertex(r, c, borders, tripodDots, gridSize);
        if (!validation.isValid && validation.error) {
          errors.push({
            type: validation.error,
            location: { vertexRow: r, vertexCol: c },
            message: validation.error.replace(/_/g, ' '),
          });
        }
      }
    }

    // 4. Validate Sudoku rules per region
    regions.forEach((region) => {
      const values = region.cells
        .map(({ row, col }) => cells[row]?.[col] ?? 0)
        .filter((v) => v !== 0);

      const seen = new Set<number>();
      const duplicates: number[] = [];

      values.forEach((v) => {
        if (seen.has(v)) {
          duplicates.push(v);
        }
        seen.add(v);
      });

      if (duplicates.length > 0) {
        errors.push({
          type: 'sudoku_duplicate',
          location: region.cells[0],
          message: `Duplicate values in region: ${[...new Set(duplicates)].join(', ')}`,
        });
      }
    });

    // 5. Validate rows
    for (let r = 0; r < gridSize; r++) {
      const rowValues = (cells[r] ?? []).filter((v) => v !== 0);
      const seen = new Set<number>();

      rowValues.forEach((v) => {
        if (seen.has(v)) {
          errors.push({
            type: 'row_duplicate',
            location: { row: r, col: 0 },
            message: `Duplicate in row ${r + 1}`,
          });
        }
        seen.add(v);
      });
    }

    // 6. Validate columns
    for (let c = 0; c < gridSize; c++) {
      const colValues = cells.map((row) => row?.[c] ?? 0).filter((v) => v !== 0);
      const seen = new Set<number>();

      colValues.forEach((v) => {
        if (seen.has(v)) {
          errors.push({
            type: 'col_duplicate',
            location: { row: 0, col: c },
            message: `Duplicate in column ${c + 1}`,
          });
        }
        seen.add(v);
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      regions,
    };
  }

  /**
   * Check if puzzle is complete (all cells filled and valid)
   */
  isPuzzleComplete(
    borders: TripodBorders,
    tripodDots: boolean[][],
    cells: number[][],
    gridSize: number,
  ): boolean {
    // Check all cells are filled
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (!cells[r]?.[c] || cells[r][c] === 0) {
          return false;
        }
      }
    }

    // Validate rules
    const validation = this.validateTripodRules(borders, tripodDots, cells, gridSize);
    return validation.isValid;
  }
}
