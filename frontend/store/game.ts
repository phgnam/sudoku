import { create } from "zustand";
import { persist } from "zustand/middleware";

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
  gameMode: "classic" | "mutating" | "tripod";
  mutationCount: number;
  nextMutationAt: number | null;
  lastMutatedCell: { row: number; col: number; previousValue?: number } | null;
  mutationAnimating: boolean;
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
  setGameMode: (mode: "classic" | "mutating" | "tripod") => void;
  handleMutation: (row: number, col: number) => void;
  setMutationAnimating: (animating: boolean) => void;
  setNextMutationAt: (timestamp: number | null) => void;
  incrementMutationCount: () => void;
  setLastMutatedCell: (
    cell: { row: number; col: number; previousValue?: number } | null,
  ) => void;
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
        .map(() => []),
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
  gameMode: "classic",
  mutationCount: 0,
  nextMutationAt: null,
  lastMutatedCell: null,
  mutationAnimating: false,
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

      resetGame: () => set({ ...initialState }),

      clearGame: () => set({ ...initialState }),

      setLoading: (isLoading) => set({ isLoading }),

      toggleNotesMode: () => set((state) => ({ notesMode: !state.notesMode })),

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
            }),
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
            }),
          );
          return { notes: newNotes };
        }),

      addHintedCell: (row, col) =>
        set((state) => ({
          hintedCells: [...state.hintedCells, { row, col }],
        })),

      isHintedCell: (row, col): boolean => {
        const state = useGameStore.getState();
        return state.hintedCells.some(
          (c: { row: number; col: number }) => c.row === row && c.col === col,
        );
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
            (c) => !(c.row === row && c.col === col),
          ),
        })),

      isWrongCell: (row, col): boolean => {
        const state = useGameStore.getState();
        return state.wrongCells.some(
          (c: { row: number; col: number }) => c.row === row && c.col === col,
        );
      },

      // Mutation mode methods
      setGameMode: (gameMode) => set({ gameMode }),

      handleMutation: (row, col) =>
        set((state) => {
          // Clear the cell value
          const newState = state.currentState.map((r, ri) =>
            r.map((c, ci) => (ri === row && ci === col ? 0 : c)),
          );

          // #17: Clear notes for mutated cell
          const newNotes = state.notes.map((r, ri) =>
            r.map((c, ci) => (ri === row && ci === col ? [] : c)),
          );

          // #16: Filter out moves targeting the mutated cell from history
          // This prevents undo from restoring a mutated cell's value
          const filteredHistory = state.moveHistory.filter(
            (m) => !(m.row === row && m.col === col),
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
      incrementMutationCount: () =>
        set((state) => ({ mutationCount: state.mutationCount + 1 })),
      setLastMutatedCell: (lastMutatedCell) => set({ lastMutatedCell }),

      _hasHydrated: false,
      setHasHydrated: (hasHydrated: boolean) =>
        set({ _hasHydrated: hasHydrated }),
    }),
    {
      name: "sudoku-game-storage",
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error("Failed to rehydrate game store:", error);
          if (typeof window !== "undefined") {
            localStorage.removeItem("sudoku-game-storage");
          }
        }
        state?.setHasHydrated(true);
      },
      // Simple merge without tripod-specific logic
      merge: (persistedState, currentState) => {
        try {
          if (persistedState && typeof persistedState === "object") {
            return {
              ...currentState,
              ...(persistedState as Partial<GameState>),
            };
          }
        } catch (error) {
          console.error("Corrupted game state, resetting:", error);
        }
        return currentState;
      },
    },
  ),
);
