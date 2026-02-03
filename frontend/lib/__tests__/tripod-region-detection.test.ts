/**
 * Tests for Tripod Region Detection Utility
 */

import { describe, it, expect } from "vitest";
import { detectRegions, type TripodBorders } from "../tripod-region-detection";

describe("tripod-region-detection", () => {
  describe("detectRegions", () => {
    it("should detect single region with no borders (2x2 grid)", () => {
      const borders: TripodBorders = {
        horizontal: [
          [false, false], // Row 0 top
          [false, false], // Row 1 middle
          [false, false], // Row 2 bottom
        ],
        vertical: [
          [false, false, false], // Col 0
          [false, false, false], // Col 1
        ],
      };

      const regions = detectRegions(borders, 2);

      expect(regions).toHaveLength(1);
      expect(regions[0].size).toBe(4); // All 4 cells in one region
      expect(regions[0].cells).toHaveLength(4);
    });

    it("should detect two regions split by vertical border (2x2 grid)", () => {
      const borders: TripodBorders = {
        horizontal: [
          [false, false],
          [false, false],
          [false, false],
        ],
        vertical: [
          [false, true, false], // Vertical border in middle
          [false, true, false],
        ],
      };

      const regions = detectRegions(borders, 2);

      expect(regions).toHaveLength(2);
      expect(regions[0].size).toBe(2); // Left region
      expect(regions[1].size).toBe(2); // Right region
    });

    it("should detect two regions split by horizontal border (2x2 grid)", () => {
      const borders: TripodBorders = {
        horizontal: [
          [false, false],
          [true, true], // Horizontal border in middle
          [false, false],
        ],
        vertical: [
          [false, false, false],
          [false, false, false],
        ],
      };

      const regions = detectRegions(borders, 2);

      expect(regions).toHaveLength(2);
      expect(regions[0].size).toBe(2); // Top region
      expect(regions[1].size).toBe(2); // Bottom region
    });

    it("should detect four separate regions (2x2 grid all separated)", () => {
      const borders: TripodBorders = {
        horizontal: [
          [false, false],
          [true, true], // Horizontal split
          [false, false],
        ],
        vertical: [
          [false, true, false], // Vertical split
          [false, true, false],
        ],
      };

      const regions = detectRegions(borders, 2);

      expect(regions).toHaveLength(4);
      regions.forEach((region) => {
        expect(region.size).toBe(1); // Each cell is its own region
      });
    });

    it("should handle 3x3 grid with complex borders", () => {
      const borders: TripodBorders = {
        horizontal: [
          [false, false, false], // Top
          [true, false, false],
          [false, true, false],
          [false, false, false], // Bottom
        ],
        vertical: [
          [false, false, false, false],
          [false, true, false, false],
          [false, false, true, false],
        ],
      };

      const regions = detectRegions(borders, 3);

      expect(regions.length).toBeGreaterThan(1);
      const totalCells = regions.reduce((sum, r) => sum + r.size, 0);
      expect(totalCells).toBe(9); // All cells accounted for
    });

    it("should assign unique region IDs", () => {
      const borders: TripodBorders = {
        horizontal: [
          [false, false],
          [true, true],
          [false, false],
        ],
        vertical: [
          [false, true, false],
          [false, true, false],
        ],
      };

      const regions = detectRegions(borders, 2);

      const ids = regions.map((r) => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(regions.length); // All IDs are unique
    });

    it("should handle grid with outer borders only (7x7)", () => {
      const gridSize = 7;
      const borders: TripodBorders = {
        horizontal: Array(gridSize + 1)
          .fill(null)
          .map(() => Array(gridSize).fill(false)),
        vertical: Array(gridSize)
          .fill(null)
          .map(() => Array(gridSize + 1).fill(false)),
      };

      const regions = detectRegions(borders, gridSize);

      expect(regions).toHaveLength(1);
      expect(regions[0].size).toBe(gridSize * gridSize);
    });

    it("should detect correct cell coordinates", () => {
      const borders: TripodBorders = {
        horizontal: [
          [false, false],
          [true, true],
          [false, false],
        ],
        vertical: [
          [false, false, false],
          [false, false, false],
        ],
      };

      const regions = detectRegions(borders, 2);

      const topRegion = regions.find((r) =>
        r.cells.some((c) => c.row === 0)
      )!;
      const bottomRegion = regions.find((r) =>
        r.cells.some((c) => c.row === 1)
      )!;

      expect(topRegion.cells).toEqual(
        expect.arrayContaining([
          { row: 0, col: 0 },
          { row: 0, col: 1 },
        ])
      );

      expect(bottomRegion.cells).toEqual(
        expect.arrayContaining([
          { row: 1, col: 0 },
          { row: 1, col: 1 },
        ])
      );
    });
  });
});

