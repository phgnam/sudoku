/**
 * Tripod Sudoku Types
 * Types for the Tripod Sudoku game mode
 */

export interface BorderHistoryEntry {
  type: 'h' | 'v';
  row: number;
  col: number;
  value: boolean; // value BEFORE the change
}

export interface TripodBorders {
  horizontal: boolean[][]; // gridSize × (gridSize+1)
  vertical: boolean[][];   // (gridSize+1) × gridSize
}

export interface Region {
  id: number;
  cells: Array<{ row: number; col: number }>;
  size: number;
  color: string;
  isValid: boolean;
}

export interface TripodError {
  type: 'region_size' | 'not_connected' | 'four_way' | 'tripod_mismatch' | 'sudoku_duplicate';
  location: { row: number; col: number } | { vertexRow: number; vertexCol: number };
  message: string;
}

export interface VertexValidation {
  isValid: boolean;
  borderCount: number;
  hasDot: boolean;
  error: 'four_way_intersection' | 'tripod_mismatch' | 'missing_tripod_dot' | null;
}

export type TripodInputMode = 'number' | 'border';

export type TripodSubMode = 'borders_only' | 'sudoku_only' | 'full';

export interface TripodGameStats {
  bordersPlaced: number;
  bordersRemoved: number;
  numbersEntered: number;
  undoCount: number;
  validationCount: number;
  completedAt?: number;  // timestamp when completed
}

export interface TripodState {
  gridSize: number;  // 7 or 9
  tripodDots: boolean[][];
  horizontalBorders: boolean[][];
  verticalBorders: boolean[][];
  regions: Region[];
  inputMode: TripodInputMode;
  errors: TripodError[];
  subMode: TripodSubMode;
  borderHistory: BorderHistoryEntry[];
  borderFuture: BorderHistoryEntry[]; // for redo
  // Timer fields
  startTime: number | null;  // timestamp when game started
  elapsedTime: number;       // seconds elapsed
  isTimerPaused: boolean;
  // Statistics
  stats: TripodGameStats;
}

export interface TripodPuzzle {
  id: string;
  gridSize: number;
  givens: Array<{ row: number; col: number; value: number }>;
  tripodDots: boolean[][];
  solutionBorders?: TripodBorders;
  solution?: number[][];
}

// Region colors for visualization
export const REGION_COLORS = [
  '#fef3c7', // amber-100
  '#dbeafe', // blue-100
  '#d1fae5', // emerald-100
  '#fce7f3', // pink-100
  '#e0e7ff', // indigo-100
  '#fef9c3', // yellow-100
  '#ccfbf1', // teal-100
  '#f3e8ff', // purple-100
  '#ffe4e6', // rose-100
] as const;

