import { describe, it, expect, beforeEach } from "vitest";
import {
  isValidGridSize,
  isWithinBounds,
  isVertexWithinBounds,
} from "../tripod-constants";
import {
  createEmptyBorders,
  createEmptyCells,
  validateBordersStructure,
  isValidHorizontalBorder,
  isValidVerticalBorder,
  safeIncrementStat,
} from "../tripod-utils";
import { TRIPOD_CONSTANTS } from "../tripod-constants";

describe("Tripod Constants Validation", () => {
  describe("isValidGridSize", () => {
    it("should accept valid grid sizes (7-9)", () => {
      expect(isValidGridSize(7)).toBe(true);
      expect(isValidGridSize(8)).toBe(true);
      expect(isValidGridSize(9)).toBe(true);
    });

    it("should reject invalid grid sizes", () => {
      expect(isValidGridSize(6)).toBe(false);
      expect(isValidGridSize(10)).toBe(false);
      expect(isValidGridSize(0)).toBe(false);
      expect(isValidGridSize(-1)).toBe(false);
      expect(isValidGridSize(5.5)).toBe(false); // non-integer
    });
  });

  describe("isWithinBounds", () => {
    it("should validate cell coordinates", () => {
      expect(isWithinBounds(0, 0, 7)).toBe(true);
      expect(isWithinBounds(6, 6, 7)).toBe(true);
      expect(isWithinBounds(3, 3, 7)).toBe(true);
    });

    it("should reject out-of-bounds coordinates", () => {
      expect(isWithinBounds(-1, 0, 7)).toBe(false);
      expect(isWithinBounds(0, -1, 7)).toBe(false);
      expect(isWithinBounds(7, 6, 7)).toBe(false); // row too large
      expect(isWithinBounds(6, 7, 7)).toBe(false); // col too large
      expect(isWithinBounds(7, 7, 7)).toBe(false); // both too large
    });
  });

  describe("isVertexWithinBounds", () => {
    it("should validate vertex coordinates (0 to gridSize inclusive)", () => {
      expect(isVertexWithinBounds(0, 0, 7)).toBe(true);
      expect(isVertexWithinBounds(7, 7, 7)).toBe(true); // vertices go to gridSize
      expect(isVertexWithinBounds(3, 3, 7)).toBe(true);
    });

    it("should reject out-of-bounds vertices", () => {
      expect(isVertexWithinBounds(-1, 0, 7)).toBe(false);
      expect(isVertexWithinBounds(0, -1, 7)).toBe(false);
      expect(isVertexWithinBounds(8, 7, 7)).toBe(false);
      expect(isVertexWithinBounds(7, 8, 7)).toBe(false);
    });
  });
});

describe("Tripod Utilities", () => {
  describe("createEmptyBorders", () => {
    it("should create correctly dimensioned borders for 7x7 grid", () => {
      const borders = createEmptyBorders(7);

      expect(borders.horizontal.length).toBe(8); // gridSize + 1
      expect(borders.horizontal[0].length).toBe(7); // gridSize
      expect(borders.vertical.length).toBe(7); // gridSize
      expect(borders.vertical[0].length).toBe(8); // gridSize + 1
    });

    it("should create correctly dimensioned borders for 9x9 grid", () => {
      const borders = createEmptyBorders(9);

      expect(borders.horizontal.length).toBe(10);
      expect(borders.horizontal[0].length).toBe(9);
      expect(borders.vertical.length).toBe(9);
      expect(borders.vertical[0].length).toBe(10);
    });

    it("should initialize all borders to false", () => {
      const borders = createEmptyBorders(7);

      borders.horizontal.forEach((row) => {
        row.forEach((cell) => {
          expect(cell).toBe(false);
        });
      });

      borders.vertical.forEach((row) => {
        row.forEach((cell) => {
          expect(cell).toBe(false);
        });
      });
    });

    it("should throw error for invalid grid size", () => {
      expect(() => createEmptyBorders(5)).toThrow();
      expect(() => createEmptyBorders(10)).toThrow();
    });
  });

  describe("validateBordersStructure", () => {
    it("should validate correct border structure", () => {
      const borders = createEmptyBorders(7);
      expect(validateBordersStructure(borders, 7)).toBe(true);
    });

    it("should reject null or undefined borders", () => {
      expect(validateBordersStructure(null, 7)).toBe(false);
      expect(validateBordersStructure(undefined, 7)).toBe(false);
    });

    it("should reject incorrect dimensions", () => {
      const invalidBorders = {
        horizontal: [[false]], // wrong size
        vertical: [[false]],
      };
      expect(validateBordersStructure(invalidBorders, 7)).toBe(false);
    });
  });

  describe("Border Index Validation", () => {
    it("should validate horizontal border indices", () => {
      expect(isValidHorizontalBorder(0, 0, 7)).toBe(true);
      expect(isValidHorizontalBorder(7, 6, 7)).toBe(true); // max valid
      expect(isValidHorizontalBorder(8, 0, 7)).toBe(false); // row too large
      expect(isValidHorizontalBorder(0, 7, 7)).toBe(false); // col too large
    });

    it("should validate vertical border indices", () => {
      expect(isValidVerticalBorder(0, 0, 7)).toBe(true);
      expect(isValidVerticalBorder(6, 7, 7)).toBe(true); // max valid
      expect(isValidVerticalBorder(7, 0, 7)).toBe(false); // row too large
      expect(isValidVerticalBorder(0, 8, 7)).toBe(false); // col too large
    });
  });

  describe("safeIncrementStat", () => {
    it("should increment normal values", () => {
      expect(safeIncrementStat(0)).toBe(1);
      expect(safeIncrementStat(50)).toBe(51);
      expect(safeIncrementStat(1000)).toBe(1001);
    });

    it("should cap at MAX_SAFE_INTEGER - 1000", () => {
      const maxStat = TRIPOD_CONSTANTS.MAX_STAT_VALUE;
      expect(safeIncrementStat(maxStat)).toBe(maxStat);
      expect(safeIncrementStat(maxStat + 100)).toBe(maxStat);
    });
  });

  describe("createEmptyCells", () => {
    it("should create correctly sized cell grid", () => {
      const cells = createEmptyCells(7);

      expect(cells.length).toBe(7);
      expect(cells[0].length).toBe(7);

      cells.forEach((row) => {
        row.forEach((cell) => {
          expect(cell).toBe(0);
        });
      });
    });

    it("should throw error for invalid grid size", () => {
      expect(() => createEmptyCells(5)).toThrow();
      expect(() => createEmptyCells(10)).toThrow();
    });
  });
});

describe("Constants Values", () => {
  it("should have correct constant values", () => {
    expect(TRIPOD_CONSTANTS.MIN_GRID_SIZE).toBe(7);
    expect(TRIPOD_CONSTANTS.MAX_GRID_SIZE).toBe(9);
    expect(TRIPOD_CONSTANTS.MAX_HISTORY_SIZE).toBe(100);
    expect(TRIPOD_CONSTANTS.MAX_BFS_ITERATIONS).toBe(81);
    expect(TRIPOD_CONSTANTS.BORDER_TOGGLE_DEBOUNCE_MS).toBe(100);
  });
});
