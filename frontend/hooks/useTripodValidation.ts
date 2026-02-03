"use client";

import { useCallback, useMemo } from "react";
import type { Region, TripodError, VertexValidation } from "@/types/tripod";
import { REGION_COLORS } from "@/types/tripod";
import { isVertexWithinBounds } from "@/lib/tripod-utils";
import {
  findDuplicates,
  isGridComplete,
  getRowValues,
  getColValues,
} from "@/lib/validation-utils";
import {
  detectRegions as detectRegionsBase,
  type TripodBorders,
} from "@/lib/tripod-region-detection";

/**
 * Wrapper for detectRegions that adds frontend-specific region metadata
 */
function detectRegions(borders: TripodBorders, gridSize: number): Region[] {
  const baseRegions = detectRegionsBase(borders, gridSize);

  // Add frontend-specific metadata (color, isValid)
  return baseRegions.map((region) => ({
    ...region,
    color: REGION_COLORS[region.id % REGION_COLORS.length],
    isValid: region.size === gridSize,
  }));
}

function countBordersAtVertex(
  vRow: number,
  vCol: number,
  borders: TripodBorders,
  gridSize: number,
): number {
  // Validate bounds
  if (!isVertexWithinBounds(vRow, vCol, gridSize)) {
    return 0;
  }

  let count = 0;
  if (vCol > 0 && borders.horizontal[vRow]?.[vCol - 1]) count++;
  if (vCol < gridSize && borders.horizontal[vRow]?.[vCol]) count++;
  if (vRow > 0 && borders.vertical[vRow - 1]?.[vCol]) count++;
  if (vRow < gridSize && borders.vertical[vRow]?.[vCol]) count++;
  return count;
}

function validateVertex(
  vRow: number,
  vCol: number,
  borders: TripodBorders,
  tripodDots: boolean[][],
  gridSize: number,
): VertexValidation {
  // Check bounds first
  if (!isVertexWithinBounds(vRow, vCol, gridSize)) {
    return { isValid: true, borderCount: 0, hasDot: false, error: null }; // Out of bounds is not an error
  }

  const borderCount = countBordersAtVertex(vRow, vCol, borders, gridSize);
  const hasDot = tripodDots[vRow]?.[vCol] ?? false;
  let error: VertexValidation["error"] = null;
  let isValid = true;
  if (borderCount === 4) {
    error = "four_way_intersection";
    isValid = false;
  } else if (hasDot && borderCount !== 3) {
    error = "tripod_mismatch";
    isValid = false;
  } else if (!hasDot && borderCount === 3) {
    error = "missing_tripod_dot";
    isValid = false;
  }
  return { isValid, borderCount, hasDot, error };
}

interface UseTripodValidationProps {
  gridSize: number;
  cells: number[][];
  horizontalBorders: boolean[][];
  verticalBorders: boolean[][];
  tripodDots: boolean[][];
}

interface ValidationResult {
  isValid: boolean;
  errors: TripodError[];
  regions: Region[];
  isComplete: boolean;
}

export function useTripodValidation({
  gridSize,
  cells,
  horizontalBorders,
  verticalBorders,
  tripodDots,
}: UseTripodValidationProps) {
  // Memoize regions based on actual border values, not wrapper object
  const regions = useMemo(
    () =>
      detectRegions(
        { horizontal: horizontalBorders, vertical: verticalBorders },
        gridSize,
      ),
    [horizontalBorders, verticalBorders, gridSize],
  );

  // Create borders object for validation functions
  const borders: TripodBorders = useMemo(
    () => ({ horizontal: horizontalBorders, vertical: verticalBorders }),
    [horizontalBorders, verticalBorders],
  );

  const validateAll = useCallback((): ValidationResult => {
    const errors: TripodError[] = [];

    // Validate regions
    regions.forEach((region) => {
      if (region.size === 0) {
        // Skip empty regions (shouldn't happen but defensive)
        return;
      }
      if (region.size !== gridSize) {
        errors.push({
          type: "region_size",
          location: region.cells[0],
          message: `Region has ${region.size} cells, needs ${gridSize}`,
        });
      }
    });
    for (let r = 0; r <= gridSize; r++) {
      for (let c = 0; c <= gridSize; c++) {
        const validation = validateVertex(r, c, borders, tripodDots, gridSize);
        if (!validation.isValid && validation.error) {
          errors.push({
            type:
              validation.error === "four_way_intersection"
                ? "four_way"
                : "tripod_mismatch",
            location: { vertexRow: r, vertexCol: c },
            message: validation.error.replace(/_/g, " "),
          });
        }
      }
    }
    regions.forEach((region) => {
      const values = region.cells
        .map(({ row, col }) => cells[row]?.[col] ?? 0)
        .filter((v) => v !== 0);

      // Use shared utility for duplicate detection
      const duplicates = findDuplicates(values);

      // Report all duplicates in one error
      if (duplicates.size > 0) {
        errors.push({
          type: "sudoku_duplicate",
          location: region.cells[0],
          message: `Duplicate values in region: ${[...duplicates].join(", ")}`,
        });
      }
    });
    for (let r = 0; r < gridSize; r++) {
      const rowValues = getRowValues(cells, r);
      const duplicates = findDuplicates(rowValues);

      if (duplicates.size > 0) {
        errors.push({
          type: "sudoku_duplicate",
          location: { row: r, col: 0 },
          message: `Duplicate values in row ${r + 1}: ${[...duplicates].join(", ")}`,
        });
      }
    }
    for (let c = 0; c < gridSize; c++) {
      const colValues = getColValues(cells, c);
      const duplicates = findDuplicates(colValues);

      if (duplicates.size > 0) {
        errors.push({
          type: "sudoku_duplicate",
          location: { row: 0, col: c },
          message: `Duplicate values in column ${c + 1}: ${[...duplicates].join(", ")}`,
        });
      }
    }
    let isComplete = errors.length === 0;
    if (isComplete) {
      isComplete = isGridComplete(cells);
    }
    return { isValid: errors.length === 0, errors, regions, isComplete };
  }, [gridSize, cells, borders, tripodDots, regions]);

  // Memoize validation result to avoid recalculation
  const validationResult = useMemo(() => validateAll(), [validateAll]);

  const getCellErrors = useCallback(
    (row: number, col: number): TripodError[] => {
      return validationResult.errors.filter(
        (e) =>
          "row" in e.location &&
          e.location.row === row &&
          e.location.col === col,
      );
    },
    [validationResult],
  );

  const getVertexErrors = useCallback(
    (vertexRow: number, vertexCol: number): TripodError[] => {
      return validationResult.errors.filter(
        (e) =>
          "vertexRow" in e.location &&
          e.location.vertexRow === vertexRow &&
          e.location.vertexCol === vertexCol,
      );
    },
    [validationResult],
  );

  const isVertexSatisfied = useCallback(
    (vertexRow: number, vertexCol: number): boolean => {
      const hasDot = tripodDots[vertexRow]?.[vertexCol] ?? false;
      if (!hasDot) return false;
      return (
        countBordersAtVertex(vertexRow, vertexCol, borders, gridSize) === 3
      );
    },
    [tripodDots, borders, gridSize],
  );

  return {
    regions,
    validateAll,
    getCellErrors,
    getVertexErrors,
    isVertexSatisfied,
  };
}
