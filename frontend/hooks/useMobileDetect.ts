'use client';

import { useState, useEffect, useCallback } from 'react';

interface MobileDetectResult {
  /** Whether the device is likely mobile based on screen size */
  isMobile: boolean;
  /** Whether the device supports touch input */
  isTouchDevice: boolean;
  /** Current viewport width in pixels */
  viewportWidth: number;
  /** Current viewport height in pixels */
  viewportHeight: number;
  /** Whether the device is in portrait orientation */
  isPortrait: boolean;
  /** Calculate optimal cell size for grid based on viewport */
  getOptimalCellSize: (gridSize: number, padding?: number) => number;
}

const MOBILE_BREAKPOINT = 768;
const MIN_CELL_SIZE = 36;
const MAX_CELL_SIZE = 56;

/**
 * Hook to detect mobile device characteristics and viewport dimensions.
 * Useful for responsive game layouts and touch optimization.
 */
export function useMobileDetect(): MobileDetectResult {
  const [state, setState] = useState<{
    viewportWidth: number;
    viewportHeight: number;
    isTouchDevice: boolean;
  }>({
    viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 1024,
    viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 768,
    isTouchDevice: false,
  });

  useEffect(() => {
    // Detect touch capability
    const checkTouchDevice = () => {
      return (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-expect-error - msMaxTouchPoints is non-standard
        navigator.msMaxTouchPoints > 0
      );
    };

    const handleResize = () => {
      setState({
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        isTouchDevice: checkTouchDevice(),
      });
    };

    // Initial check
    handleResize();

    // Listen for resize events
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const isMobile = state.viewportWidth < MOBILE_BREAKPOINT;
  const isPortrait = state.viewportHeight > state.viewportWidth;

  /**
   * Calculate optimal cell size for the grid based on viewport.
   * @param gridSize - Number of cells in the grid (e.g., 7 for 7x7)
   * @param padding - Total horizontal padding (default: 32 for 16px on each side)
   */
  const getOptimalCellSize = useCallback(
    (gridSize: number, padding: number = 32): number => {
      // Calculate available width for the grid
      const availableWidth = state.viewportWidth - padding;
      
      // Calculate cell size that fits the grid in available width
      // Add extra 4px for grid container padding
      const calculatedSize = Math.floor((availableWidth - 4) / gridSize);
      
      // Clamp between min and max cell sizes
      return Math.max(MIN_CELL_SIZE, Math.min(MAX_CELL_SIZE, calculatedSize));
    },
    [state.viewportWidth]
  );

  return {
    isMobile,
    isTouchDevice: state.isTouchDevice,
    viewportWidth: state.viewportWidth,
    viewportHeight: state.viewportHeight,
    isPortrait,
    getOptimalCellSize,
  };
}

export default useMobileDetect;

