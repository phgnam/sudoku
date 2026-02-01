/**
 * Sudoku validation utilities - shared between frontend and (optionally) backend
 */

/**
 * Check if placing a number causes a conflict (same logic as backend isValidMove)
 * Returns true if there's a conflict (number is wrong), false if valid
 */
export function checkConflict(
  grid: number[][],
  row: number,
  col: number,
  num: number
): boolean {
  if (num === 0) return false;

  // Check row for duplicates
  for (let x = 0; x < 9; x++) {
    if (x !== col && grid[row][x] === num) return true;
  }

  // Check column for duplicates
  for (let x = 0; x < 9; x++) {
    if (x !== row && grid[x][col] === num) return true;
  }

  // Check 3x3 box for duplicates
  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const r = startRow + i;
      const c = startCol + j;
      if ((r !== row || c !== col) && grid[r][c] === num) return true;
    }
  }

  return false;
}

/**
 * Check if a sudoku grid is completely filled (no zeros)
 */
export function isComplete(grid: number[][]): boolean {
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      if (grid[i][j] === 0) return false;
    }
  }
  return true;
}

/**
 * Find all cells in conflict within the grid
 */
export function findConflicts(
  grid: number[][]
): Array<{ row: number; col: number }> {
  const conflicts: Array<{ row: number; col: number }> = [];
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 9; j++) {
      if (grid[i][j] !== 0 && checkConflict(grid, i, j, grid[i][j])) {
        conflicts.push({ row: i, col: j });
      }
    }
  }
  return conflicts;
}

