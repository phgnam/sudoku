"use client";

import { useState, useEffect, useCallback } from "react";
import { api, fetchApi } from "@/lib/api";
import {
  LeaderboardResponse,
  LeaderboardFilters,
} from "@/types/leaderboard";

interface UseLeaderboardOptions {
  filters: LeaderboardFilters;
  limit?: number;
  enabled?: boolean;
}

interface UseLeaderboardReturn {
  data: LeaderboardResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for fetching leaderboard data
 * Follows existing dashboard fetch pattern with loading/error/data states
 * No auto-refresh - user manually refetches or navigates to see updates
 */
export function useLeaderboard({
  filters,
  limit = 50,
  enabled = true,
}: UseLeaderboardOptions): UseLeaderboardReturn {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetchApi<LeaderboardResponse>(
        api.leaderboard.get({
          difficulty: filters.difficulty,
          period: filters.period,
          limit,
        })
      );

      setData(response);
    } catch (err) {
      console.error("Failed to fetch leaderboard:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load leaderboard"
      );
    } finally {
      setIsLoading(false);
    }
  }, [filters.difficulty, filters.period, limit, enabled]);

  // Initial fetch + refetch on filter change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
  };
}

