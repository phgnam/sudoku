/**
 * Tripod State Migration Utility
 * Migrates tripod state from old "sudoku-game-storage" to new "tripod-storage"
 * Run this once after upgrading to separated store architecture
 */

import type { TripodState } from "@/types/tripod";

interface OldGameStorage {
  state: {
    tripod?: TripodState | null;
    // ... other game state
  };
  version?: number;
}

interface NewTripodStorage {
  state: {
    tripod: TripodState | null;
    _hasHydrated: boolean;
  };
  version: number;
}

const OLD_STORAGE_KEY = "sudoku-game-storage";
const NEW_STORAGE_KEY = "tripod-storage";
const MIGRATION_FLAG_KEY = "tripod-migration-completed";

/**
 * Check if migration has already been completed
 */
export function isMigrationCompleted(): boolean {
  if (typeof window === "undefined") return true; // SSR
  return localStorage.getItem(MIGRATION_FLAG_KEY) === "true";
}

/**
 * Mark migration as completed
 */
function markMigrationCompleted(): void {
  safeLocalStorageSet(MIGRATION_FLAG_KEY, "true");
}

/**
 * Get old tripod state from game storage
 */
function getOldTripodState(): TripodState | null {
  try {
    const oldData = localStorage.getItem(OLD_STORAGE_KEY);
    if (!oldData) return null;

    const parsed: OldGameStorage = JSON.parse(oldData);
    return parsed.state?.tripod ?? null;
  } catch (error) {
    console.error("Error reading old tripod state:", error);
    return null;
  }
}

/**
 * Check if new tripod storage already exists
 */
function hasNewTripodStorage(): boolean {
  const newData = localStorage.getItem(NEW_STORAGE_KEY);
  if (!newData) return false;

  try {
    const parsed: NewTripodStorage = JSON.parse(newData);
    return parsed.state?.tripod !== null && parsed.state?.tripod !== undefined;
  } catch {
    return false;
  }
}

/**
 * Safely set localStorage with quota handling
 */
export function safeLocalStorageSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    if (error instanceof DOMException && (
      error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    )) {
      console.error('LocalStorage quota exceeded');

      // Try to clear old data (but preserve the migration flag and new storage)
      try {
        const oldKeys = Object.keys(localStorage).filter(k =>
          k.startsWith('tripod-') && k !== key && k !== MIGRATION_FLAG_KEY && k !== NEW_STORAGE_KEY
        );
        oldKeys.forEach(k => localStorage.removeItem(k));

        // Retry after clearing
        localStorage.setItem(key, value);
        console.log('Successfully saved after clearing old data');
        return true;
      } catch (retryError) {
        console.error('Failed even after clearing:', retryError);
        // Show user notification
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('storage:quota-exceeded'));
        }
        return false;
      }
    }
    console.error('LocalStorage error:', error);
    return false;
  }
}

/**
 * Migrate tripod state to new storage
 * Returns true if successful, false on error
 */
function migrateTripodState(tripodState: TripodState): boolean {
  const newStorage: NewTripodStorage = {
    state: {
      tripod: tripodState,
      _hasHydrated: true,
    },
    version: 0,
  };

  const success = safeLocalStorageSet(NEW_STORAGE_KEY, JSON.stringify(newStorage));
  if (success) {
    console.log("✅ Tripod state migrated successfully");
  } else {
    console.error("❌ Failed to migrate tripod state due to storage error");
  }
  return success;
}

/**
 * Main migration function
 * Returns true if migration was performed, false if skipped
 */
export function migrateTripodStorage(): boolean {
  if (typeof window === "undefined") {
    console.log("⚠️ Migration skipped: SSR environment");
    return false;
  }

  // Skip if already migrated
  if (isMigrationCompleted()) {
    console.log("ℹ️ Migration skipped: Already completed");
    return false;
  }

  // Skip if new storage already has data (manual setup or parallel migration)
  if (hasNewTripodStorage()) {
    console.log("ℹ️ Migration skipped: New storage already has tripod data");
    markMigrationCompleted();
    return false;
  }

  // Get old state
  const oldTripodState = getOldTripodState();
  if (!oldTripodState) {
    console.log("ℹ️ Migration skipped: No old tripod state found");
    markMigrationCompleted();
    return false;
  }

  // Perform migration
  console.log("🔄 Migrating tripod state...");
  const success = migrateTripodState(oldTripodState);

  // Only mark completed if migration succeeded
  if (success) {
    markMigrationCompleted();
    return true;
  } else {
    console.error("❌ Migration failed - will retry on next load");
    return false;
  }
}

/**
 * Force reset migration (for testing)
 * WARNING: Only use in development
 */
export function resetMigration(): void {
  if (process.env.NODE_ENV !== "development") {
    console.warn("resetMigration() can only be called in development");
    return;
  }
  localStorage.removeItem(MIGRATION_FLAG_KEY);
  localStorage.removeItem(NEW_STORAGE_KEY);
  console.log("🔄 Migration reset complete");
}

/**
 * Get migration status for debugging
 */
export function getMigrationStatus() {
  if (typeof window === "undefined") {
    return { environment: "SSR", migrated: false };
  }

  return {
    environment: "Browser",
    migrated: isMigrationCompleted(),
    hasOldData: getOldTripodState() !== null,
    hasNewData: hasNewTripodStorage(),
  };
}

