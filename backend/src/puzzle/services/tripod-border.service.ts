import { Injectable, BadRequestException } from '@nestjs/common';
import {
  createEmptyBorders,
  addOuterBorders as addOuterBordersUtil,
} from '../../lib/tripod-border-utils';
import type { TripodBorders } from '../../lib/tripod-region-detection';

/**
 * Service responsible for border generation and manipulation
 * - Generate tripod dot patterns
 * - Initialize border structures
 * - Validate border configurations
 */
@Injectable()
export class TripodBorderService {
  private readonly MIN_GRID_SIZE = 7;
  private readonly MAX_GRID_SIZE = 9;

  /**
   * Validate grid size is within acceptable range
   */
  validateGridSize(gridSize: number): void {
    if (
      !Number.isInteger(gridSize) ||
      gridSize < this.MIN_GRID_SIZE ||
      gridSize > this.MAX_GRID_SIZE
    ) {
      throw new BadRequestException(
        `Invalid grid size: ${gridSize}. Must be an integer between ${this.MIN_GRID_SIZE} and ${this.MAX_GRID_SIZE}`,
      );
    }
  }

  /**
   * Initialize empty borders for a given grid size
   */
  initializeBorders(gridSize: number): TripodBorders {
    this.validateGridSize(gridSize);
    return createEmptyBorders(gridSize);
  }

  /**
   * Add outer borders around grid perimeter
   */
  addOuterBorders(borders: TripodBorders, gridSize: number): TripodBorders {
    return addOuterBordersUtil(borders, gridSize);
  }

  /**
   * Initialize tripod dots grid (all false initially)
   */
  initializeTripodDots(gridSize: number): boolean[][] {
    this.validateGridSize(gridSize);

    return Array.from({ length: gridSize + 1 }, () =>
      Array.from({ length: gridSize + 1 }, () => false),
    );
  }

  /**
   * Generate a tripod dot pattern for puzzle
   * Strategy: Place dots at strategic vertices to ensure solvability
   */
  generateTripodDotPattern(gridSize: number): boolean[][] {
    this.validateGridSize(gridSize);

    const dots: boolean[][] = this.initializeTripodDots(gridSize);

    // Strategy: Place dots at grid intersections with spacing
    // This ensures we have enough constraints without over-constraining
    const spacing = 2; // Space between dots

    for (let row = 1; row < gridSize; row += spacing) {
      for (let col = 1; col < gridSize; col += spacing) {
        // Add some randomness to avoid predictable patterns
        if (Math.random() > 0.3) {
          // 70% chance to place dot
          dots[row][col] = true;
        }
      }
    }

    // Ensure minimum number of dots (at least gridSize dots)
    const dotCount = this.countDots(dots);
    if (dotCount < gridSize) {
      this.addRandomDots(dots, gridSize, gridSize - dotCount);
    }

    return dots;
  }

  /**
   * Count total number of dots in grid
   */
  private countDots(dots: boolean[][]): number {
    let count = 0;
    for (const row of dots) {
      for (const cell of row) {
        if (cell) count++;
      }
    }
    return count;
  }

  /**
   * Add random dots to meet minimum requirement
   */
  private addRandomDots(
    dots: boolean[][],
    gridSize: number,
    count: number,
  ): void {
    let added = 0;
    const maxAttempts = 1000;
    let attempts = 0;

    while (added < count && attempts < maxAttempts) {
      const row = Math.floor(Math.random() * gridSize) + 1;
      const col = Math.floor(Math.random() * gridSize) + 1;

      if (!dots[row][col]) {
        dots[row][col] = true;
        added++;
      }
      attempts++;
    }
  }

  /**
   * Validate border structure is valid
   * - Check dimensions match grid size
   * - Check outer borders are present
   */
  validateBorderStructure(borders: TripodBorders, gridSize: number): boolean {
    // Check horizontal borders dimensions
    if (
      borders.horizontal.length !== gridSize + 1 ||
      borders.horizontal.some((row) => row.length !== gridSize)
    ) {
      return false;
    }

    // Check vertical borders dimensions
    if (
      borders.vertical.length !== gridSize ||
      borders.vertical.some((row) => row.length !== gridSize + 1)
    ) {
      return false;
    }

    // Check outer borders are present
    for (let i = 0; i < gridSize; i++) {
      if (!borders.horizontal[0][i]) return false; // Top
      if (!borders.horizontal[gridSize][i]) return false; // Bottom
      if (!borders.vertical[i][0]) return false; // Left
      if (!borders.vertical[i][gridSize]) return false; // Right
    }

    return true;
  }
}

