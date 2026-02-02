/**
 * Tripod Sudoku Constants
 * Centralized constants to avoid magic numbers and ensure consistency
 */

export const TRIPOD_CONSTANTS = {
  /** Minimum allowed grid size for Tripod Sudoku */
  MIN_GRID_SIZE: 7,

  /** Maximum allowed grid size for Tripod Sudoku */
  MAX_GRID_SIZE: 9,

  /** Maximum number of border history entries to store (prevents memory overflow) */
  MAX_HISTORY_SIZE: 100,

  /** Maximum BFS iterations to prevent infinite loops in region detection (9x9 = 81 cells) */
  MAX_BFS_ITERATIONS: 81,

  /** Debounce time in ms for border toggle to prevent concurrent modifications */
  BORDER_TOGGLE_DEBOUNCE_MS: 100,

  /** Timeout in ms for initialization (fail-safe) */
  INITIALIZATION_TIMEOUT_MS: 10000,

  /** Minimum cell size in pixels for responsive rendering */
  MIN_CELL_SIZE_PX: 20,

  /** Maximum cell size in pixels for responsive rendering */
  MAX_CELL_SIZE_PX: 60,

  /** Maximum safe integer for statistics to prevent overflow */
  MAX_STAT_VALUE: Number.MAX_SAFE_INTEGER - 1000,
} as const;

/**
 * Type-safe helper to check if a grid size is valid
 */
export function isValidGridSize(size: number): boolean {
  return (
    Number.isInteger(size) &&
    size >= TRIPOD_CONSTANTS.MIN_GRID_SIZE &&
    size <= TRIPOD_CONSTANTS.MAX_GRID_SIZE
  );
}

/**
 * Check if cell coordinates are within grid bounds
 * @param row - Row index (0 to gridSize-1)
 * @param col - Column index (0 to gridSize-1)
 * @param gridSize - Size of the grid
 */
export function isWithinBounds(
  row: number,
  col: number,
  gridSize: number,
): boolean {
  return row >= 0 && row < gridSize && col >= 0 && col < gridSize;
}

/**
 * Check if vertex coordinates are within bounds
 * Vertices are at cell corners, so they range from 0 to gridSize (inclusive)
 * @param row - Vertex row index (0 to gridSize)
 * @param col - Vertex column index (0 to gridSize)
 * @param gridSize - Size of the grid
 */
export function isVertexWithinBounds(
  row: number,
  col: number,
  gridSize: number,
): boolean {
  return row >= 0 && row <= gridSize && col >= 0 && col <= gridSize;
}

/**
 * Valid grid sizes array for validation and iteration
 */
export const VALID_GRID_SIZES = [7, 8, 9] as const;
export type ValidGridSize = (typeof VALID_GRID_SIZES)[number];
