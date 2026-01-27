import { Injectable } from '@nestjs/common';

@Injectable()
export class SudokuValidatorService {
  // Validate if placing a number at (row, col) is valid
  isValidMove(
    grid: number[][],
    row: number,
    col: number,
    num: number,
  ): boolean {
    // Check row
    for (let x = 0; x < 9; x++) {
      if (x !== col && grid[row][x] === num) {
        return false;
      }
    }

    // Check column
    for (let x = 0; x < 9; x++) {
      if (x !== row && grid[x][col] === num) {
        return false;
      }
    }

    // Check 3x3 box
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const r = startRow + i;
        const c = startCol + j;
        if ((r !== row || c !== col) && grid[r][c] === num) {
          return false;
        }
      }
    }

    return true;
  }

  // Check if the entire grid is complete and valid
  isComplete(grid: number[][]): boolean {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col] === 0) {
          return false; // Empty cell found
        }
      }
    }

    // Check all rows, columns, and boxes are valid
    return this.isGridValid(grid);
  }

  // Validate entire grid
  private isGridValid(grid: number[][]): boolean {
    // Check all rows
    for (let row = 0; row < 9; row++) {
      if (!this.isSetValid(grid[row])) {
        return false;
      }
    }

    // Check all columns
    for (let col = 0; col < 9; col++) {
      const column = grid.map((row) => row[col]);
      if (!this.isSetValid(column)) {
        return false;
      }
    }

    // Check all 3x3 boxes
    for (let boxRow = 0; boxRow < 3; boxRow++) {
      for (let boxCol = 0; boxCol < 3; boxCol++) {
        const box: number[] = [];
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            box.push(grid[boxRow * 3 + i][boxCol * 3 + j]);
          }
        }
        if (!this.isSetValid(box)) {
          return false;
        }
      }
    }

    return true;
  }

  // Check if a set (row/column/box) contains unique numbers 1-9
  private isSetValid(set: number[]): boolean {
    const seen = new Set<number>();
    for (const num of set) {
      if (num === 0) continue; // Skip empty cells
      if (seen.has(num)) {
        return false; // Duplicate found
      }
      seen.add(num);
    }
    return true;
  }

  // Find all conflicts in the grid (for hint type 2)
  findConflicts(grid: number[][]): Array<{ row: number; col: number }> {
    const conflicts: Array<{ row: number; col: number }> = [];

    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const num = grid[row][col];
        if (num === 0) continue;

        if (!this.isValidMove(grid, row, col, num)) {
          conflicts.push({ row, col });
        }
      }
    }

    return conflicts;
  }
}
