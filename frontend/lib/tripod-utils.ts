/**
 * Tripod Sudoku Utility Functions
 * Shared utilities to reduce code duplication and ensure consistency
 */

import type { TripodBorders } from "@/types/tripod";
import { TRIPOD_CONSTANTS, isValidGridSize } from "./tripod-constants";

/**
 * Check if a row/col coordinate is within grid bounds
 * @param row - Row index
 * @param col - Column index
 * @param gridSize - Size of the grid
 * @returns true if coordinates are valid
 */
export function isWithinBounds(
  row: number,
  col: number,
  gridSize: number,
): boolean {
  return (
    Number.isInteger(row) &&
    Number.isInteger(col) &&
    row >= 0 &&
    row < gridSize &&
    col >= 0 &&
    col < gridSize
  );
}

/**
 * Check if a vertex coordinate is within bounds (vertices are gridSize+1)
 * @param vertexRow - Vertex row index
 * @param vertexCol - Vertex column index
 * @param gridSize - Size of the grid
 * @returns true if vertex coordinates are valid
 */
export function isVertexWithinBounds(
  vertexRow: number,
  vertexCol: number,
  gridSize: number,
): boolean {
  return (
    Number.isInteger(vertexRow) &&
    Number.isInteger(vertexCol) &&
    vertexRow >= 0 &&
    vertexRow <= gridSize &&
    vertexCol >= 0 &&
    vertexCol <= gridSize
  );
}

/**
 * Create empty border arrays for a given grid size
 * @param gridSize - Size of the grid
 * @returns Empty borders structure
 */
export function createEmptyBorders(gridSize: number): TripodBorders {
  if (!isValidGridSize(gridSize)) {
    throw new Error(
      `Invalid grid size: ${gridSize}. Must be between ${TRIPOD_CONSTANTS.MIN_GRID_SIZE} and ${TRIPOD_CONSTANTS.MAX_GRID_SIZE}`,
    );
  }

  return {
    // Horizontal borders: (gridSize+1) rows × gridSize columns
    horizontal: Array(gridSize + 1)
      .fill(null)
      .map(() => Array(gridSize).fill(false)),

    // Vertical borders: gridSize rows × (gridSize+1) columns
    vertical: Array(gridSize)
      .fill(null)
      .map(() => Array(gridSize + 1).fill(false)),
  };
}

/**
 * Validate that borders structure has correct dimensions
 * @param borders - Borders to validate
 * @param gridSize - Expected grid size
 * @returns true if structure is valid
 */
export function validateBordersStructure(
  borders: TripodBorders | null | undefined,
  gridSize: number,
): boolean {
  if (!borders) return false;
  if (!isValidGridSize(gridSize)) return false;

  const { horizontal, vertical } = borders;

  // Check horizontal borders dimensions
  if (!Array.isArray(horizontal) || horizontal.length !== gridSize + 1) {
    return false;
  }
  for (const row of horizontal) {
    if (!Array.isArray(row) || row.length !== gridSize) {
      return false;
    }
  }

  // Check vertical borders dimensions
  if (!Array.isArray(vertical) || vertical.length !== gridSize) {
    return false;
  }
  for (const row of vertical) {
    if (!Array.isArray(row) || row.length !== gridSize + 1) {
      return false;
    }
  }

  return true;
}

/**
 * Validate that a horizontal border index is within bounds
 * @param row - Border row index (0 to gridSize)
 * @param col - Border column index (0 to gridSize-1)
 * @param gridSize - Size of the grid
 * @returns true if indices are valid
 */
export function isValidHorizontalBorder(
  row: number,
  col: number,
  gridSize: number,
): boolean {
  return (
    Number.isInteger(row) &&
    Number.isInteger(col) &&
    row >= 0 &&
    row <= gridSize &&
    col >= 0 &&
    col < gridSize
  );
}

/**
 * Validate that a vertical border index is within bounds
 * @param row - Border row index (0 to gridSize-1)
 * @param col - Border column index (0 to gridSize)
 * @param gridSize - Size of the grid
 * @returns true if indices are valid
 */
export function isValidVerticalBorder(
  row: number,
  col: number,
  gridSize: number,
): boolean {
  return (
    Number.isInteger(row) &&
    Number.isInteger(col) &&
    row >= 0 &&
    row < gridSize &&
    col >= 0 &&
    col <= gridSize
  );
}

/**
 * Create empty cells grid initialized with zeros
 * @param gridSize - Size of the grid
 * @returns Empty cells array
 */
export function createEmptyCells(gridSize: number): number[][] {
  if (!isValidGridSize(gridSize)) {
    throw new Error(
      `Invalid grid size: ${gridSize}. Must be between ${TRIPOD_CONSTANTS.MIN_GRID_SIZE} and ${TRIPOD_CONSTANTS.MAX_GRID_SIZE}`,
    );
  }

  return Array(gridSize)
    .fill(null)
    .map(() => Array(gridSize).fill(0));
}

/**
 * Create empty tripod dots grid (all false)
 * @param gridSize - Size of the grid
 * @returns Empty dots array (gridSize+1 × gridSize+1)
 */
export function createEmptyTripodDots(gridSize: number): boolean[][] {
  if (!isValidGridSize(gridSize)) {
    throw new Error(
      `Invalid grid size: ${gridSize}. Must be between ${TRIPOD_CONSTANTS.MIN_GRID_SIZE} and ${TRIPOD_CONSTANTS.MAX_GRID_SIZE}`,
    );
  }

  return Array(gridSize + 1)
    .fill(null)
    .map(() => Array(gridSize + 1).fill(false));
}

/**
 * Clamp a number value between min and max
 * @param value - Value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Safely increment a statistic value with overflow protection
 * @param currentValue - Current stat value
 * @returns Incremented value or max if overflow would occur
 */
export function safeIncrementStat(currentValue: number): number {
  if (currentValue >= TRIPOD_CONSTANTS.MAX_STAT_VALUE) {
    console.warn("Stat value at maximum, not incrementing further");
    return TRIPOD_CONSTANTS.MAX_STAT_VALUE;
  }
  return currentValue + 1;
}
