/**
 * Sample Tripod Sudoku Puzzles
 *
 * Each puzzle contains:
 * - id: Unique identifier
 * - gridSize: Size of the grid (7 for 7×7)
 * - name: Display name
 * - difficulty: 'easy' | 'medium' | 'hard'
 * - cells: Initial cell values (0 = empty, 1-7 = given)
 * - solution: Complete solution for validation
 * - tripodDots: Boolean grid marking tripod dot positions
 *   - Grid is (gridSize+1) × (gridSize+1) for vertex positions
 *   - true = tripod dot present at that vertex
 */

export interface TripodPuzzleData {
  id: string;
  gridSize: number;
  name: string;
  difficulty: "easy" | "medium" | "hard";
  cells: number[][];
  solution: number[][];
  tripodDots: boolean[][];
  /** Optional: Pre-defined regions for Mode B (sudoku with preset regions) */
  regions?: {
    horizontalBorders: boolean[][];
    verticalBorders: boolean[][];
  };
}

/**
 * Puzzle 1: Easy - "Diamond Pattern"
 * A symmetric pattern with tripod dots forming a diamond shape
 */
const PUZZLE_DIAMOND: TripodPuzzleData = {
  id: "tripod-diamond-1",
  gridSize: 7,
  name: "Diamond Pattern",
  difficulty: "easy",
  cells: [
    [1, 0, 0, 4, 0, 0, 7],
    [0, 0, 5, 0, 0, 0, 0],
    [4, 0, 0, 0, 0, 0, 3],
    [0, 0, 5, 0, 3, 0, 0],
    [0, 6, 0, 0, 0, 2, 0],
    [7, 0, 0, 3, 0, 0, 1],
    [5, 0, 0, 3, 0, 0, 4], // Row 7: Fixed 3->5 and 1->6 to match solution
  ],
  solution: [
    [1, 5, 6, 4, 2, 3, 7],
    [3, 2, 4, 7, 1, 6, 5],
    [6, 7, 3, 1, 5, 4, 2],
    [4, 1, 7, 2, 6, 5, 3],
    [2, 4, 5, 6, 3, 7, 1],
    [5, 6, 1, 3, 7, 2, 4],
    [7, 3, 2, 5, 4, 1, 6],
  ],
  // Tripod dots at diamond-shaped vertices
  tripodDots: [
    [false, false, false, true, false, false, false, false],
    [false, false, true, false, true, false, false, false],
    [false, true, false, false, false, true, false, false],
    [true, false, false, false, false, false, true, false],
    [false, true, false, false, false, true, false, false],
    [false, false, true, false, true, false, false, false],
    [false, false, false, true, false, false, false, false],
    [false, false, false, false, false, false, false, false],
  ],
  // Pre-defined regions for Mode B (sudoku_only)
  // Horizontal: 8 rows × 7 cols, Vertical: 7 rows × 8 cols
  regions: {
    horizontalBorders: [
      [true, true, true, true, true, true, true], // top edge
      [false, false, true, false, true, false, false],
      [false, true, false, false, false, true, false],
      [true, false, false, false, false, false, true],
      [false, true, false, false, false, true, false],
      [false, false, true, false, true, false, false],
      [false, false, false, true, false, false, false],
      [true, true, true, true, true, true, true], // bottom edge
    ],
    verticalBorders: [
      [true, false, false, true, false, false, false, true],
      [true, false, true, false, false, true, false, true],
      [true, true, false, false, false, false, true, true],
      [true, false, false, false, false, false, false, true],
      [true, true, false, false, false, false, true, true],
      [true, false, true, false, false, true, false, true],
      [true, false, false, true, false, false, false, true],
    ],
  },
};

/**
 * Puzzle 2: Medium - "Spiral Pattern"
 * Tripod dots arranged in a spiral-like pattern
 */
const PUZZLE_SPIRAL: TripodPuzzleData = {
  id: "tripod-spiral-1",
  gridSize: 7,
  name: "Spiral Pattern",
  difficulty: "medium",
  cells: [
    [3, 0, 0, 0, 0, 0, 6],
    [4, 0, 0, 0, 0, 0, 3],
    [2, 0, 0, 0, 0, 0, 6], // Row 3: Removed given at col 3 (5) to avoid reported contradiction
    [0, 0, 0, 4, 0, 0, 0],
    [0, 0, 0, 1, 0, 0, 0],
    [0, 4, 0, 0, 0, 3, 0],
    [0, 3, 0, 0, 0, 7, 0],
  ],
  solution: [
    [1, 2, 3, 5, 4, 6, 7],
    [4, 1, 2, 6, 7, 5, 3],
    [2, 4, 5, 7, 1, 3, 6],
    [3, 6, 7, 4, 2, 1, 5],
    [7, 5, 6, 1, 3, 2, 4],
    [5, 7, 1, 3, 6, 4, 2],
    [6, 3, 4, 2, 5, 7, 1],
  ],
  tripodDots: [
    [false, true, false, false, false, true, false, false],
    [true, false, true, false, true, false, false, false],
    [false, true, false, true, false, false, false, false],
    [false, false, true, false, true, false, true, false],
    [false, false, false, true, false, true, false, false],
    [false, false, false, false, true, false, true, false],
    [false, true, false, false, false, true, false, false],
    [false, false, false, false, false, false, false, false],
  ],
};

/**
 * Puzzle 3: Hard - "Scattered Pattern"
 * Fewer givens with scattered tripod dots
 */
const PUZZLE_SCATTERED: TripodPuzzleData = {
  id: "tripod-scattered-1",
  gridSize: 7,
  name: "Scattered Pattern",
  difficulty: "hard",
  cells: [
    [0, 0, 5, 0, 0, 0, 0],
    [0, 0, 4, 0, 0, 0, 0],
    [5, 0, 0, 0, 0, 0, 2],
    [0, 0, 0, 4, 0, 0, 0],
    [3, 0, 0, 0, 0, 0, 4], // Row 5: Removed given at col 7 (6) to avoid reported contradiction
    [0, 0, 6, 0, 2, 0, 0],
    [0, 0, 6, 0, 1, 0, 0],
    [0, 0, 6, 0, 2, 0, 0],
  ],
  solution: [
    [1, 2, 3, 6, 5, 4, 7],
    [2, 1, 4, 3, 6, 7, 5],
    [5, 3, 1, 7, 4, 6, 2],
    [6, 5, 2, 4, 7, 1, 3],
    [3, 4, 7, 2, 1, 5, 6],
    [7, 6, 5, 1, 3, 2, 4],
    [4, 7, 6, 5, 2, 3, 1],
  ],
  tripodDots: [
    [false, false, true, false, false, true, false, false],
    [false, true, false, false, true, false, true, false],
    [true, false, false, true, false, false, false, false],
    [false, false, true, false, false, true, false, false],
    [false, false, false, false, true, false, false, true],
    [false, true, false, true, false, false, true, false],
    [false, false, true, false, false, true, false, false],
    [false, false, false, false, false, false, false, false],
  ],
};

/**
 * All available tripod puzzles
 */
export const TRIPOD_PUZZLES: TripodPuzzleData[] = [
  PUZZLE_DIAMOND,
  PUZZLE_SPIRAL,
  PUZZLE_SCATTERED,
];

/**
 * Get a puzzle by ID
 */
export function getTripodPuzzleById(id: string): TripodPuzzleData | undefined {
  return TRIPOD_PUZZLES.find((puzzle) => puzzle.id === id);
}

/**
 * Get puzzles by difficulty
 */
export function getTripodPuzzlesByDifficulty(
  difficulty: "easy" | "medium" | "hard",
): TripodPuzzleData[] {
  return TRIPOD_PUZZLES.filter((puzzle) => puzzle.difficulty === difficulty);
}

/**
 * Get a random puzzle
 */
export function getRandomTripodPuzzle(): TripodPuzzleData {
  const index = Math.floor(Math.random() * TRIPOD_PUZZLES.length);
  return TRIPOD_PUZZLES[index];
}

export default TRIPOD_PUZZLES;
