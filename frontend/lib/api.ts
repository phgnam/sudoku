import { jwtDecode } from "jwt-decode";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// Token refresh threshold - refresh 5 minutes before expiry
const TOKEN_REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

// Deduplication: single promise for concurrent refresh calls
let refreshPromise: Promise<string> | null = null;

/**
 * Check if token is expiring soon and refresh if needed.
 * Uses deduplication to prevent multiple concurrent refresh calls.
 */
async function refreshTokenIfNeeded(): Promise<string | null> {
  // SSR check
  if (typeof window === "undefined") return null;

  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const decoded = jwtDecode<{ exp: number }>(token);
    const expiresAt = decoded.exp * 1000;
    const timeUntilExpiry = expiresAt - Date.now();

    // Token still valid with enough buffer time
    if (timeUntilExpiry > TOKEN_REFRESH_THRESHOLD_MS) {
      return token;
    }

    // Token already expired - let the request fail and handle 401
    if (timeUntilExpiry <= 0) {
      return token;
    }

    // Deduplicate concurrent refresh calls
    if (!refreshPromise) {
      refreshPromise = (async () => {
        try {
          const response = await fetch(`${API_URL}/auth/refresh`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) {
            throw new Error("Token refresh failed");
          }

          const data = await response.json();
          localStorage.setItem("token", data.accessToken);
          return data.accessToken;
        } finally {
          refreshPromise = null;
        }
      })();
    }

    return refreshPromise;
  } catch {
    // Token decode failed or other error - return existing token
    return token;
  }
}

/**
 * Handle 401 responses by clearing auth state and redirecting to login.
 */
function handleUnauthorized(): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem("token");
  localStorage.removeItem("sessionId");

  // Redirect to login page
  if (!window.location.pathname.includes("/login")) {
    window.location.href = "/login";
  }
}

export const api = {
  // Auth endpoints
  auth: {
    anonymous: () => `${API_URL}/auth/anonymous`,
    register: () => `${API_URL}/auth/register`,
    login: () => `${API_URL}/auth/login`,
    refresh: () => `${API_URL}/auth/refresh`,
    migrate: () => `${API_URL}/auth/migrate`,
    me: () => `${API_URL}/auth/me`,
  },

  // Game endpoints
  games: {
    create: () => `${API_URL}/games`,
    get: (id: string) => `${API_URL}/games/${id}`,
    move: (id: string) => `${API_URL}/games/${id}/move`,
    undo: (id: string) => `${API_URL}/games/${id}/undo`,
    hint: (id: string) => `${API_URL}/games/${id}/hint`,
    hintApply: (id: string) => `${API_URL}/games/${id}/hint/apply`,
    updateTime: (id: string) => `${API_URL}/games/${id}/time`,
    stats: () => `${API_URL}/games/stats`,
  },

  // Leaderboard endpoints
  leaderboard: {
    get: (params?: {
      difficulty?: string;
      period?: string;
      limit?: number;
    }) => {
      const searchParams = new URLSearchParams();
      if (params?.difficulty) searchParams.set("difficulty", params.difficulty);
      if (params?.period) searchParams.set("period", params.period);
      if (params?.limit) searchParams.set("limit", String(params.limit));
      const query = searchParams.toString();
      return `${API_URL}/leaderboard${query ? `?${query}` : ""}`;
    },
    myRank: (params?: { difficulty?: string; period?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.difficulty) searchParams.set("difficulty", params.difficulty);
      if (params?.period) searchParams.set("period", params.period);
      const query = searchParams.toString();
      return `${API_URL}/leaderboard/me${query ? `?${query}` : ""}`;
    },
    // Competitive leaderboard
    competitive: (limit?: number) => {
      const params = limit ? `?limit=${limit}` : "";
      return `${API_URL}/leaderboard/competitive${params}`;
    },
    competitiveMe: () => `${API_URL}/leaderboard/competitive/me`,
  },
};

// Helper function for API calls with automatic token refresh
export async function fetchApi<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  // Refresh token if needed before making request
  const token = await refreshTokenIfNeeded();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 401 Unauthorized - redirect to login
  if (response.status === 401) {
    handleUnauthorized();
    throw new Error("Session expired. Please log in again.");
  }

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || "Request failed");
  }

  return response.json();
}
