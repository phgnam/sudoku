import { authService } from "./auth-service";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

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

// User-friendly error messages mapping
const ERROR_MESSAGES: Record<number, string> = {
  401: "Session expired. Please log in again.",
  403: "Access denied.",
  404: "Resource not found.",
  500: "Server error. Please try again.",
};

// Helper function for API calls with automatic token refresh
export async function fetchApi<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  // Refresh token if needed before making request
  const token = await authService.refreshTokenIfNeeded();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (error) {
    // Network error (offline, DNS failure, CORS, etc.)
    throw new Error("Network error. Check your connection.");
  }

  // Handle 401 Unauthorized - redirect to login
  if (response.status === 401) {
    authService.handleUnauthorized();
    throw new Error(ERROR_MESSAGES[401]);
  }

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: ERROR_MESSAGES[response.status] || "Request failed" }));
    throw new Error(error.message || ERROR_MESSAGES[response.status] || "Request failed");
  }

  // Handle empty response (204 No Content or empty body)
  const contentLength = response.headers.get("content-length");
  if (response.status === 204 || contentLength === "0") {
    return undefined as T;
  }

  return response.json();
}
