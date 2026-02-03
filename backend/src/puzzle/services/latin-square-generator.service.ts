import { Injectable } from '@nestjs/common';

/**
 * Service responsible for generating and validating Latin squares
 * A Latin square is an n×n grid where each number 1..n appears exactly once in each row and column
 */
@Injectable()
export class LatinSquareGeneratorService {
  /**
   * Generate a random Latin square of given size
   */
  generateLatinSquare(size: number): number[][] {
    // Start with base pattern: row i has [(i+0)%n+1, (i+1)%n+1, ..., (i+n-1)%n+1]
    const square: number[][] = [];
    for (let i = 0; i < size; i++) {
      const row: number[] = [];
      for (let j = 0; j < size; j++) {
        row.push(((i + j) % size) + 1);
      }
      square.push(row);
    }

    // Randomize by shuffling rows and columns
    this.shuffleRows(square);
    this.shuffleColumns(square);
    this.shuffleNumbers(square, size);

    return square;
  }

  /**
   * Validate that a grid is a valid Latin square
   */
  validateLatinSquare(square: number[][]): boolean {
    const size = square.length;

    // Check each row has unique values 1..size
    for (const row of square) {
      if (row.length !== size) return false;
      const set = new Set(row);
      if (set.size !== size) return false;
      for (let i = 1; i <= size; i++) {
        if (!set.has(i)) return false;
      }
    }

    // Check each column has unique values 1..size
    for (let c = 0; c < size; c++) {
      const col = square.map((row) => row[c]);
      const set = new Set(col);
      if (set.size !== size) return false;
      for (let i = 1; i <= size; i++) {
        if (!set.has(i)) return false;
      }
    }

    return true;
  }

  /**
   * Shuffle rows using Fisher-Yates algorithm
   */
  private shuffleRows(square: number[][]): void {
    for (let i = square.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [square[i], square[j]] = [square[j], square[i]];
    }
  }

  /**
   * Shuffle columns by transposing, shuffling rows, then transposing back
   */
  private shuffleColumns(square: number[][]): void {
    const transposed = this.transpose(square);
    this.shuffleRows(transposed);
    const result = this.transpose(transposed);
    // Update square in place
    for (let i = 0; i < square.length; i++) {
      square[i] = result[i];
    }
  }

  /**
   * Transpose a matrix
   */
  private transpose(matrix: number[][]): number[][] {
    if (matrix.length === 0) return [];
    return matrix[0].map((_, colIndex) => matrix.map((row) => row[colIndex]));
  }

  /**
   * Shuffle number mapping (permute 1..n)
   */
  private shuffleNumbers(square: number[][], size: number): void {
    // Create random permutation of numbers 1..size
    const numbers = Array.from({ length: size }, (_, i) => i + 1);
    this.shuffleArray(numbers);

    // Apply permutation to all cells
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        square[r][c] = numbers[square[r][c] - 1];
      }
    }
  }

  /**
   * Generic array shuffle using Fisher-Yates
   */
  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}

