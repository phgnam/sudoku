"use client";

import { useState, useCallback, useRef } from "react";
import { useTripodStore } from "@/store/tripod";
import { useTripodInput } from "./useTripodInput";
import { useBorderValidation } from "./useBorderValidation";
import { toast } from "@/components/ui/Toast";
import type { TripodInputMode } from "@/types/tripod";
import { TRIPOD_CONSTANTS } from "@/lib/tripod-constants";
import { isWithinBounds } from "@/lib/tripod-utils";

interface UseTripodGameOptions {
  gridSize?: number;
  onBorderToggle?: (type: "h" | "v", row: number, col: number) => void;
}

export function useTripodGame({
  gridSize = 7,
  onBorderToggle,
}: UseTripodGameOptions = {}) {
  const [selectedCell, setSelectedCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [cells, setCells] = useState<number[][]>(() =>
    Array(gridSize)
      .fill(null)
      .map(() => Array(gridSize).fill(0)),
  );
  const [givenCells, setGivenCells] = useState<boolean[][]>(() =>
    Array(gridSize)
      .fill(null)
      .map(() => Array(gridSize).fill(false)),
  );

  // Debounce ref for border toggle
  const lastBorderToggleRef = useRef<number>(0);

  const tripod = useTripodStore((state) => state.tripod);
  const toggleBorder = useTripodStore((state) => state.toggleBorder);

  // Border validation hook
  const { canToggleBorder, getBorderToggleability } = useBorderValidation({
    gridSize: tripod?.gridSize ?? gridSize,
    horizontalBorders: tripod?.horizontalBorders ?? [],
    verticalBorders: tripod?.verticalBorders ?? [],
  });

  const handleNumberInput = useCallback(
    (num: number) => {
      if (!selectedCell) return;
      const { row, col } = selectedCell;

      // Validate cell is within bounds
      if (!isWithinBounds(row, col, gridSize)) {
        console.warn(
          `Cell (${row}, ${col}) is out of bounds for grid size ${gridSize}`,
        );
        return;
      }

      // Don't modify given cells
      if (givenCells[row]?.[col]) return;

      // Validate number is within valid range (0 to gridSize)
      if (num < 0 || num > gridSize) {
        console.warn(
          `Invalid number input: ${num}. Must be between 0 and ${gridSize}`,
        );
        return;
      }

      // Check subMode restrictions
      if (tripod?.subMode === "borders_only") {
        console.warn("Number input disabled in borders_only mode");
        return;
      }

      setCells((prev) => {
        const newCells = prev.map((r) => [...r]);
        newCells[row][col] = num;
        return newCells;
      });
    },
    [selectedCell, givenCells, gridSize, tripod?.subMode],
  );

  const handleCellMove = useCallback(
    (direction: "up" | "down" | "left" | "right") => {
      if (!selectedCell) {
        setSelectedCell({ row: 0, col: 0 });
        return;
      }

      const { row, col } = selectedCell;
      let newRow = row;
      let newCol = col;

      switch (direction) {
        case "up":
          newRow = Math.max(0, row - 1);
          break;
        case "down":
          newRow = Math.min(gridSize - 1, row + 1);
          break;
        case "left":
          newCol = Math.max(0, col - 1);
          break;
        case "right":
          newCol = Math.min(gridSize - 1, col + 1);
          break;
      }

      // Additional bounds validation
      if (!isWithinBounds(newRow, newCol, gridSize)) {
        console.warn(`Cannot move to (${newRow}, ${newCol}), out of bounds`);
        return;
      }

      setSelectedCell({ row: newRow, col: newCol });
    },
    [selectedCell, gridSize],
  );

  const { inputMode, toggleMode, setMode } = useTripodInput({
    gridSize,
    onNumberInput: handleNumberInput,
    onCellMove: handleCellMove,
  });

  const handleCellSelect = useCallback((row: number, col: number) => {
    setSelectedCell({ row, col });
  }, []);

  const handleBorderToggle = useCallback(
    (type: "h" | "v", row: number, col: number) => {
      // Check input mode
      if (inputMode !== "border") return;

      // Check subMode restrictions
      if (tripod?.subMode === "sudoku_only") {
        console.warn("Border editing disabled in sudoku_only mode");
        return;
      }

      // Debounce check to prevent rapid concurrent toggles
      const now = Date.now();
      if (
        now - lastBorderToggleRef.current <
        TRIPOD_CONSTANTS.BORDER_TOGGLE_DEBOUNCE_MS
      ) {
        console.log("Border toggle debounced");
        return;
      }
      lastBorderToggleRef.current = now;

      // Validate border toggle before executing
      const result = canToggleBorder(type, row, col);

      if (!result.allowed) {
        // Show toast notification
        toast.error(result.reason || "Cannot toggle border", 2500);
        return;
      }

      toggleBorder(type, row, col);
      onBorderToggle?.(type, row, col);
    },
    [inputMode, tripod?.subMode, toggleBorder, canToggleBorder, onBorderToggle],
  );

  const handleModeChange = useCallback(
    (mode: TripodInputMode) => {
      setMode(mode);
    },
    [setMode],
  );

  // Initialize game with puzzle data
  const initializeGame = useCallback(
    (puzzleData: {
      cells: number[][];
      givens: Array<{ row: number; col: number; value: number }>;
    }) => {
      // Use actual puzzle grid size, not the hook's gridSize parameter
      const actualGridSize = puzzleData.cells.length;
      const newCells = puzzleData.cells.map((row) => [...row]);
      const newGivens = Array(actualGridSize)
        .fill(null)
        .map(() => Array(actualGridSize).fill(false));

      puzzleData.givens.forEach(({ row, col }) => {
        // Validate bounds before setting
        if (
          row >= 0 &&
          row < actualGridSize &&
          col >= 0 &&
          col < actualGridSize
        ) {
          newGivens[row][col] = true;
        } else {
          console.warn(
            `Given cell (${row}, ${col}) is out of bounds for grid size ${actualGridSize}`,
          );
        }
      });

      setCells(newCells);
      setGivenCells(newGivens);
    },
    [], // Remove gridSize dependency - use puzzle data instead
  );

  return {
    // State
    cells,
    givenCells,
    selectedCell,
    inputMode,
    tripod,

    // Actions
    handleCellSelect,
    handleBorderToggle,
    handleNumberInput,
    handleModeChange,
    toggleMode,
    initializeGame,
    setCells,
    setSelectedCell,

    // Border validation helpers for UI
    getBorderToggleability,
  };
}
