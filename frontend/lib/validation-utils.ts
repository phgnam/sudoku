/**
 * Validation utilities for tripod mode
 * Shared functions to reduce code duplication
 */

/**
 * Find duplicate values in an array
 * @param values - Array of values to check for duplicates
 * @returns Set of duplicate values
 * 
 * @example
 * findDuplicates([1, 2, 3, 2, 4, 3]) // Returns Set(2, 3)
 * findDuplicates([1, 2, 3, 4]) // Returns Set()
 */
export function findDuplicates<T>(values: T[]): Set<T> {
  const duplicates = new Set<T>();
  const seen = new Set<T>();
  
  values.forEach((v) => {
    if (seen.has(v)) {
      duplicates.add(v);
    }
    seen.add(v);
  });
  
  return duplicates;
}

/**
 * Check if a grid is completely filled
 * @param grid - 2D array representing the grid
 * @returns true if all cells are non-zero
 */
export function isGridComplete(grid: number[][]): boolean {
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      if (!grid[r]?.[c] || grid[r][c] === 0) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Extract values from a row, filtering out zeros
 * @param grid - 2D grid
 * @param row - Row index
 * @returns Array of non-zero values in the row
 */
export function getRowValues(grid: number[][], row: number): number[] {
  return (grid[row] ?? []).filter((v) => v !== 0);
}

/**
 * Extract values from a column, filtering out zeros
 * @param grid - 2D grid
 * @param col - Column index
 * @returns Array of non-zero values in the column
 */
export function getColValues(grid: number[][], col: number): number[] {
  return grid.map((row) => row?.[col] ?? 0).filter((v) => v !== 0);
}

