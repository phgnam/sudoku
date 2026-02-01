const ACTIVE_MATCH_KEY = "sudoku_active_match";
const MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

// SSR guard
const isBrowser = typeof window !== "undefined";

export interface ActiveMatchInfo {
  matchId: string;
  myState: number[][];
  savedAt: number;
}

export function saveActiveMatch(matchId: string, myState: number[][]): void {
  if (!isBrowser) return;
  // Validate inputs
  if (!matchId || !myState || !Array.isArray(myState)) return;
  try {
    localStorage.setItem(
      ACTIVE_MATCH_KEY,
      JSON.stringify({ matchId, myState, savedAt: Date.now() })
    );
  } catch (e) {
    console.error("[MatchStorage] Failed to save:", e);
  }
}

export function loadActiveMatch(): ActiveMatchInfo | null {
  if (!isBrowser) return null;
  try {
    const data = localStorage.getItem(ACTIVE_MATCH_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      // Runtime validation of parsed data
      if (
        typeof parsed.matchId === "string" &&
        parsed.matchId &&
        typeof parsed.savedAt === "number" &&
        Array.isArray(parsed.myState)
      ) {
        return parsed as ActiveMatchInfo;
      }
      return null;
    }
  } catch (e) {
    console.error("[MatchStorage] Failed to load:", e);
  }
  return null;
}

export function clearActiveMatch(): void {
  if (!isBrowser) return;
  try {
    localStorage.removeItem(ACTIVE_MATCH_KEY);
  } catch (e) {
    console.error("[MatchStorage] Failed to clear:", e);
  }
}

export function isMatchValid(savedAt?: number): boolean {
  if (!savedAt || savedAt < 0) return false;
  return Date.now() - savedAt < MAX_AGE_MS;
}

