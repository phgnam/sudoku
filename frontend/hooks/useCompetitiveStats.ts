"use client";

import { useState, useEffect, useCallback } from "react";
import { api, fetchApi } from "@/lib/api";

export interface CompetitiveStats {
  rating: number;
  competitiveGames: number;
  competitiveWins: number;
  competitiveDraws: number;
  competitiveLosses: number;
  winRate: number;
  rank?: number;
}

export function useCompetitiveStats() {
  const [stats, setStats] = useState<CompetitiveStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchApi<CompetitiveStats>(api.leaderboard.competitiveMe());
      setStats(data);
    } catch (err) {
      // Set error so consumers can distinguish failures from "no games"
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch stats';
      setError(errorMessage);
      // Still provide default stats for graceful degradation
      setStats({
        rating: 1000,
        competitiveGames: 0,
        competitiveWins: 0,
        competitiveDraws: 0,
        competitiveLosses: 0,
        winRate: 0,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}

