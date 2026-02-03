/**
 * useTripodGameInit Hook
 * Handles tripod game initialization and loading
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuthStore } from "@/store/auth";
import { useGameStore } from "@/store/game";
import { toast } from "@/components/ui/Toast";
import { TRIPOD_CONFIG } from "@/lib/constants";

interface UseTripodGameInitOptions {
  gridSize?: number;
}

export function useTripodGameInit(options: UseTripodGameInitOptions = {}) {
  const { gridSize = TRIPOD_CONFIG.DEFAULT_GRID_SIZE } = options;

  const { _hasHydrated: authHydrated, token } = useAuthStore();
  const gameId = useGameStore((state) => state.id);
  const setGame = useGameStore((state) => state.setGame);

  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createGame = useCallback(async () => {
    if (!token) {
      setError("Not authenticated");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/games/tripod`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ gridSize, difficulty: "easy" }),
        }
      );

      if (!res.ok) {
        throw new Error("Failed to create game");
      }

      const game = await res.json();
      setGame({ id: game.id });
      setIsInitialized(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create game";
      console.error("Error creating game:", err);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [token, gridSize, setGame]);

  // Initial load - create game if not exists
  useEffect(() => {
    if (authHydrated && !gameId && !loading && !isInitialized) {
      createGame();
    } else if (gameId) {
      setIsInitialized(true);
    }
  }, [authHydrated, gameId, createGame, loading, isInitialized]);

  return {
    loading,
    error,
    isInitialized,
    createGame,
    gameId,
  };
}

