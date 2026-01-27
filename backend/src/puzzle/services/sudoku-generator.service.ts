import { Injectable } from '@nestjs/common';

@Injectable()
export class SudokuGeneratorService {
  // Generate a complete valid 9x9 Sudoku grid
  private generateCompleteGrid(): number[][] {
    const grid: number[][] = Array(9)
      .fill(null)
      .map(() => Array(9).fill(0));

    this.fillGrid(grid);
    return grid;
  }

  // Recursive backtracking to fill the grid
  private fillGrid(grid: number[][]): boolean {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col] === 0) {
          const numbers = this.shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);

          for (const num of numbers) {
            if (this.isValid(grid, row, col, num)) {
              grid[row][col] = num;

              if (this.fillGrid(grid)) {
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

  // Check if placing num at (row, col) is valid
  private isValid(
    grid: number[][],
    row: number,
    col: number,
    num: number,
  ): boolean {
    // Check row
    for (let x = 0; x < 9; x++) {
      if (grid[row][x] === num) return false;
    }

    // Check column
    for (let x = 0; x < 9; x++) {
      if (grid[x][col] === num) return false;
    }

    // Check 3x3 box
    const startRow = row - (row % 3);
    const startCol = col - (col % 3);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (grid[i + startRow][j + startCol] === num) return false;
      }
    }

    return true;
  }

  // Fisher-Yates shuffle algorithm
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Remove cells from completed grid to create puzzle
  private removeCells(grid: number[][], cellsToRemove: number): number[][] {
    const puzzle = grid.map((row) => [...row]);
    let removed = 0;

    while (removed < cellsToRemove) {
      const row = Math.floor(Math.random() * 9);
      const col = Math.floor(Math.random() * 9);

      if (puzzle[row][col] !== 0) {
        puzzle[row][col] = 0;
        removed++;
      }
    }

    return puzzle;
  }

  // Generate a puzzle with the specified difficulty
  generatePuzzle(difficulty: 'easy' | 'normal' | 'hard'): {
    puzzle: number[][];
    solution: number[][];
    rating: number;
  } {
    const solution = this.generateCompleteGrid();

    let cellsToRemove: number;
    let rating: number;

    switch (difficulty) {
      case 'easy':
        cellsToRemove = Math.floor(Math.random() * 10) + 30; // 30-40 cells removed
        rating = Math.floor(Math.random() * 3) + 1; // Rating 1-3
        break;
      case 'normal':
        cellsToRemove = Math.floor(Math.random() * 10) + 41; // 41-50 cells removed
        rating = Math.floor(Math.random() * 3) + 4; // Rating 4-6
        break;
      case 'hard':
        cellsToRemove = Math.floor(Math.random() * 10) + 51; // 51-60 cells removed
        rating = Math.floor(Math.random() * 4) + 7; // Rating 7-10
        break;
      default:
        cellsToRemove = 40;
        rating = 5;
    }

    const puzzle = this.removeCells(solution, cellsToRemove);

    return {
      puzzle,
      solution,
      rating,
    };
  }
}
