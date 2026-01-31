const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export const api = {
  // Auth endpoints
  auth: {
    anonymous: () => `${API_URL}/auth/anonymous`,
    register: () => `${API_URL}/auth/register`,
    login: () => `${API_URL}/auth/login`,
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

// Helper function for API calls
export async function fetchApi<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem("token");

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

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || "Request failed");
  }

  return response.json();
}
