/**
 * Tripod Sudoku Types
 * Types for the Tripod Sudoku game mode
 */

export interface BorderHistoryEntry {
  type: "h" | "v";
  row: number;
  col: number;
  value: boolean; // value BEFORE the change
}

export interface TripodBorders {
  horizontal: boolean[][]; // (gridSize+1) × gridSize
  vertical: boolean[][]; // gridSize × (gridSize+1)
}

export interface Region {
  id: number;
  cells: Array<{ row: number; col: number }>;
  size: number;
  color: string;
  isValid: boolean;
}

export interface TripodError {
  type:
    | "region_size"
    | "not_connected"
    | "four_way"
    | "tripod_mismatch"
    | "sudoku_duplicate";
  location:
    | { row: number; col: number }
    | { vertexRow: number; vertexCol: number };
  message: string;
}

export interface VertexValidation {
  isValid: boolean;
  borderCount: number;
  hasDot: boolean;
  error:
    | "four_way_intersection"
    | "tripod_mismatch"
    | "missing_tripod_dot"
    | null;
}

export type TripodInputMode = "number" | "border";

export type TripodSubMode = "borders_only" | "sudoku_only" | "full";

export interface TripodGameStats {
  bordersPlaced: number;
  bordersRemoved: number;
  numbersEntered: number;
  undoCount: number;
  validationCount: number;
  completedAt?: number; // timestamp when completed
}

export interface TripodState {
  gridSize: number; // 7 or 9
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
  startTime: number | null; // timestamp when game started
  elapsedTime: number; // seconds elapsed (excluding paused time)
  isTimerPaused: boolean;
  pausedAt: number | null; // timestamp when timer was paused
  totalPausedDuration: number; // total milliseconds spent paused
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

// Region colors for visualization - soft, harmonious pastels
export const REGION_COLORS = [
  "rgba(239, 246, 255, 0.6)", // soft blue
  "rgba(254, 243, 199, 0.6)", // soft yellow
  "rgba(254, 226, 226, 0.6)", // soft red/rose
  "rgba(220, 252, 231, 0.6)", // soft green
  "rgba(243, 232, 255, 0.6)", // soft purple
  "rgba(254, 215, 170, 0.6)", // soft orange
  "rgba(207, 250, 254, 0.6)", // soft cyan
  "rgba(252, 231, 243, 0.6)", // soft pink
  "rgba(254, 252, 232, 0.6)", // soft lime
] as const;
