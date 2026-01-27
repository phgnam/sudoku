import { create } from "zustand";
import { persist } from "zustand/middleware";

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

      setAuth: (user, token, sessionId) => {
        set({ user, token, sessionId: sessionId || null });
        // Also store in localStorage for API calls
        localStorage.setItem("token", token);
        if (sessionId) {
          localStorage.setItem("sessionId", sessionId);
        }
      },

      clearAuth: () => {
        set({ user: null, token: null, sessionId: null });
        localStorage.removeItem("token");
        localStorage.removeItem("sessionId");
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
      },
    },
  ),
);
