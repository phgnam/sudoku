'use client';

import { useEffect, useCallback } from 'react';
import { useGameStore } from '@/store/game';
import type { TripodInputMode } from '@/types/tripod';

interface UseTripodInputOptions {
  gridSize: number;
  onNumberInput: (num: number) => void;
  onCellMove: (direction: 'up' | 'down' | 'left' | 'right') => void;
}

export function useTripodInput({ gridSize, onNumberInput, onCellMove }: UseTripodInputOptions) {
  const tripod = useGameStore((state) => state.tripod);
  const setTripodInputMode = useGameStore((state) => state.setTripodInputMode);
  
  const inputMode = tripod?.inputMode ?? 'number';
  
  const toggleMode = useCallback(() => {
    const newMode: TripodInputMode = inputMode === 'number' ? 'border' : 'number';
    setTripodInputMode(newMode);
  }, [inputMode, setTripodInputMode]);
  
  const setMode = useCallback((mode: TripodInputMode) => {
    setTripodInputMode(mode);
  }, [setTripodInputMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Space to toggle mode
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        toggleMode();
        return;
      }
      
      // B for border mode
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        setMode('border');
        return;
      }
      
      // N for number mode
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setMode('number');
        return;
      }
      
      // Arrow keys for cell navigation
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        onCellMove('up');
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        onCellMove('down');
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onCellMove('left');
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        onCellMove('right');
        return;
      }
      
      // Number input (1-7 for 7x7 grid, 1-9 for 9x9)
      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num >= 1 && num <= gridSize) {
        e.preventDefault();
        onNumberInput(num);
        return;
      }
      
      // Delete/Backspace to clear cell
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onNumberInput(0);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gridSize, inputMode, onNumberInput, onCellMove, toggleMode, setMode]);

  return {
    inputMode,
    toggleMode,
    setMode,
  };
}

