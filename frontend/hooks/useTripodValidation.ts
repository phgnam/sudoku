"use client";

import { useCallback, useMemo } from "react";
import type { Region, TripodError, VertexValidation } from "@/types/tripod";
import { REGION_COLORS } from "@/types/tripod";
import { TRIPOD_CONSTANTS } from "@/lib/tripod-constants";
import { isVertexWithinBounds } from "@/lib/tripod-utils";

interface TripodBorders {
  horizontal: boolean[][];
  vertical: boolean[][];
}

function detectRegions(borders: TripodBorders, gridSize: number): Region[] {
  const visited: boolean[][] = Array(gridSize)
    .fill(null)
    .map(() => Array(gridSize).fill(false));
  const regions: Region[] = [];
  let regionId = 0;

  const bfs = (
    startR: number,
    startC: number,
  ): Array<{ row: number; col: number }> => {
    const queue: Array<{ row: number; col: number }> = [];
    const cells: Array<{ row: number; col: number }> = [];

    // Mark start cell as visited and add to queue
    visited[startR][startC] = true;
    queue.push({ row: startR, col: startC });

    let iterations = 0;

    while (queue.length > 0) {
      // Prevent infinite loops
      if (++iterations > TRIPOD_CONSTANTS.MAX_BFS_ITERATIONS) {
        console.error(
          "BFS exceeded maximum iterations, possible infinite loop",
        );
        break;
      }

      const { row, col } = queue.shift()!;
      cells.push({ row, col });

      // Check all four neighbors
      const neighbors = [
        {
          r: row - 1,
          c: col,
          hasBorder: row > 0 && borders.horizontal[row]?.[col],
        },
        {
          r: row + 1,
          c: col,
          hasBorder: row < gridSize - 1 && borders.horizontal[row + 1]?.[col],
        },
        {
          r: row,
          c: col - 1,
          hasBorder: col > 0 && borders.vertical[row]?.[col],
        },
        {
          r: row,
          c: col + 1,
          hasBorder: col < gridSize - 1 && borders.vertical[row]?.[col + 1],
        },
      ];

      for (const { r, c, hasBorder } of neighbors) {
        // Check bounds
        if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) continue;

        // Skip if already visited
        if (visited[r]?.[c]) continue;

        // Skip if there's a border blocking this neighbor
        if (hasBorder) continue;

        // Mark as visited and add to queue
        visited[r][c] = true;
        queue.push({ row: r, col: c });
      }
    }
    return cells;
  };

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (!visited[r][c]) {
        const cells = bfs(r, c);
        if (cells.length > 0) {
          // Skip empty regions
          regions.push({
            id: regionId,
            cells,
            size: cells.length,
            color: REGION_COLORS[regionId % REGION_COLORS.length],
            isValid: cells.length === gridSize,
          });
          regionId++;
        }
      }
    }
  }
  return regions;
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

      // Track duplicates efficiently
      const duplicates = new Set<number>();
      const seen = new Set<number>();
      values.forEach((v) => {
        if (seen.has(v)) duplicates.add(v);
        seen.add(v);
      });

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
      const rowValues = (cells[r] ?? []).filter((v) => v !== 0);

      const duplicates = new Set<number>();
      const seen = new Set<number>();
      rowValues.forEach((v) => {
        if (seen.has(v)) duplicates.add(v);
        seen.add(v);
      });

      if (duplicates.size > 0) {
        errors.push({
          type: "sudoku_duplicate",
          location: { row: r, col: 0 },
          message: `Duplicate values in row ${r + 1}: ${[...duplicates].join(", ")}`,
        });
      }
    }
    for (let c = 0; c < gridSize; c++) {
      const colValues = cells
        .map((row) => row?.[c] ?? 0)
        .filter((v) => v !== 0);

      const duplicates = new Set<number>();
      const seen = new Set<number>();
      colValues.forEach((v) => {
        if (seen.has(v)) duplicates.add(v);
        seen.add(v);
      });

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
      outer: for (let r = 0; r < gridSize; r++) {
        for (let c = 0; c < gridSize; c++) {
          if (!cells[r]?.[c] || cells[r][c] === 0) {
            isComplete = false;
            break outer;
          }
        }
      }
    }
    return { isValid: errors.length === 0, errors, regions, isComplete };
  }, [gridSize, cells, borders, tripodDots, regions]);

  const getCellErrors = useCallback(
    (row: number, col: number): TripodError[] => {
      return validateAll().errors.filter(
        (e) =>
          "row" in e.location &&
          e.location.row === row &&
          e.location.col === col,
      );
    },
    [validateAll],
  );

  const getVertexErrors = useCallback(
    (vertexRow: number, vertexCol: number): TripodError[] => {
      return validateAll().errors.filter(
        (e) =>
          "vertexRow" in e.location &&
          e.location.vertexRow === vertexRow &&
          e.location.vertexCol === vertexCol,
      );
    },
    [validateAll],
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
