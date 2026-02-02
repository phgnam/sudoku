import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TripodState, Region, TripodError, TripodInputMode, TripodSubMode, BorderHistoryEntry, TripodGameStats } from '@/types/tripod';

export enum GameStatus {
  ACTIVE = "active",
  COMPLETED = "completed",
  FAILED = "failed",
}

export interface Move {
  row: number;
  col: number;
  previousValue: number;
  newValue: number;
  timestamp: number;
}

// Notes type: 9x9 grid where each cell has a Set of candidate numbers (1-9)
export type NotesGrid = number[][][]; // [row][col][array of notes]

export interface GameState {
  id: string | null;
  difficulty: string | null;
  currentState: number[][];
  initialState: number[][];
  solution: number[][] | null; // Solution grid for validation
  hintedCells: Array<{ row: number; col: number }>; // Cells filled by hints (cannot be erased)
  wrongCells: Array<{ row: number; col: number }>; // Cells with wrong numbers
  notes: NotesGrid; // Notes for each cell
  notesMode: boolean; // Whether notes mode is active
  moveHistory: Move[];
  hintsUsed: number;
  mistakes: number;
  timeElapsed: number;
  status: GameStatus;
  isLoading: boolean;
  // Game mode state
  gameMode: 'classic' | 'mutating' | 'tripod';
  mutationCount: number;
  nextMutationAt: number | null;
  lastMutatedCell: { row: number; col: number; previousValue?: number } | null;
  mutationAnimating: boolean;
  // Tripod mode state
  tripod: TripodState | null;
}

interface GameStore extends GameState {
  setGame: (game: Partial<GameState>) => void;
  updateState: (state: number[][]) => void;
  addMove: (move: Move) => void;
  undoMove: () => void;
  incrementHints: () => void;
  incrementMistakes: () => void;
  updateTime: (time: number) => void;
  setStatus: (status: GameStatus) => void;
  resetGame: () => void;
  clearGame: () => void;
  setLoading: (loading: boolean) => void;
  toggleNotesMode: () => void;
  setNote: (row: number, col: number, num: number) => void;
  clearNotes: (row: number, col: number) => void;
  addHintedCell: (row: number, col: number) => void;
  isHintedCell: (row: number, col: number) => boolean;
  addWrongCell: (row: number, col: number) => void;
  removeWrongCell: (row: number, col: number) => void;
  isWrongCell: (row: number, col: number) => boolean;
  // Game mode methods
  setGameMode: (mode: 'classic' | 'mutating' | 'tripod') => void;
  handleMutation: (row: number, col: number) => void;
  setMutationAnimating: (animating: boolean) => void;
  setNextMutationAt: (timestamp: number | null) => void;
  incrementMutationCount: () => void;
  setLastMutatedCell: (cell: { row: number; col: number; previousValue?: number } | null) => void;
  // Tripod mode methods
  initTripodState: (gridSize: number, tripodDots: boolean[][], subMode?: TripodSubMode) => void;
  setTripodInputMode: (mode: TripodInputMode) => void;
  setTripodSubMode: (mode: TripodSubMode) => void;
  toggleTripodBorder: (type: 'h' | 'v', row: number, col: number) => void;
  setTripodRegions: (regions: Region[]) => void;
  setTripodErrors: (errors: TripodError[]) => void;
  setTripodBorders: (horizontal: boolean[][], vertical: boolean[][]) => void;
  clearTripodState: () => void;
  // Border undo/redo
  undoBorder: () => void;
  redoBorder: () => void;
  canUndoBorder: () => boolean;
  canRedoBorder: () => boolean;
  clearBorderHistory: () => void;
  // Tripod timer methods
  startTripodTimer: () => void;
  pauseTripodTimer: () => void;
  resumeTripodTimer: () => void;
  updateTripodElapsedTime: (seconds: number) => void;
  // Tripod stats methods
  incrementTripodStat: (stat: keyof TripodGameStats) => void;
  _hasHydrated: boolean;
  setHasHydrated: (hasHydrated: boolean) => void;
}

// Helper to create empty notes grid
const createEmptyNotesGrid = (): NotesGrid =>
  Array(9)
    .fill(null)
    .map(() =>
      Array(9)
        .fill(null)
        .map(() => [])
    );

const initialState: GameState = {
  id: null,
  difficulty: null,
  currentState: Array(9)
    .fill(null)
    .map(() => Array(9).fill(0)),
  initialState: Array(9)
    .fill(null)
    .map(() => Array(9).fill(0)),
  solution: null,
  hintedCells: [],
  wrongCells: [],
  notes: createEmptyNotesGrid(),
  notesMode: false,
  moveHistory: [],
  hintsUsed: 0,
  mistakes: 0,
  timeElapsed: 0,
  status: GameStatus.ACTIVE,
  isLoading: false,
  // Mutation mode initial state
  gameMode: 'classic',
  mutationCount: 0,
  nextMutationAt: null,
  lastMutatedCell: null,
  mutationAnimating: false,
  // Tripod mode initial state
  tripod: null,
};

// For hydration tracking
const initialStoreState = {
  ...initialState,
  _hasHydrated: false,
};

export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
      ...initialStoreState,

      setGame: (game) => set((state) => ({ ...state, ...game })),

      updateState: (currentState) => set({ currentState }),

      addMove: (move) =>
        set((state) => ({
          moveHistory: [...state.moveHistory, move],
        })),

      undoMove: () =>
        set((state) => {
          if (state.moveHistory.length === 0) return state;
          const newHistory = state.moveHistory.slice(0, -1);
          return { moveHistory: newHistory };
        }),

      incrementHints: () =>
        set((state) => ({ hintsUsed: state.hintsUsed + 1 })),

      incrementMistakes: () =>
        set((state) => ({ mistakes: state.mistakes + 1 })),

      updateTime: (timeElapsed) => set({ timeElapsed }),

      setStatus: (status) => set({ status }),

      resetGame: () => set({ ...initialState, tripod: null }),

      clearGame: () => set({ ...initialState, tripod: null }),

      setLoading: (isLoading) => set({ isLoading }),

      toggleNotesMode: () =>
        set((state) => ({ notesMode: !state.notesMode })),

      setNote: (row, col, num) =>
        set((state) => {
          const newNotes = state.notes.map((r, ri) =>
            r.map((c, ci) => {
              if (ri === row && ci === col) {
                // Toggle the note: add if not present, remove if present
                if (c.includes(num)) {
                  return c.filter((n) => n !== num);
                } else {
                  return [...c, num].sort();
                }
              }
              return c;
            })
          );
          return { notes: newNotes };
        }),

      clearNotes: (row, col) =>
        set((state) => {
          const newNotes = state.notes.map((r, ri) =>
            r.map((c, ci) => {
              if (ri === row && ci === col) {
                return [];
              }
              return c;
            })
          );
          return { notes: newNotes };
        }),

      addHintedCell: (row, col) =>
        set((state) => ({
          hintedCells: [...state.hintedCells, { row, col }],
        })),

      isHintedCell: (row, col): boolean => {
        const state = useGameStore.getState();
        return state.hintedCells.some((c: { row: number; col: number }) => c.row === row && c.col === col);
      },

      addWrongCell: (row, col) =>
        set((state) => {
          // Avoid duplicates
          if (state.wrongCells.some((c) => c.row === row && c.col === col)) {
            return state;
          }
          return { wrongCells: [...state.wrongCells, { row, col }] };
        }),

      removeWrongCell: (row, col) =>
        set((state) => ({
          wrongCells: state.wrongCells.filter(
            (c) => !(c.row === row && c.col === col)
          ),
        })),

      isWrongCell: (row, col): boolean => {
        const state = useGameStore.getState();
        return state.wrongCells.some((c: { row: number; col: number }) => c.row === row && c.col === col);
      },

      // Mutation mode methods
      setGameMode: (gameMode) => set({ gameMode }),

      handleMutation: (row, col) => set((state) => {
        // Clear the cell value
        const newState = state.currentState.map((r, ri) =>
          r.map((c, ci) => (ri === row && ci === col ? 0 : c))
        );

        // #17: Clear notes for mutated cell
        const newNotes = state.notes.map((r, ri) =>
          r.map((c, ci) => (ri === row && ci === col ? [] : c))
        );

        // #16: Filter out moves targeting the mutated cell from history
        // This prevents undo from restoring a mutated cell's value
        const filteredHistory = state.moveHistory.filter(
          (m) => !(m.row === row && m.col === col)
        );

        return {
          currentState: newState,
          notes: newNotes,
          moveHistory: filteredHistory,
          lastMutatedCell: { row, col },
          mutationCount: state.mutationCount + 1,
          mutationAnimating: true,
        };
      }),

      setMutationAnimating: (mutationAnimating) => set({ mutationAnimating }),
      setNextMutationAt: (nextMutationAt) => set({ nextMutationAt }),
      incrementMutationCount: () => set((state) => ({ mutationCount: state.mutationCount + 1 })),
      setLastMutatedCell: (lastMutatedCell) => set({ lastMutatedCell }),

      // Tripod mode methods
      initTripodState: (gridSize: number, tripodDots: boolean[][], subMode: TripodSubMode = 'full') => set({
        tripod: {
          gridSize,
          tripodDots,
          horizontalBorders: Array(gridSize + 1).fill(null).map(() => Array(gridSize).fill(false)),
          verticalBorders: Array(gridSize).fill(null).map(() => Array(gridSize + 1).fill(false)),
          regions: [],
          inputMode: 'number',
          errors: [],
          subMode,
          borderHistory: [],
          borderFuture: [],
          // Timer fields
          startTime: null,
          elapsedTime: 0,
          isTimerPaused: false,
          pausedAt: null,
          totalPausedDuration: 0,
          // Statistics
          stats: {
            bordersPlaced: 0,
            bordersRemoved: 0,
            numbersEntered: 0,
            undoCount: 0,
            validationCount: 0,
          },
        },
      }),

      setTripodInputMode: (mode) => set((state) => ({
        tripod: state.tripod ? { ...state.tripod, inputMode: mode } : null,
      })),

      setTripodSubMode: (mode) => set((state) => ({
        tripod: state.tripod ? { ...state.tripod, subMode: mode } : null,
      })),

      toggleTripodBorder: (type, row, col) => set((state) => {
        if (!state.tripod) return state;

        // Get current border value before toggle
        const currentValue = type === 'h'
          ? state.tripod.horizontalBorders[row]?.[col] ?? false
          : state.tripod.verticalBorders[row]?.[col] ?? false;

        // Create history entry with value BEFORE the change
        const historyEntry: BorderHistoryEntry = { type, row, col, value: currentValue };

        const newTripod = { ...state.tripod };

        if (type === 'h') {
          const newHorizontal = state.tripod.horizontalBorders.map((r, i) =>
            i === row ? r.map((v, j) => (j === col ? !v : v)) : [...r]
          );
          newTripod.horizontalBorders = newHorizontal;
        } else {
          const newVertical = state.tripod.verticalBorders.map((r, i) =>
            i === row ? r.map((v, j) => (j === col ? !v : v)) : [...r]
          );
          newTripod.verticalBorders = newVertical;
        }

        // Save to history and clear future (new action invalidates redo stack)
        newTripod.borderHistory = [...state.tripod.borderHistory, historyEntry];
        newTripod.borderFuture = [];

        // Track stats: if currentValue was false, we're placing; if true, we're removing
        const statKey = currentValue ? 'bordersRemoved' : 'bordersPlaced';
        newTripod.stats = {
          ...state.tripod.stats,
          [statKey]: state.tripod.stats[statKey] + 1,
        };

        return { tripod: newTripod };
      }),

      setTripodRegions: (regions) => set((state) => ({
        tripod: state.tripod ? { ...state.tripod, regions } : null,
      })),

      setTripodErrors: (errors) => set((state) => ({
        tripod: state.tripod ? { ...state.tripod, errors } : null,
      })),

      setTripodBorders: (horizontal, vertical) => set((state) => ({
        tripod: state.tripod ? { ...state.tripod, horizontalBorders: horizontal, verticalBorders: vertical } : null,
      })),

      clearTripodState: () => set({ tripod: null }),

      // Border undo/redo methods
      undoBorder: () => set((state) => {
        if (!state.tripod || state.tripod.borderHistory.length === 0) return state;

        const history = [...state.tripod.borderHistory];
        const entry = history.pop()!;

        // Current value (after the action we're undoing) - this goes to future
        const currentValue = entry.type === 'h'
          ? state.tripod.horizontalBorders[entry.row]?.[entry.col] ?? false
          : state.tripod.verticalBorders[entry.row]?.[entry.col] ?? false;

        const futureEntry: BorderHistoryEntry = { ...entry, value: currentValue };

        const newTripod = { ...state.tripod };

        // Restore the previous value
        if (entry.type === 'h') {
          const newHorizontal = state.tripod.horizontalBorders.map((r, i) =>
            i === entry.row ? r.map((v, j) => (j === entry.col ? entry.value : v)) : [...r]
          );
          newTripod.horizontalBorders = newHorizontal;
        } else {
          const newVertical = state.tripod.verticalBorders.map((r, i) =>
            i === entry.row ? r.map((v, j) => (j === entry.col ? entry.value : v)) : [...r]
          );
          newTripod.verticalBorders = newVertical;
        }

        newTripod.borderHistory = history;
        newTripod.borderFuture = [...state.tripod.borderFuture, futureEntry];

        // Increment undo count
        newTripod.stats = {
          ...state.tripod.stats,
          undoCount: state.tripod.stats.undoCount + 1,
        };

        return { tripod: newTripod };
      }),

      redoBorder: () => set((state) => {
        if (!state.tripod || state.tripod.borderFuture.length === 0) return state;

        const future = [...state.tripod.borderFuture];
        const entry = future.pop()!;

        // Current value (before redo) - this goes to history
        const currentValue = entry.type === 'h'
          ? state.tripod.horizontalBorders[entry.row]?.[entry.col] ?? false
          : state.tripod.verticalBorders[entry.row]?.[entry.col] ?? false;

        const historyEntry: BorderHistoryEntry = { ...entry, value: currentValue };

        const newTripod = { ...state.tripod };

        // Apply the redo value
        if (entry.type === 'h') {
          const newHorizontal = state.tripod.horizontalBorders.map((r, i) =>
            i === entry.row ? r.map((v, j) => (j === entry.col ? entry.value : v)) : [...r]
          );
          newTripod.horizontalBorders = newHorizontal;
        } else {
          const newVertical = state.tripod.verticalBorders.map((r, i) =>
            i === entry.row ? r.map((v, j) => (j === entry.col ? entry.value : v)) : [...r]
          );
          newTripod.verticalBorders = newVertical;
        }

        newTripod.borderHistory = [...state.tripod.borderHistory, historyEntry];
        newTripod.borderFuture = future;

        return { tripod: newTripod };
      }),

      canUndoBorder: (): boolean => {
        const state = useGameStore.getState();
        return (state.tripod?.borderHistory.length ?? 0) > 0;
      },

      canRedoBorder: (): boolean => {
        const state = useGameStore.getState();
        return (state.tripod?.borderFuture.length ?? 0) > 0;
      },

      clearBorderHistory: () => set((state) => ({
        tripod: state.tripod ? { ...state.tripod, borderHistory: [], borderFuture: [] } : null,
      })),

      // Tripod timer methods
      startTripodTimer: () => set((state) => ({
        tripod: state.tripod ? {
          ...state.tripod,
          startTime: Date.now(),
          elapsedTime: 0,
          isTimerPaused: false,
          pausedAt: null,
          totalPausedDuration: 0,
        } : null,
      })),

      pauseTripodTimer: () => set((state) => ({
        tripod: state.tripod ? {
          ...state.tripod,
          isTimerPaused: true,
          pausedAt: Date.now(), // Record when paused
        } : null,
      })),

      resumeTripodTimer: () => set((state) => {
        if (!state.tripod || !state.tripod.pausedAt) return state;

        // Calculate duration of this pause and add to total
        const pauseDuration = Date.now() - state.tripod.pausedAt;

        return {
          tripod: {
            ...state.tripod,
            isTimerPaused: false,
            pausedAt: null,
            totalPausedDuration: state.tripod.totalPausedDuration + pauseDuration,
          },
        };
      }),

      updateTripodElapsedTime: (seconds: number) => set((state) => ({
        tripod: state.tripod ? {
          ...state.tripod,
          elapsedTime: seconds,
        } : null,
      })),

      // Tripod stats methods
      incrementTripodStat: (stat: keyof TripodGameStats) => set((state) => {
        if (!state.tripod) return state;
        const currentValue = state.tripod.stats[stat];
        // Only increment if it's a number (not completedAt which is optional)
        if (typeof currentValue !== 'number') return state;
        return {
          tripod: {
            ...state.tripod,
            stats: {
              ...state.tripod.stats,
              [stat]: currentValue + 1,
            },
          },
        };
      }),

      _hasHydrated: false,
      setHasHydrated: (hasHydrated: boolean) => set({ _hasHydrated: hasHydrated }),
    }),
    {
      name: "sudoku-game-storage",
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('Failed to rehydrate game store:', error);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('sudoku-game-storage');
          }
        }
        state?.setHasHydrated(true);
      },
      merge: (persistedState, currentState) => {
        try {
          if (persistedState && typeof persistedState === 'object') {
            return { ...currentState, ...(persistedState as Partial<GameState>) };
          }
        } catch {
          console.error('Corrupted game state, resetting');
        }
        return currentState;
      },
    },
  ),
);
