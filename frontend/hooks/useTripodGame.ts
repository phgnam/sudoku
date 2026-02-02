'use client';

import { useState, useCallback } from 'react';
import { useGameStore } from '@/store/game';
import { useTripodInput } from './useTripodInput';
import { useBorderValidation } from './useBorderValidation';
import { toast } from '@/components/ui/Toast';
import type { TripodInputMode } from '@/types/tripod';

interface UseTripodGameOptions {
  gridSize?: number;
}

export function useTripodGame({ gridSize = 7 }: UseTripodGameOptions = {}) {
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [cells, setCells] = useState<number[][]>(() =>
    Array(gridSize).fill(null).map(() => Array(gridSize).fill(0))
  );
  const [givenCells, setGivenCells] = useState<boolean[][]>(() =>
    Array(gridSize).fill(null).map(() => Array(gridSize).fill(false))
  );

  const tripod = useGameStore((state) => state.tripod);
  const toggleTripodBorder = useGameStore((state) => state.toggleTripodBorder);

  // Border validation hook
  const { canToggleBorder, getBorderToggleability } = useBorderValidation({
    gridSize: tripod?.gridSize ?? gridSize,
    horizontalBorders: tripod?.horizontalBorders ?? [],
    verticalBorders: tripod?.verticalBorders ?? [],
  });

  const handleNumberInput = useCallback((num: number) => {
    if (!selectedCell) return;
    const { row, col } = selectedCell;

    // Don't modify given cells
    if (givenCells[row]?.[col]) return;

    setCells((prev) => {
      const newCells = prev.map((r) => [...r]);
      newCells[row][col] = num;
      return newCells;
    });
  }, [selectedCell, givenCells]);

  const handleCellMove = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (!selectedCell) {
      setSelectedCell({ row: 0, col: 0 });
      return;
    }

    const { row, col } = selectedCell;
    let newRow = row;
    let newCol = col;

    switch (direction) {
      case 'up':
        newRow = Math.max(0, row - 1);
        break;
      case 'down':
        newRow = Math.min(gridSize - 1, row + 1);
        break;
      case 'left':
        newCol = Math.max(0, col - 1);
        break;
      case 'right':
        newCol = Math.min(gridSize - 1, col + 1);
        break;
    }

    setSelectedCell({ row: newRow, col: newCol });
  }, [selectedCell, gridSize]);

  const { inputMode, toggleMode, setMode } = useTripodInput({
    gridSize,
    onNumberInput: handleNumberInput,
    onCellMove: handleCellMove,
  });

  const handleCellSelect = useCallback((row: number, col: number) => {
    setSelectedCell({ row, col });
  }, []);

  const handleBorderToggle = useCallback((type: 'h' | 'v', row: number, col: number) => {
    if (inputMode !== 'border') return;

    // Validate border toggle before executing
    const result = canToggleBorder(type, row, col);

    if (!result.allowed) {
      // Show toast notification
      toast.error(result.reason || 'Cannot toggle border', 2500);
      return;
    }

    toggleTripodBorder(type, row, col);
  }, [inputMode, toggleTripodBorder, canToggleBorder]);

  const handleModeChange = useCallback((mode: TripodInputMode) => {
    setMode(mode);
  }, [setMode]);

  // Initialize game with puzzle data
  const initializeGame = useCallback((puzzleData: {
    cells: number[][];
    givens: Array<{ row: number; col: number; value: number }>;
  }) => {
    const newCells = puzzleData.cells.map((row) => [...row]);
    const newGivens = Array(gridSize).fill(null).map(() => Array(gridSize).fill(false));

    puzzleData.givens.forEach(({ row, col }) => {
      newGivens[row][col] = true;
    });

    setCells(newCells);
    setGivenCells(newGivens);
  }, [gridSize]);

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

