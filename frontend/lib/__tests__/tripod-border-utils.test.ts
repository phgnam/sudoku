/**
 * Tests for Tripod Border Utilities
 */

import { describe, it, expect } from "vitest";
import {
  createEmptyBorders,
  addOuterBorders,
  cloneBorders,
  bordersEqual,
} from "../tripod-border-utils";

describe("tripod-border-utils", () => {
  describe("createEmptyBorders", () => {
    it("should create empty borders for 2x2 grid", () => {
      const borders = createEmptyBorders(2);

      expect(borders.horizontal).toHaveLength(3); // gridSize + 1
      expect(borders.horizontal[0]).toHaveLength(2); // gridSize
      expect(borders.vertical).toHaveLength(2); // gridSize
      expect(borders.vertical[0]).toHaveLength(3); // gridSize + 1
    });

    it("should create empty borders for 7x7 grid", () => {
      const borders = createEmptyBorders(7);

      expect(borders.horizontal).toHaveLength(8);
      expect(borders.horizontal[0]).toHaveLength(7);
      expect(borders.vertical).toHaveLength(7);
      expect(borders.vertical[0]).toHaveLength(8);
    });

    it("should initialize all borders to false", () => {
      const borders = createEmptyBorders(3);

      borders.horizontal.forEach((row) => {
        row.forEach((border) => {
          expect(border).toBe(false);
        });
      });

      borders.vertical.forEach((row) => {
        row.forEach((border) => {
          expect(border).toBe(false);
        });
      });
    });
  });

  describe("addOuterBorders", () => {
    it("should add all outer borders to 2x2 grid", () => {
      const borders = createEmptyBorders(2);
      addOuterBorders(borders, 2);

      // Top horizontal border
      expect(borders.horizontal[0]).toEqual([true, true]);
      // Bottom horizontal border
      expect(borders.horizontal[2]).toEqual([true, true]);
      // Left vertical border
      expect(borders.vertical[0][0]).toBe(true);
      expect(borders.vertical[1][0]).toBe(true);
      // Right vertical border
      expect(borders.vertical[0][2]).toBe(true);
      expect(borders.vertical[1][2]).toBe(true);
    });

    it("should not modify internal borders", () => {
      const borders = createEmptyBorders(3);
      addOuterBorders(borders, 3);

      // Check middle horizontal borders remain false
      expect(borders.horizontal[1]).toEqual([false, false, false]);
      expect(borders.horizontal[2]).toEqual([false, false, false]);

      // Check middle vertical borders remain false
      expect(borders.vertical[0][1]).toBe(false);
      expect(borders.vertical[1][1]).toBe(false);
      expect(borders.vertical[2][1]).toBe(false);
    });

    it("should return same borders reference", () => {
      const borders = createEmptyBorders(2);
      const result = addOuterBorders(borders, 2);

      expect(result).toBe(borders); // Same reference
    });
  });

  describe("cloneBorders", () => {
    it("should create deep copy of borders", () => {
      const original = createEmptyBorders(2);
      addOuterBorders(original, 2);

      const cloned = cloneBorders(original);

      expect(cloned).not.toBe(original); // Different reference
      expect(cloned.horizontal).not.toBe(original.horizontal);
      expect(cloned.vertical).not.toBe(original.vertical);
      expect(bordersEqual(cloned, original)).toBe(true); // Same values
    });

    it("should allow independent modifications", () => {
      const original = createEmptyBorders(2);
      const cloned = cloneBorders(original);

      cloned.horizontal[1][0] = true;

      expect(original.horizontal[1][0]).toBe(false);
      expect(cloned.horizontal[1][0]).toBe(true);
    });
  });

  describe("bordersEqual", () => {
    it("should return true for identical borders", () => {
      const a = createEmptyBorders(3);
      const b = createEmptyBorders(3);

      expect(bordersEqual(a, b)).toBe(true);
    });

    it("should return true for cloned borders", () => {
      const original = createEmptyBorders(2);
      addOuterBorders(original, 2);
      const cloned = cloneBorders(original);

      expect(bordersEqual(original, cloned)).toBe(true);
    });

    it("should return false for different borders", () => {
      const a = createEmptyBorders(2);
      const b = createEmptyBorders(2);
      b.horizontal[1][0] = true;

      expect(bordersEqual(a, b)).toBe(false);
    });

    it("should return false for different grid sizes", () => {
      const a = createEmptyBorders(2);
      const b = createEmptyBorders(3);

      expect(bordersEqual(a, b)).toBe(false);
    });

    it("should detect vertical border differences", () => {
      const a = createEmptyBorders(2);
      const b = createEmptyBorders(2);
      b.vertical[0][1] = true;

      expect(bordersEqual(a, b)).toBe(false);
    });
  });
});

