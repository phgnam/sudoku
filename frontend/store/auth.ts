import { create } from "zustand";
import { persist } from "zustand/middleware";

// Safe localStorage wrapper to handle quota exceeded and access errors
const safeLocalStorage = {
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      if (e instanceof DOMException && e.name === "QuotaExceededError") {
        // Clear non-critical storage and retry
        localStorage.removeItem("ui-storage");
        localStorage.removeItem("game-storage");
        try {
          localStorage.setItem(key, value);
        } catch {
          /* ignore */
        }
      }
    }
  },
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

// BroadcastChannel for cross-tab auth sync
const AUTH_CHANNEL =
  typeof window !== "undefined" ? new BroadcastChannel("auth_sync") : null;

interface User {
  id: string;
  email?: string;
  username?: string;
  isAnonymous: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  sessionId: string | null;
  _hasHydrated: boolean;
  setAuth: (user: User, token: string, sessionId?: string) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
  setHasHydrated: (hasHydrated: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      sessionId: null,
      _hasHydrated: false,

      setAuth: (user, token, sessionId, skipBroadcast = false) => {
        set({ user, token, sessionId: sessionId || null });
        // Store in localStorage for API calls using safe wrapper
        safeLocalStorage.setItem("token", token);
        if (sessionId) {
          safeLocalStorage.setItem("sessionId", sessionId);
        }
        // Broadcast to other tabs (skip if this update came from another tab)
        if (!skipBroadcast) {
          AUTH_CHANNEL?.postMessage({
            type: "AUTH_UPDATE",
            user,
            token,
            sessionId,
          });
        }
      },

      clearAuth: (skipBroadcast = false) => {
        set({ user: null, token: null, sessionId: null });
        safeLocalStorage.removeItem("token");
        safeLocalStorage.removeItem("sessionId");
        // Broadcast logout to other tabs (skip if this update came from another tab)
        if (!skipBroadcast) {
          AUTH_CHANNEL?.postMessage({ type: "AUTH_CLEAR" });
        }
      },

      isAuthenticated: () => {
        const state = get();
        // Only return true if hydrated AND has valid token
        return state._hasHydrated && !!state.token;
      },

      setHasHydrated: (hasHydrated) => set({ _hasHydrated: hasHydrated }),
    }),
    {
      name: "auth-storage",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);

        // Listen for auth changes from other tabs
        AUTH_CHANNEL?.addEventListener("message", (event) => {
          const store = useAuthStore.getState();
          if (event.data.type === "AUTH_UPDATE") {
            // Use internal set to update state without re-broadcasting
            (store.setAuth as (user: User, token: string, sessionId?: string, skipBroadcast?: boolean) => void)(
              event.data.user,
              event.data.token,
              event.data.sessionId,
              true // Skip broadcast to prevent infinite loop
            );
          }
          if (event.data.type === "AUTH_CLEAR") {
            // Use internal clear to update state without re-broadcasting
            (store.clearAuth as (skipBroadcast?: boolean) => void)(true);
          }
        });
      },
    }
  )
);
