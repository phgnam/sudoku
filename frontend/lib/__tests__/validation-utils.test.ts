import { describe, it, expect } from 'vitest';
import {
  findDuplicates,
  isGridComplete,
  getRowValues,
  getColValues,
} from '../validation-utils';

describe('validation-utils', () => {
  describe('findDuplicates', () => {
    it('should return empty set for empty array', () => {
      const result = findDuplicates([]);
      expect(result.size).toBe(0);
    });

    it('should return empty set when no duplicates', () => {
      const result = findDuplicates([1, 2, 3, 4, 5]);
      expect(result.size).toBe(0);
    });

    it('should find single duplicate', () => {
      const result = findDuplicates([1, 2, 3, 2, 4]);
      expect(result).toEqual(new Set([2]));
    });

    it('should find multiple duplicates', () => {
      const result = findDuplicates([1, 2, 3, 2, 4, 3, 5, 1]);
      expect(result).toEqual(new Set([1, 2, 3]));
    });

    it('should work with strings', () => {
      const result = findDuplicates(['a', 'b', 'c', 'b', 'd']);
      expect(result).toEqual(new Set(['b']));
    });

    it('should handle multiple occurrences of same value', () => {
      const result = findDuplicates([1, 1, 1, 2, 2]);
      expect(result).toEqual(new Set([1, 2]));
    });
  });

  describe('isGridComplete', () => {
    it('should return true for complete 3x3 grid', () => {
      const grid = [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ];
      expect(isGridComplete(grid)).toBe(true);
    });

    it('should return false for incomplete grid with zeros', () => {
      const grid = [
        [1, 2, 0],
        [4, 5, 6],
        [7, 8, 9],
      ];
      expect(isGridComplete(grid)).toBe(false);
    });

    it('should return false for empty grid', () => {
      const grid = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ];
      expect(isGridComplete(grid)).toBe(false);
    });

    it('should handle different grid sizes', () => {
      const grid = [
        [1, 2],
        [3, 4],
      ];
      expect(isGridComplete(grid)).toBe(true);
    });
  });

  describe('getRowValues', () => {
    const grid = [
      [1, 0, 3],
      [4, 5, 0],
      [0, 8, 9],
    ];

    it('should extract non-zero values from row', () => {
      expect(getRowValues(grid, 0)).toEqual([1, 3]);
      expect(getRowValues(grid, 1)).toEqual([4, 5]);
      expect(getRowValues(grid, 2)).toEqual([8, 9]);
    });

    it('should return empty array for invalid row', () => {
      expect(getRowValues(grid, 999)).toEqual([]);
    });
  });

  describe('getColValues', () => {
    const grid = [
      [1, 0, 3],
      [4, 5, 0],
      [0, 8, 9],
    ];

    it('should extract non-zero values from column', () => {
      expect(getColValues(grid, 0)).toEqual([1, 4]);
      expect(getColValues(grid, 1)).toEqual([5, 8]);
      expect(getColValues(grid, 2)).toEqual([3, 9]);
    });

    it('should handle out of bounds column', () => {
      expect(getColValues(grid, 999)).toEqual([]);
    });
  });
});

