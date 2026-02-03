/**
 * Tests for Tripod State Migration Utility
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  migrateTripodStorage,
  isMigrationCompleted,
  resetMigration,
  getMigrationStatus,
} from "../tripod-state-migration";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
})();

// @ts-ignore
global.localStorage = localStorageMock;

// Mock window object for browser environment
// @ts-ignore
global.window = {
  localStorage: localStorageMock,
};

describe("tripod-state-migration", () => {
  beforeEach(() => {
    localStorageMock.clear();
    // @ts-ignore - for testing
    process.env.NODE_ENV = "development";
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe("isMigrationCompleted", () => {
    it("should return false when migration has not been completed", () => {
      expect(isMigrationCompleted()).toBe(false);
    });

    it("should return true when migration flag is set", () => {
      localStorage.setItem("tripod-migration-completed", "true");
      expect(isMigrationCompleted()).toBe(true);
    });
  });

  describe("migrateTripodStorage", () => {
    it("should skip migration if already completed", () => {
      localStorage.setItem("tripod-migration-completed", "true");
      const result = migrateTripodStorage();
      expect(result).toBe(false);
    });

    it("should skip migration if no old data exists", () => {
      const result = migrateTripodStorage();
      expect(result).toBe(false);
      expect(isMigrationCompleted()).toBe(true);
    });

    it("should migrate tripod state from old storage to new storage", () => {
      // Setup old storage with tripod data
      const oldStorage = {
        state: {
          tripod: {
            gridSize: 7,
            tripodDots: [[true, false], [false, true]],
            horizontalBorders: [[false, true], [true, false]],
            verticalBorders: [[true, false], [false, true]],
            regions: [],
            inputMode: "border",
            subMode: "full",
            errors: [],
            borderHistory: [],
            historyIndex: -1,
            stats: {
              bordersPlaced: 5,
              bordersRemoved: 2,
              numbersEntered: 10,
              undoCount: 1,
              redoCount: 0,
              validationCount: 3,
            },
            timerStartTime: null,
            timerPausedAt: null,
            elapsedTime: 120,
            totalPausedDuration: 0,
          },
        },
        version: 0,
      };

      localStorage.setItem("sudoku-game-storage", JSON.stringify(oldStorage));

      // Run migration
      const result = migrateTripodStorage();

      expect(result).toBe(true);
      expect(isMigrationCompleted()).toBe(true);

      // Check new storage
      const newData = localStorage.getItem("tripod-storage");
      expect(newData).toBeTruthy();

      const parsed = JSON.parse(newData!);
      expect(parsed.state.tripod).toEqual(oldStorage.state.tripod);
      expect(parsed.state._hasHydrated).toBe(true);
    });

    it("should skip migration if new storage already has data", () => {
      // Setup both old and new storage
      const oldStorage = {
        state: {
          tripod: { gridSize: 7 },
        },
      };
      const newStorage = {
        state: {
          tripod: { gridSize: 9 },
          _hasHydrated: true,
        },
      };

      localStorage.setItem("sudoku-game-storage", JSON.stringify(oldStorage));
      localStorage.setItem("tripod-storage", JSON.stringify(newStorage));

      const result = migrateTripodStorage();

      expect(result).toBe(false);
      expect(isMigrationCompleted()).toBe(true);

      // New storage should be unchanged
      const finalData = JSON.parse(localStorage.getItem("tripod-storage")!);
      expect(finalData.state.tripod.gridSize).toBe(9); // Not overwritten
    });
  });

  describe("getMigrationStatus", () => {
    it("should return correct status when no data exists", () => {
      const status = getMigrationStatus();
      expect(status).toEqual({
        environment: "Browser",
        migrated: false,
        hasOldData: false,
        hasNewData: false,
      });
    });

    it("should return correct status after migration", () => {
      localStorage.setItem(
        "sudoku-game-storage",
        JSON.stringify({ state: { tripod: { gridSize: 7 } } })
      );
      migrateTripodStorage();

      const status = getMigrationStatus();
      expect(status.migrated).toBe(true);
      expect(status.hasOldData).toBe(true);
      expect(status.hasNewData).toBe(true);
    });
  });

  describe("resetMigration", () => {
    it("should clear migration flag and new storage in development", () => {
      localStorage.setItem("tripod-migration-completed", "true");
      localStorage.setItem("tripod-storage", JSON.stringify({ test: "data" }));

      resetMigration();

      expect(localStorage.getItem("tripod-migration-completed")).toBeNull();
      expect(localStorage.getItem("tripod-storage")).toBeNull();
    });
  });
});

