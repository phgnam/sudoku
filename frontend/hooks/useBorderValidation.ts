'use client';

import { useCallback } from 'react';

interface UseBorderValidationProps {
  gridSize: number;
  horizontalBorders: boolean[][];
  verticalBorders: boolean[][];
}

interface ToggleResult {
  allowed: boolean;
  reason?: string;
}

interface AffectedVertex {
  row: number;
  col: number;
}

/**
 * Hook to validate border toggles in real-time
 * Prevents creating 4-way intersections at vertices
 */
export function useBorderValidation({
  gridSize,
  horizontalBorders,
  verticalBorders,
}: UseBorderValidationProps) {
  /**
   * Count borders meeting at a vertex (in vertex coordinates)
   * Vertex (vRow, vCol) is at the intersection point between cells
   * 
   * For a vertex at (vRow, vCol):
   * - Left horizontal border: horizontalBorders[vRow][vCol - 1] (if vCol > 0)
   * - Right horizontal border: horizontalBorders[vRow][vCol] (if vCol < gridSize)
   * - Top vertical border: verticalBorders[vRow - 1][vCol] (if vRow > 0)
   * - Bottom vertical border: verticalBorders[vRow][vCol] (if vRow < gridSize)
   */
  const countBordersAtVertex = useCallback((vRow: number, vCol: number): number => {
    let count = 0;

    // Left horizontal border
    if (vCol > 0 && horizontalBorders[vRow]?.[vCol - 1]) {
      count++;
    }
    // Right horizontal border
    if (vCol < gridSize && horizontalBorders[vRow]?.[vCol]) {
      count++;
    }
    // Top vertical border
    if (vRow > 0 && verticalBorders[vRow - 1]?.[vCol]) {
      count++;
    }
    // Bottom vertical border
    if (vRow < gridSize && verticalBorders[vRow]?.[vCol]) {
      count++;
    }

    return count;
  }, [gridSize, horizontalBorders, verticalBorders]);

  /**
   * Get vertices affected by toggling a border
   * 
   * For horizontal border at (row, col):
   *   - Affects vertex (row, col) on the left
   *   - Affects vertex (row, col + 1) on the right
   * 
   * For vertical border at (row, col):
   *   - Affects vertex (row, col) on the top
   *   - Affects vertex (row + 1, col) on the bottom
   */
  const getAffectedVertices = useCallback((type: 'h' | 'v', row: number, col: number): AffectedVertex[] => {
    if (type === 'h') {
      // Horizontal border affects vertices at both ends
      return [
        { row, col },         // Left vertex
        { row, col: col + 1 } // Right vertex
      ];
    } else {
      // Vertical border affects vertices at both ends
      return [
        { row, col },         // Top vertex
        { row: row + 1, col } // Bottom vertex
      ];
    }
  }, []);

  /**
   * Check if toggling a border would create a 4-way intersection
   */
  const wouldCreate4Way = useCallback((type: 'h' | 'v', row: number, col: number): boolean => {
    // Check if border is currently active
    const isCurrentlyActive = type === 'h' 
      ? horizontalBorders[row]?.[col] ?? false
      : verticalBorders[row]?.[col] ?? false;

    // If turning off, never creates 4-way
    if (isCurrentlyActive) {
      return false;
    }

    // Get affected vertices
    const vertices = getAffectedVertices(type, row, col);

    // Check each vertex - if toggling ON would bring any to 4 borders
    for (const vertex of vertices) {
      const currentCount = countBordersAtVertex(vertex.row, vertex.col);
      // Adding this border would increase count by 1
      if (currentCount + 1 >= 4) {
        return true;
      }
    }

    return false;
  }, [horizontalBorders, verticalBorders, getAffectedVertices, countBordersAtVertex]);

  /**
   * Check if a border can be toggled
   * Returns allowed status and reason if not allowed
   */
  const canToggleBorder = useCallback((type: 'h' | 'v', row: number, col: number): ToggleResult => {
    // Check if border is currently active
    const isCurrentlyActive = type === 'h'
      ? horizontalBorders[row]?.[col] ?? false
      : verticalBorders[row]?.[col] ?? false;

    // Always allow turning off a border
    if (isCurrentlyActive) {
      return { allowed: true };
    }

    // Check if turning on would create 4-way
    if (wouldCreate4Way(type, row, col)) {
      return { 
        allowed: false, 
        reason: 'Cannot create 4-way intersection!' 
      };
    }

    return { allowed: true };
  }, [horizontalBorders, verticalBorders, wouldCreate4Way]);

  /**
   * Check if a specific border would create 4-way if toggled on
   * Useful for visual feedback on hover
   */
  const getBorderToggleability = useCallback((type: 'h' | 'v', row: number, col: number): 'can_toggle_on' | 'can_toggle_off' | 'blocked' => {
    const isCurrentlyActive = type === 'h'
      ? horizontalBorders[row]?.[col] ?? false
      : verticalBorders[row]?.[col] ?? false;

    if (isCurrentlyActive) {
      return 'can_toggle_off';
    }

    if (wouldCreate4Way(type, row, col)) {
      return 'blocked';
    }

    return 'can_toggle_on';
  }, [horizontalBorders, verticalBorders, wouldCreate4Way]);

  return {
    canToggleBorder,
    getAffectedVertices,
    countBordersAtVertex,
    wouldCreate4Way,
    getBorderToggleability,
  };
}

