/**
 * Tripod Border Utilities (Backend)
 * Shared utilities for creating and manipulating tripod borders
 * 
 * NOTE: This file is duplicated from frontend/lib/tripod-border-utils.ts
 * In a monorepo setup, this should be in a shared package.
 */

import type { TripodBorders } from './tripod-region-detection';

/**
 * Create empty border arrays for a given grid size
 */
export function createEmptyBorders(gridSize: number): TripodBorders {
  // horizontal: (gridSize+1) rows x gridSize columns
  const horizontal = Array.from({ length: gridSize + 1 }, () =>
    Array.from({ length: gridSize }, () => false),
  );

  // vertical: gridSize rows x (gridSize+1) columns
  const vertical = Array.from({ length: gridSize }, () =>
    Array.from({ length: gridSize + 1 }, () => false),
  );

  return { horizontal, vertical };
}

/**
 * Add outer borders around the entire grid
 * Mutates the borders object in place
 */
export function addOuterBorders(
  borders: TripodBorders,
  gridSize: number,
): TripodBorders {
  // Top and bottom horizontal borders
  for (let c = 0; c < gridSize; c++) {
    borders.horizontal[0][c] = true;
    borders.horizontal[gridSize][c] = true;
  }

  // Left and right vertical borders
  for (let r = 0; r < gridSize; r++) {
    borders.vertical[r][0] = true;
    borders.vertical[r][gridSize] = true;
  }

  return borders;
}

