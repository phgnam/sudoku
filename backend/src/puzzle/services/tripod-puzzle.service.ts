import { Injectable, BadRequestException } from '@nestjs/common';
import { detectRegions } from '../../lib/tripod-region-detection';
import {
  createEmptyBorders,
  addOuterBorders,
} from '../../lib/tripod-border-utils';
import type {
  TripodBorders,
  Region,
} from '../../lib/tripod-region-detection';
import { TripodValidationService } from './tripod-validation.service';
import { TripodRegionService } from './tripod-region.service';
import { TripodBorderService } from './tripod-border.service';
import { LatinSquareGeneratorService } from './latin-square-generator.service';

// Re-export types for backward compatibility
export type { TripodBorders, Region };

// Re-export from validation service
export type { VertexValidation, TripodValidationResult } from './tripod-validation.service';

/**
 * Main orchestrator service for Tripod puzzle operations
 * Delegates to specialized services for validation, regions, borders, and generation
 */
@Injectable()
export class TripodPuzzleService {
  private readonly MIN_GRID_SIZE = 7;
  private readonly MAX_GRID_SIZE = 9;

  constructor(
    private readonly validationService: TripodValidationService,
    private readonly regionService: TripodRegionService,
    private readonly borderService: TripodBorderService,
  ) {}

  /**
   * Validate grid size is within acceptable range
   */
  private validateGridSize(gridSize: number): void {
    this.borderService.validateGridSize(gridSize);
  }

  /**
   * Initialize empty borders for a given grid size
   * @deprecated Use borderService.initializeBorders() instead
   */
  initializeBorders(gridSize: number): TripodBorders {
    return this.borderService.initializeBorders(gridSize);
  }

  /**
   * Initialize tripod dots grid (all false initially)
   */
  initializeTripodDots(gridSize: number): boolean[][] {
    return this.borderService.initializeTripodDots(gridSize);
  }

  /**
   * Detect connected regions using BFS
   * @deprecated Use regionService.detectRegions() instead
   */
  detectRegions(borders: TripodBorders, gridSize: number): Region[] {
    return this.regionService.detectRegions(borders, gridSize);
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
    return this.validationService.countBordersAtVertex(
      vertexRow,
      vertexCol,
      borders,
      gridSize,
    );
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
  ): import('./tripod-validation.service').VertexValidation {
    return this.validationService.validateVertex(
      vertexRow,
      vertexCol,
      borders,
      tripodDots,
      gridSize,
    );
  }

  /**
   * Validate entire tripod puzzle
   */
  validateTripodRules(
    borders: TripodBorders,
    tripodDots: boolean[][],
    cells: number[][],
    gridSize: number,
  ): import('./tripod-validation.service').TripodValidationResult {
    this.validateGridSize(gridSize);

    // Validate inputs are not null/undefined
    if (!borders || !tripodDots || !cells) {
      throw new BadRequestException(
        'Borders, tripodDots, and cells are required',
      );
    }

    const errors: import('./tripod-validation.service').TripodValidationResult['errors'] = [];

    // 1. Detect regions
    const regions = this.detectRegions(borders, gridSize);

    // 2. Validate region count matches gridSize
    if (regions.length !== gridSize) {
      errors.push({
        type: 'region_count_mismatch',
        location: { row: 0, col: 0 },
        message: `Expected ${gridSize} regions, found ${regions.length}`,
      });
    }

    // 3. Validate region sizes
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
        const validation = this.validateVertex(
          r,
          c,
          borders,
          tripodDots,
          gridSize,
        );
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
      const colValues = cells
        .map((row) => row?.[c] ?? 0)
        .filter((v) => v !== 0);
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
    const validation = this.validateTripodRules(
      borders,
      tripodDots,
      cells,
      gridSize,
    );
    return validation.isValid;
  }

  // ============================================================
  // PUZZLE GENERATION METHODS
  // ============================================================

  /**
   * Generate a complete valid Latin square for a given grid size
   * Uses backtracking algorithm similar to regular Sudoku
   */
  generateLatinSquare(gridSize: number): number[][] {
    this.validateGridSize(gridSize);

    const grid: number[][] = Array.from({ length: gridSize }, () =>
      Array.from({ length: gridSize }, () => 0),
    );

    this.fillLatinSquare(grid, gridSize);
    return grid;
  }

  private fillLatinSquare(grid: number[][], gridSize: number): boolean {
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        if (grid[row][col] === 0) {
          const numbers = this.shuffleArray(
            Array.from({ length: gridSize }, (_, i) => i + 1),
          );

          for (const num of numbers) {
            if (this.isLatinSquareValid(grid, row, col, num, gridSize)) {
              grid[row][col] = num;

              if (this.fillLatinSquare(grid, gridSize)) {
                return true;
              }

              grid[row][col] = 0;
            }
          }

          return false;
        }
      }
    }
    return true;
  }

  private isLatinSquareValid(
    grid: number[][],
    row: number,
    col: number,
    num: number,
    gridSize: number,
  ): boolean {
    // Check row
    for (let c = 0; c < gridSize; c++) {
      if (grid[row][c] === num) return false;
    }

    // Check column
    for (let r = 0; r < gridSize; r++) {
      if (grid[r][col] === num) return false;
    }

    return true;
  }

  /**
   * Fisher-Yates shuffle algorithm
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Generate a valid tripod dot pattern
   * Dots are placed at vertices and exactly 3 borders must meet there
   */
  generateTripodDotPattern(gridSize: number): {
    tripodDots: boolean[][];
    borders: TripodBorders;
  } {
    this.validateGridSize(gridSize);

    // Start with empty structures
    const tripodDots = this.initializeTripodDots(gridSize);
    const borders = this.initializeBorders(gridSize);

    // Add outer border (always present) - using imported utility
    addOuterBorders(borders, gridSize);

    // Generate internal tripod structure
    // Use a pattern-based approach that guarantees valid regions
    this.generateInternalTripodPattern(tripodDots, borders, gridSize);

    return { tripodDots, borders };
  }

  /**
   * @deprecated Private method removed - use addOuterBorders from tripod-border-utils
   * Keeping stub for backward compatibility during migration
   */
  private addOuterBorders(borders: TripodBorders, gridSize: number): void {
    addOuterBorders(borders, gridSize);
  }

  private generateInternalTripodPattern(
    tripodDots: boolean[][],
    borders: TripodBorders,
    gridSize: number,
  ): void {
    // For a 7x7 grid, we need exactly 7 regions of 7 cells each
    // Use a diamond/cross pattern that creates balanced regions

    // Place tripod dots in a symmetric pattern
    // Pattern 1: Diamond shape (similar to sample puzzles)
    const dotPositions = this.calculateDiamondPattern(gridSize);

    for (const [row, col] of dotPositions) {
      if (row >= 0 && row <= gridSize && col >= 0 && col <= gridSize) {
        tripodDots[row][col] = true;
      }
    }

    // Now add borders that meet at each tripod dot (exactly 3)
    for (const [vRow, vCol] of dotPositions) {
      this.addBordersAtTripodDot(vRow, vCol, borders, gridSize);
    }

    // Verify and adjust to ensure exactly gridSize regions of gridSize cells
    this.balanceRegions(borders, gridSize);
  }

  private calculateDiamondPattern(gridSize: number): Array<[number, number]> {
    const center = Math.floor(gridSize / 2);
    const positions: Array<[number, number]> = [];

    // Create a diamond pattern of tripod dots
    for (let offset = 1; offset <= center; offset++) {
      // Top of diamond
      if (center - offset >= 0) {
        positions.push([center - offset, center]);
      }
      // Right of diamond
      if (center + offset <= gridSize) {
        positions.push([center, center + offset]);
      }
      // Bottom of diamond
      if (center + offset <= gridSize) {
        positions.push([center + offset, center]);
      }
      // Left of diamond
      if (center - offset >= 0) {
        positions.push([center, center - offset]);
      }
    }

    // Add diagonal positions for more complex patterns
    for (let offset = 1; offset < center; offset++) {
      positions.push([center - offset, center - offset]);
      positions.push([center - offset, center + offset]);
      positions.push([center + offset, center - offset]);
      positions.push([center + offset, center + offset]);
    }

    // Remove duplicates and out-of-bounds
    const unique = new Set<string>();
    return positions.filter(([r, c]) => {
      const key = `${r},${c}`;
      if (unique.has(key) || r < 0 || r > gridSize || c < 0 || c > gridSize) {
        return false;
      }
      unique.add(key);
      return true;
    });
  }

  private addBordersAtTripodDot(
    vRow: number,
    vCol: number,
    borders: TripodBorders,
    gridSize: number,
  ): void {
    // For a tripod dot, exactly 3 borders must meet
    // We'll add 3 of the 4 possible borders at this vertex
    const possibleBorders: Array<{
      type: 'h' | 'v';
      row: number;
      col: number;
    }> = [];

    // Horizontal right
    if (vCol < gridSize) {
      possibleBorders.push({ type: 'h', row: vRow, col: vCol });
    }
    // Horizontal left
    if (vCol > 0) {
      possibleBorders.push({ type: 'h', row: vRow, col: vCol - 1 });
    }
    // Vertical down
    if (vRow < gridSize) {
      possibleBorders.push({ type: 'v', row: vRow, col: vCol });
    }
    // Vertical up
    if (vRow > 0) {
      possibleBorders.push({ type: 'v', row: vRow - 1, col: vCol });
    }

    // Shuffle and pick 3
    const shuffled = this.shuffleArray(possibleBorders);
    const toAdd = shuffled.slice(0, Math.min(3, shuffled.length));

    for (const border of toAdd) {
      if (border.type === 'h') {
        borders.horizontal[border.row][border.col] = true;
      } else {
        borders.vertical[border.row][border.col] = true;
      }
    }
  }

  private balanceRegions(borders: TripodBorders, gridSize: number): void {
    // Detect current regions
    let regions = this.detectRegions(borders, gridSize);
    let attempts = 0;
    const maxAttempts = 100;

    // Adjust borders until we have exactly gridSize regions of gridSize cells
    while (attempts < maxAttempts) {
      const invalidRegions = regions.filter((r) => r.size !== gridSize);
      if (invalidRegions.length === 0 && regions.length === gridSize) {
        break; // Success!
      }

      // Find regions that are too large and split them
      const largeRegions = regions.filter((r) => r.size > gridSize);
      for (const region of largeRegions) {
        this.splitRegion(region, borders, gridSize);
      }

      // Find regions that are too small and merge them
      const smallRegions = regions.filter((r) => r.size < gridSize);
      for (const region of smallRegions) {
        this.mergeRegion(region, borders, gridSize);
      }

      regions = this.detectRegions(borders, gridSize);
      attempts++;
    }
  }

  private splitRegion(
    region: Region,
    borders: TripodBorders,
    gridSize: number,
  ): void {
    // Find a cell in the middle and add a border to split
    const midIdx = Math.floor(region.cells.length / 2);
    const cell = region.cells[midIdx];

    // Try to add a horizontal border below this cell
    if (
      cell.row < gridSize - 1 &&
      !borders.horizontal[cell.row + 1][cell.col]
    ) {
      borders.horizontal[cell.row + 1][cell.col] = true;
    }
    // Or vertical border to the right
    else if (
      cell.col < gridSize - 1 &&
      !borders.vertical[cell.row][cell.col + 1]
    ) {
      borders.vertical[cell.row][cell.col + 1] = true;
    }
  }

  private mergeRegion(
    region: Region,
    borders: TripodBorders,
    gridSize: number,
  ): void {
    // Find a border adjacent to this region and remove it
    for (const cell of region.cells) {
      // Try removing border below
      if (
        cell.row < gridSize - 1 &&
        borders.horizontal[cell.row + 1][cell.col]
      ) {
        borders.horizontal[cell.row + 1][cell.col] = false;
        return;
      }
      // Try removing border to the right
      if (cell.col < gridSize - 1 && borders.vertical[cell.row][cell.col + 1]) {
        borders.vertical[cell.row][cell.col + 1] = false;
        return;
      }
    }
  }

  /**
   * Validate that a solution is valid for given borders (regions)
   */
  validateSolutionForRegions(
    solution: number[][],
    borders: TripodBorders,
    gridSize: number,
  ): boolean {
    const regions = this.detectRegions(borders, gridSize);

    for (const region of regions) {
      const values = region.cells.map(({ row, col }) => solution[row][col]);
      const uniqueValues = new Set(values);

      // Each region must have gridSize unique values 1 to gridSize
      if (uniqueValues.size !== gridSize) {
        return false;
      }
      for (let i = 1; i <= gridSize; i++) {
        if (!uniqueValues.has(i)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Remove cells to create puzzle of given difficulty
   */
  removeGivens(
    solution: number[][],
    difficulty: 'easy' | 'medium' | 'hard',
    gridSize: number,
  ): number[][] {
    const puzzle = solution.map((row) => [...row]);
    const totalCells = gridSize * gridSize;

    let cellsToRemove: number;
    switch (difficulty) {
      case 'easy':
        cellsToRemove = Math.floor(totalCells * 0.5); // Remove ~50%
        break;
      case 'medium':
        cellsToRemove = Math.floor(totalCells * 0.6); // Remove ~60%
        break;
      case 'hard':
        cellsToRemove = Math.floor(totalCells * 0.7); // Remove ~70%
        break;
      default:
        cellsToRemove = Math.floor(totalCells * 0.5);
    }

    // Create list of all cell positions and shuffle
    const positions: Array<[number, number]> = [];
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        positions.push([r, c]);
      }
    }

    const shuffled = this.shuffleArray(positions);
    let removed = 0;

    for (const [r, c] of shuffled) {
      if (removed >= cellsToRemove) break;
      if (puzzle[r][c] !== 0) {
        puzzle[r][c] = 0;
        removed++;
      }
    }

    return puzzle;
  }

  /**
   * Generate a complete tripod puzzle
   */
  generatePuzzle(
    difficulty: 'easy' | 'medium' | 'hard' = 'medium',
    gridSize: number = 7,
  ): {
    cells: number[][];
    solution: number[][];
    tripodDots: boolean[][];
    borders: TripodBorders;
    rating: number;
  } {
    this.validateGridSize(gridSize);

    let attempts = 0;
    const maxAttempts = 50;

    while (attempts < maxAttempts) {
      attempts++;

      try {
        // 1. Generate tripod dot pattern and borders
        const { tripodDots, borders } = this.generateTripodDotPattern(gridSize);

        // 2. Generate a Latin square solution
        const solution = this.generateLatinSquare(gridSize);

        // 3. Verify solution works with the regions
        if (!this.validateSolutionForRegions(solution, borders, gridSize)) {
          continue; // Try again
        }

        // 4. Remove cells based on difficulty
        const cells = this.removeGivens(solution, difficulty, gridSize);

        // 5. Calculate rating
        const rating = this.calculateRating(difficulty);

        return {
          cells,
          solution,
          tripodDots,
          borders,
          rating,
        };
      } catch {
        // Generation failed, try again
        continue;
      }
    }

    throw new Error(
      `Failed to generate valid tripod puzzle after ${maxAttempts} attempts`,
    );
  }

  private calculateRating(difficulty: 'easy' | 'medium' | 'hard'): number {
    switch (difficulty) {
      case 'easy':
        return Math.floor(Math.random() * 3) + 1; // 1-3
      case 'medium':
        return Math.floor(Math.random() * 3) + 4; // 4-6
      case 'hard':
        return Math.floor(Math.random() * 4) + 7; // 7-10
      default:
        return 5;
    }
  }

  /**
   * Generate a puzzle with a specific name
   */
  generateNamedPuzzle(
    name: string,
    difficulty: 'easy' | 'medium' | 'hard',
    gridSize: number = 7,
  ): {
    name: string;
    cells: number[][];
    solution: number[][];
    tripodDots: boolean[][];
    borders: TripodBorders;
    difficulty: 'easy' | 'medium' | 'hard';
    rating: number;
  } {
    const puzzle = this.generatePuzzle(difficulty, gridSize);
    return {
      name,
      difficulty,
      ...puzzle,
    };
  }
}
