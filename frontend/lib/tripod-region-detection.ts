/**
 * Tripod Region Detection Utility
 * Shared between frontend and backend to detect connected regions using BFS
 */

export interface TripodBorders {
  horizontal: boolean[][];
  vertical: boolean[][];
}

export interface Region {
  id: number;
  cells: Array<{ row: number; col: number }>;
  size: number;
}

/**
 * Safety cap for BFS to prevent infinite loops
 * Scale with gridSize - max possible cells = gridSize^2, so 2x that is safe
 */
export function getMaxBfsIterations(gridSize: number): number {
  return gridSize * gridSize * 2;
}

/**
 * Detect connected regions in a tripod grid using BFS
 * 
 * @param borders - Horizontal and vertical border configuration
 * @param gridSize - Size of the grid (NxN)
 * @returns Array of detected regions with their cells
 * 
 * @example
 * const borders = {
 *   horizontal: [[false, true], [true, false]],
 *   vertical: [[true, false], [false, true]]
 * };
 * const regions = detectRegions(borders, 2);
 * // Returns regions based on border connectivity
 */
export function detectRegions(
  borders: TripodBorders,
  gridSize: number
): Region[] {
  const visited: boolean[][] = Array.from({ length: gridSize }, () =>
    Array.from({ length: gridSize }, () => false)
  );

  const regions: Region[] = [];
  let regionId = 0;

  // Scan entire grid to find all regions
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      if (!visited[r][c]) {
        const cells = bfs(r, c, borders, visited, gridSize);
        if (cells.length > 0) {
          regions.push({
            id: regionId++,
            cells,
            size: cells.length,
          });
        }
      }
    }
  }

  return regions;
}

/**
 * Breadth-First Search to find all connected cells in a region
 * 
 * @param startR - Starting row
 * @param startC - Starting column
 * @param borders - Border configuration
 * @param visited - Visited cells tracker (mutated)
 * @param gridSize - Size of the grid
 * @returns Array of cells in the connected region
 */
function bfs(
  startR: number,
  startC: number,
  borders: TripodBorders,
  visited: boolean[][],
  gridSize: number
): Array<{ row: number; col: number }> {
  const queue: Array<{ row: number; col: number }> = [
    { row: startR, col: startC },
  ];
  
  // Mark start node as visited immediately
  visited[startR][startC] = true;

  const cells: Array<{ row: number; col: number }> = [];
  let iterations = 0;
  const MAX_BFS_ITERATIONS = getMaxBfsIterations(gridSize);

  while (queue.length > 0) {
    // Safety check to prevent infinite loops
    if (++iterations > MAX_BFS_ITERATIONS) {
      console.error(
        `BFS exceeded maximum iterations (${MAX_BFS_ITERATIONS}). Possible infinite loop detected.`
      );
      // Return partial results instead of continuing
      return cells;
    }

    const { row, col } = queue.shift()!;
    cells.push({ row, col });

    // Helper to check and enqueue neighbor if valid and not visited
    const checkAndEnqueue = (r: number, c: number, hasBorder: boolean) => {
      if (
        r >= 0 &&
        r < gridSize &&
        c >= 0 &&
        c < gridSize &&
        !visited[r]?.[c] &&
        !hasBorder
      ) {
        visited[r][c] = true; // Mark visited immediately
        queue.push({ row: r, col: c });
      }
    };

    // Check all four neighbors (Up, Down, Left, Right)
    
    // Up: check horizontal border at [row][col]
    checkAndEnqueue(
      row - 1,
      col,
      row > 0 && borders.horizontal[row]?.[col] === true
    );

    // Down: check horizontal border at [row+1][col]
    checkAndEnqueue(
      row + 1,
      col,
      row < gridSize - 1 && borders.horizontal[row + 1]?.[col] === true
    );

    // Left: check vertical border at [row][col]
    checkAndEnqueue(
      row,
      col - 1,
      col > 0 && borders.vertical[row]?.[col] === true
    );

    // Right: check vertical border at [row][col+1]
    checkAndEnqueue(
      row,
      col + 1,
      col < gridSize - 1 && borders.vertical[row]?.[col + 1] === true
    );
  }

  return cells;
}

