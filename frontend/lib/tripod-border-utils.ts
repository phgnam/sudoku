/**
 * Tripod Border Utilities
 * Shared utilities for creating and manipulating tripod borders
 */

import type { TripodBorders } from "./tripod-region-detection";

/**
 * Create empty border arrays for a given grid size
 * 
 * @param gridSize - Size of the grid (NxN)
 * @returns Empty border configuration
 * 
 * @example
 * const borders = createEmptyBorders(7);
 * // Returns:
 * // {
 * //   horizontal: 8x7 array of false,
 * //   vertical: 7x8 array of false
 * // }
 */
export function createEmptyBorders(gridSize: number): TripodBorders {
  // horizontal: (gridSize+1) rows x gridSize columns
  // Represents borders between rows (including top and bottom edges)
  const horizontal = Array.from({ length: gridSize + 1 }, () =>
    Array.from({ length: gridSize }, () => false)
  );

  // vertical: gridSize rows x (gridSize+1) columns
  // Represents borders between columns (including left and right edges)
  const vertical = Array.from({ length: gridSize }, () =>
    Array.from({ length: gridSize + 1 }, () => false)
  );

  return { horizontal, vertical };
}

/**
 * Add outer borders around the entire grid
 * Mutates the borders object in place
 * 
 * @param borders - Border configuration to modify
 * @param gridSize - Size of the grid
 * @returns Modified borders (same reference)
 * 
 * @example
 * const borders = createEmptyBorders(7);
 * addOuterBorders(borders, 7);
 * // Now borders has all outer edges set to true
 */
export function addOuterBorders(
  borders: TripodBorders,
  gridSize: number
): TripodBorders {
  // Top and bottom horizontal borders
  for (let c = 0; c < gridSize; c++) {
    borders.horizontal[0][c] = true; // Top edge
    borders.horizontal[gridSize][c] = true; // Bottom edge
  }

  // Left and right vertical borders
  for (let r = 0; r < gridSize; r++) {
    borders.vertical[r][0] = true; // Left edge
    borders.vertical[r][gridSize] = true; // Right edge
  }

  return borders;
}

/**
 * Clone border configuration (deep copy)
 * 
 * @param borders - Border configuration to clone
 * @returns New border configuration with same values
 */
export function cloneBorders(borders: TripodBorders): TripodBorders {
  return {
    horizontal: borders.horizontal.map((row) => [...row]),
    vertical: borders.vertical.map((row) => [...row]),
  };
}

/**
 * Check if two border configurations are equal
 * 
 * @param a - First border configuration
 * @param b - Second border configuration
 * @returns True if borders are identical
 */
export function bordersEqual(a: TripodBorders, b: TripodBorders): boolean {
  if (
    a.horizontal.length !== b.horizontal.length ||
    a.vertical.length !== b.vertical.length
  ) {
    return false;
  }

  for (let i = 0; i < a.horizontal.length; i++) {
    if (a.horizontal[i].length !== b.horizontal[i].length) return false;
    for (let j = 0; j < a.horizontal[i].length; j++) {
      if (a.horizontal[i][j] !== b.horizontal[i][j]) return false;
    }
  }

  for (let i = 0; i < a.vertical.length; i++) {
    if (a.vertical[i].length !== b.vertical[i].length) return false;
    for (let j = 0; j < a.vertical[i].length; j++) {
      if (a.vertical[i][j] !== b.vertical[i][j]) return false;
    }
  }

  return true;
}

