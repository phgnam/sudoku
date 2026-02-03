/**
 * Tripod-specific Zustand store
 * Separated from main game store to reduce unnecessary re-renders
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  TripodState,
  Region,
  TripodError,
  TripodInputMode,
  TripodSubMode,
  BorderHistoryEntry,
  TripodGameStats,
} from "@/types/tripod";
import { TRIPOD_CONSTANTS, isValidGridSize } from "@/lib/tripod-constants";
import { createEmptyBorders, safeIncrementStat } from "@/lib/tripod-utils";
import { migrateTripodStorage, safeLocalStorageSet } from "@/lib/tripod-state-migration";

interface TripodStore {
  // State
  tripod: TripodState | null;
  
  // Initialization
  initTripodState: (
    gridSize: number,
    tripodDots: boolean[][],
    subMode?: TripodSubMode,
  ) => void;
  
  // Input mode
  setInputMode: (mode: TripodInputMode) => void;
  setSubMode: (mode: TripodSubMode) => void;
  
  // Borders
  toggleBorder: (type: "h" | "v", row: number, col: number) => void;
  setBorders: (horizontal: boolean[][], vertical: boolean[][]) => void;
  
  // Regions & Errors
  setRegions: (regions: Region[]) => void;
  setErrors: (errors: TripodError[]) => void;
  
  // Border history (undo/redo)
  undoBorder: () => void;
  redoBorder: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
  
  // Timer
  startTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  updateElapsedTime: (seconds: number) => void;
  
  // Stats
  incrementStat: (stat: keyof TripodGameStats) => void;
  
  // Clear
  clearState: () => void;
  
  // Hydration tracking
  _hasHydrated: boolean;
  setHasHydrated: (hasHydrated: boolean) => void;
}

const initialTripodState: TripodState = {
  gridSize: 7,
  tripodDots: [],
  horizontalBorders: [],
  verticalBorders: [],
  regions: [],
  inputMode: "number",
  errors: [],
  subMode: "full",
  borderHistory: [],
  borderFuture: [],
  startTime: null,
  elapsedTime: 0,
  isTimerPaused: false,
  pausedAt: null,
  totalPausedDuration: 0,
  stats: {
    bordersPlaced: 0,
    bordersRemoved: 0,
    numbersEntered: 0,
    undoCount: 0,
    validationCount: 0,
  },
};

export const useTripodStore = create<TripodStore>()(
  persist(
    (set, get) => ({
      tripod: null,
      _hasHydrated: false,

      initTripodState: (gridSize, tripodDots, subMode = "full") => {
        if (!isValidGridSize(gridSize)) {
          console.error(`Invalid grid size: ${gridSize}`);
          return;
        }

        const { horizontal, vertical } = createEmptyBorders(gridSize);

        set({
          tripod: {
            ...initialTripodState,
            gridSize,
            tripodDots,
            horizontalBorders: horizontal,
            verticalBorders: vertical,
            subMode,
            startTime: Date.now(),
          },
        });
      },

      setInputMode: (mode) =>
        set((state) => {
          if (!state.tripod) return state;
          return {
            tripod: { ...state.tripod, inputMode: mode },
          };
        }),

      setSubMode: (mode) =>
        set((state) => {
          if (!state.tripod) return state;
          return {
            tripod: { ...state.tripod, subMode: mode },
          };
        }),

      toggleBorder: (type, row, col) =>
        set((state) => {
          if (!state.tripod) return state;

          const borders =
            type === "h"
              ? state.tripod.horizontalBorders
              : state.tripod.verticalBorders;
          const currentValue = borders[row]?.[col] ?? false;
          const newValue = !currentValue;

          // Create history entry
          const historyEntry: BorderHistoryEntry = {
            type,
            row,
            col,
            value: currentValue,
          };

          // Update borders
          const newBorders = borders.map((r, rIdx) =>
            rIdx === row ? r.map((c, cIdx) => (cIdx === col ? newValue : c)) : r
          );

          return {
            tripod: {
              ...state.tripod,
              ...(type === "h"
                ? { horizontalBorders: newBorders }
                : { verticalBorders: newBorders }),
              borderHistory: [
                ...state.tripod.borderHistory.slice(
                  -TRIPOD_CONSTANTS.MAX_HISTORY_SIZE + 1
                ),
                historyEntry,
              ],
              borderFuture: [], // Clear redo history
            },
          };
        }),

      setBorders: (horizontal, vertical) =>
        set((state) => {
          if (!state.tripod) return state;
          return {
            tripod: {
              ...state.tripod,
              horizontalBorders: horizontal,
              verticalBorders: vertical,
            },
          };
        }),

      setRegions: (regions) =>
        set((state) => {
          if (!state.tripod) return state;
          return { tripod: { ...state.tripod, regions } };
        }),

      setErrors: (errors) =>
        set((state) => {
          if (!state.tripod) return state;
          return { tripod: { ...state.tripod, errors } };
        }),

      undoBorder: () =>
        set((state) => {
          if (!state.tripod || state.tripod.borderHistory.length === 0) {
            return state;
          }

          const history = [...state.tripod.borderHistory];
          const lastEntry = history.pop()!;

          // Restore previous value
          const borders =
            lastEntry.type === "h"
              ? state.tripod.horizontalBorders
              : state.tripod.verticalBorders;

          const newBorders = borders.map((r, rIdx) =>
            rIdx === lastEntry.row
              ? r.map((c, cIdx) =>
                  cIdx === lastEntry.col ? lastEntry.value : c
                )
              : r
          );

          return {
            tripod: {
              ...state.tripod,
              ...(lastEntry.type === "h"
                ? { horizontalBorders: newBorders }
                : { verticalBorders: newBorders }),
              borderHistory: history,
              borderFuture: [lastEntry, ...state.tripod.borderFuture],
            },
          };
        }),

      redoBorder: () =>
        set((state) => {
          if (!state.tripod || state.tripod.borderFuture.length === 0) {
            return state;
          }

          const future = [...state.tripod.borderFuture];
          const entry = future.shift()!;

          // Toggle the value
          const borders =
            entry.type === "h"
              ? state.tripod.horizontalBorders
              : state.tripod.verticalBorders;

          const newValue = !entry.value;
          const newBorders = borders.map((r, rIdx) =>
            rIdx === entry.row
              ? r.map((c, cIdx) => (cIdx === entry.col ? newValue : c))
              : r
          );

          return {
            tripod: {
              ...state.tripod,
              ...(entry.type === "h"
                ? { horizontalBorders: newBorders }
                : { verticalBorders: newBorders }),
              borderHistory: [...state.tripod.borderHistory, entry],
              borderFuture: future,
            },
          };
        }),

      canUndo: () => {
        const state = get();
        return !!(state.tripod && state.tripod.borderHistory.length > 0);
      },

      canRedo: () => {
        const state = get();
        return !!(state.tripod && state.tripod.borderFuture.length > 0);
      },

      clearHistory: () =>
        set((state) => {
          if (!state.tripod) return state;
          return {
            tripod: {
              ...state.tripod,
              borderHistory: [],
              borderFuture: [],
            },
          };
        }),

      startTimer: () =>
        set((state) => {
          if (!state.tripod) return state;
          return {
            tripod: {
              ...state.tripod,
              startTime: Date.now(),
              isTimerPaused: false,
              pausedAt: null,
            },
          };
        }),

      pauseTimer: () =>
        set((state) => {
          if (!state.tripod || state.tripod.isTimerPaused) return state;
          return {
            tripod: {
              ...state.tripod,
              isTimerPaused: true,
              pausedAt: Date.now(),
            },
          };
        }),

      resumeTimer: () =>
        set((state) => {
          if (!state.tripod || !state.tripod.isTimerPaused) return state;

          const pauseDuration = state.tripod.pausedAt
            ? Date.now() - state.tripod.pausedAt
            : 0;

          return {
            tripod: {
              ...state.tripod,
              isTimerPaused: false,
              pausedAt: null,
              totalPausedDuration:
                state.tripod.totalPausedDuration + pauseDuration,
            },
          };
        }),

      updateElapsedTime: (seconds) =>
        set((state) => {
          if (!state.tripod) return state;
          return {
            tripod: { ...state.tripod, elapsedTime: seconds },
          };
        }),

      incrementStat: (stat) =>
        set((state) => {
          if (!state.tripod) return state;
          const currentValue = state.tripod.stats[stat] ?? 0;
          return {
            tripod: {
              ...state.tripod,
              stats: {
                ...state.tripod.stats,
                [stat]: safeIncrementStat(currentValue),
              },
            },
          };
        }),

      clearState: () => set({ tripod: null }),

      setHasHydrated: (hasHydrated) => set({ _hasHydrated: hasHydrated }),
    }),
    {
      name: "tripod-storage",
      partialize: (state: TripodStore) => ({ tripod: state.tripod }),
      storage: {
        getItem: (name: string) => {
          const str = localStorage.getItem(name);
          return str ? JSON.parse(str) : null;
        },
        setItem: (name: string, value: any) => {
          const str = JSON.stringify(value);
          const success = safeLocalStorageSet(name, str);
          if (!success) {
            console.warn('Failed to persist tripod state');
          }
        },
        removeItem: (name: string) => localStorage.removeItem(name),
      },
      onRehydrateStorage: () => (state: TripodStore | undefined) => {
        // Run migration from old storage on first hydration
        if (typeof window !== "undefined") {
          const migrated = migrateTripodStorage();
          if (migrated) {
            console.log("✅ Tripod storage migration completed");
            // Force reload from localStorage after migration
            const storedData = localStorage.getItem("tripod-storage");
            if (storedData) {
              try {
                const parsed = JSON.parse(storedData);
                if (state && parsed.state?.tripod) {
                  // Manually update store with migrated data
                  state.tripod = parsed.state.tripod;
                }
              } catch (error) {
                console.error("Error loading migrated data:", error);
              }
            }
          }
        }
        state?.setHasHydrated(true);
      },
    } as any
  )
);

