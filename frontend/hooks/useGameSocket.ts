import { useEffect, useCallback } from "react";
import { useGameStore, GameStatus } from "@/store/game";
import { useAuthStore } from "@/store/auth";
import { socketService } from "@/lib/socket";
import { api, fetchApi } from "@/lib/api";
import { SOCKET_EVENTS } from "@/lib/constants";

export function useGameSocket() {
  const { token, user } = useAuthStore();
  const {
    id: gameId,
    setGame,
    updateState,
    addMove,
    incrementHints,
    incrementMistakes,
    setStatus,
  } = useGameStore();

  // Get display name for player (username or email prefix for registered users)
  const getDisplayName = useCallback(() => {
    if (user?.username) return user.username;
    if (user?.email) return user.email.split("@")[0];
    // For anonymous users, socket service will use stored guest name
    return undefined;
  }, [user]);

  useEffect(() => {
    if (!token) return;

    // Connect socket with player name
    const playerName = getDisplayName();
    const socket = socketService.connect(token, playerName);

    // Join game room if game exists
    if (gameId) {
      socket.emit(SOCKET_EVENTS.GAME_JOIN, { gameId });
    }

    // Listen for game state updates
    socket.on(SOCKET_EVENTS.GAME_STATE, (data: any) => {
      // Sync hintedCells from backend if available
      if (data.hintedCells !== undefined) {
        useGameStore.setState({ hintedCells: data.hintedCells });
      }

      // Update state directly from backend (hints are now persisted in backend)
      updateState(data.currentState);

      // Recalculate wrongCells based on conflicts (same logic as backend isValidMove)
      if (data.currentState) {
        const grid = data.currentState;
        const newWrongCells: Array<{ row: number; col: number }> = [];

        // Helper function to check conflict (same as backend)
        const hasConflict = (row: number, col: number, num: number): boolean => {
          if (num === 0) return false;

          // Check row for duplicates
          for (let x = 0; x < 9; x++) {
            if (x !== col && grid[row][x] === num) return true;
          }

          // Check column for duplicates
          for (let x = 0; x < 9; x++) {
            if (x !== row && grid[x][col] === num) return true;
          }

          // Check 3x3 box for duplicates
          const startRow = Math.floor(row / 3) * 3;
          const startCol = Math.floor(col / 3) * 3;
          for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
              const r = startRow + i;
              const c = startCol + j;
              if ((r !== row || c !== col) && grid[r][c] === num) return true;
            }
          }

          return false;
        };

        for (let row = 0; row < 9; row++) {
          for (let col = 0; col < 9; col++) {
            const value = grid[row][col];
            // If cell has a value and it conflicts, add to wrongCells
            if (value !== 0 && hasConflict(row, col, value)) {
              newWrongCells.push({ row, col });
            }
          }
        }
        useGameStore.setState({ wrongCells: newWrongCells });
      }

      if (data.moveHistory !== undefined) {
        // Sync moveHistory from backend
        useGameStore.setState({ moveHistory: data.moveHistory });
      }

      if (data.mistakes !== undefined) {
        // Update mistakes in store
        useGameStore.setState({ mistakes: data.mistakes });
      }

      if (data.status) {
        setStatus(data.status);
      }
    });

    // Listen for errors
    socket.on(SOCKET_EVENTS.GAME_ERROR, (data: any) => {
      console.error("Game error:", data.message);
    });

    return () => {
      socket.off(SOCKET_EVENTS.GAME_STATE);
      socket.off(SOCKET_EVENTS.GAME_ERROR);
    };
  }, [token, gameId]);

  const makeMove = useCallback(
    (row: number, col: number, value: number) => {
      if (!gameId) return;

      // Get current timeElapsed from store to send with the move
      // This ensures backend has the latest time when checking for game completion
      const currentTimeElapsed = useGameStore.getState().timeElapsed;

      // Only use Socket for real-time updates, no duplicate API call
      socketService.emit(SOCKET_EVENTS.GAME_MOVE, {
        gameId,
        row,
        col,
        value,
        timeElapsed: currentTimeElapsed,
      });
    },
    [gameId],
  );

  const undoMove = useCallback(() => {
    if (!gameId) return;

    // Only use Socket for real-time updates
    socketService.emit(SOCKET_EVENTS.GAME_UNDO, { gameId });
  }, [gameId]);

  // Apply hint value to backend (saves the cell value and marks it as hinted)
  const applyHintToBackend = useCallback(
    (row: number, col: number, value: number) => {
      if (!gameId) return;

      // Get current timeElapsed for accurate completion time tracking
      const currentTimeElapsed = useGameStore.getState().timeElapsed;

      // Send to backend via socket
      socketService.emit(SOCKET_EVENTS.GAME_HINT_APPLY, {
        gameId,
        row,
        col,
        value,
        timeElapsed: currentTimeElapsed,
      });

      // Also call API as backup
      fetchApi(api.games.hintApply(gameId), {
        method: "POST",
        body: JSON.stringify({ row, col, value, timeElapsed: currentTimeElapsed }),
      }).catch(console.error);
    },
    [gameId]
  );

  const requestHint = useCallback(async (): Promise<{
    type: string;
    data: {
      row?: number;
      col?: number;
      value?: number;
      possibleValue?: number;
      conflicts?: Array<{ row: number; col: number }>;
      steps?: {
        row: { values: number[]; cells: Array<{ row: number; col: number }> };
        col: { values: number[]; cells: Array<{ row: number; col: number }> };
        box: { values: number[]; cells: Array<{ row: number; col: number }> };
      };
    };
  } | null> => {
    if (!gameId) return null;

    socketService.emit(SOCKET_EVENTS.GAME_HINT, { gameId });

    try {
      const hint = await fetchApi<{
        type: string;
        data: {
          row?: number;
          col?: number;
          value?: number;
          possibleValue?: number;
          conflicts?: Array<{ row: number; col: number }>;
          steps?: {
            row: { values: number[]; cells: Array<{ row: number; col: number }> };
            col: { values: number[]; cells: Array<{ row: number; col: number }> };
            box: { values: number[]; cells: Array<{ row: number; col: number }> };
          };
        };
      }>(api.games.hint(gameId), {
        method: "POST",
      });
      incrementHints();
      return hint;
    } catch (error) {
      console.error("Hint error:", error);
      return null;
    }
  }, [gameId, incrementHints]);

  // Sync time elapsed to backend
  const syncTime = useCallback(
    (timeElapsed: number) => {
      if (!gameId) return;

      socketService.emit(SOCKET_EVENTS.GAME_UPDATE_TIME, {
        gameId,
        timeElapsed,
      });
    },
    [gameId]
  );

  return {
    makeMove,
    undoMove,
    requestHint,
    applyHintToBackend,
    syncTime,
  };
}
