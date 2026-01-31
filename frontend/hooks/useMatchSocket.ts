import { useEffect, useCallback } from "react";
import { useMatchStore, Opponent } from "@/store/match";
import { useGameStore } from "@/store/game";
import { useAuthStore } from "@/store/auth";
import { socketService } from "@/lib/socket";
import { SOCKET_EVENTS } from "@/lib/constants";

// Event for player reconnection (not in SOCKET_EVENTS)
const MATCH_PLAYER_RECONNECTED = "match:playerReconnected";

// Key for storing active match info in localStorage
const ACTIVE_MATCH_KEY = "sudoku_active_match";

interface ActiveMatchInfo {
  matchId: string;
  myState: number[][];
  savedAt: number; // Timestamp when saved
}

// Helper to save active match to localStorage
function saveActiveMatch(matchId: string, myState: number[][]) {
  try {
    localStorage.setItem(
      ACTIVE_MATCH_KEY,
      JSON.stringify({ matchId, myState, savedAt: Date.now() }),
    );
  } catch (e) {
    console.error("Failed to save active match:", e);
  }
}

// Helper to load active match from localStorage
function loadActiveMatch(): ActiveMatchInfo | null {
  try {
    const data = localStorage.getItem(ACTIVE_MATCH_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Failed to load active match:", e);
  }
  return null;
}

// Helper to clear active match from localStorage
function clearActiveMatch() {
  try {
    localStorage.removeItem(ACTIVE_MATCH_KEY);
  } catch (e) {
    console.error("Failed to clear active match:", e);
  }
}

export function useMatchSocket() {
  const { token, user } = useAuthStore();
  const matchStore = useMatchStore();
  const { matchId, status } = matchStore;

  // Get display name for player (username or email prefix for registered users)
  const getDisplayName = useCallback(() => {
    if (user?.username) return user.username;
    if (user?.email) return user.email.split("@")[0];
    // For anonymous users, socket service will use stored guest name
    return undefined;
  }, [user]);

  useEffect(() => {
    if (!token) return;

    // Ensure socket is connected with player name
    const playerName = getDisplayName();
    const socket = socketService.connect(token, playerName);

    // === Match Created ===
    socket.on(
      SOCKET_EVENTS.MATCH_CREATED,
      (data: { matchId: string; difficulty: string }) => {
        matchStore.setMatchCreated(data.matchId, data.difficulty);
      },
    );

    // === Match Joined (for guest) ===
    socket.on(
      SOCKET_EVENTS.MATCH_JOINED,
      (data: { matchId: string; opponent: Opponent }) => {
        matchStore.setJoined(data.matchId, data.opponent);
      },
    );

    // === Player Joined (for host) ===
    socket.on(
      SOCKET_EVENTS.MATCH_PLAYER_JOINED,
      (data: { opponent: Opponent }) => {
        matchStore.setOpponent(data.opponent);
        // When guest joins, host's status changes from waiting
        // Read current status from store inside the handler to avoid stale closures
        const currentStatus = useMatchStore.getState().status;
        if (currentStatus === "waiting") {
          useMatchStore.setState({ status: "joined" });
        }
      },
    );

    // === Player Left ===
    socket.on(SOCKET_EVENTS.MATCH_PLAYER_LEFT, (data: { reason: string }) => {
      matchStore.setPlayerLeft(data.reason);
    });

    // === Player Reconnected ===
    socket.on(
      MATCH_PLAYER_RECONNECTED,
      (data: { playerId: string; playerName: string }) => {
        console.log("Opponent reconnected:", data);
        matchStore.setOpponentReconnected();
      },
    );

    // === Player Ready ===
    socket.on(
      SOCKET_EVENTS.MATCH_PLAYER_READY,
      (data: { playerId: string; ready: boolean }) => {
        matchStore.setOpponentReady(data.playerId, data.ready);
      },
    );

    // === Match Start ===
    socket.on(
      SOCKET_EVENTS.MATCH_START,
      (data: {
        puzzle: number[][];
        startTime: number;
        maxDuration: number;
        opponent: Opponent;
      }) => {
        matchStore.startMatch(
          data.puzzle,
          data.startTime,
          data.maxDuration,
          data.opponent,
        );

        // Also set up the game store for playing
        useGameStore.setState({
          currentState: data.puzzle.map((row) => [...row]),
          initialState: data.puzzle.map((row) => [...row]),
          status: "active" as any,
          timeElapsed: 0,
          mistakes: 0,
          moveHistory: [],
        });

        // Save match info to localStorage for reconnection
        saveActiveMatch(useMatchStore.getState().matchId!, data.puzzle);
      },
    );

    // === Match Rejoin (reconnection after refresh) ===
    socket.on(
      "match:rejoin",
      (data: {
        matchId: string;
        status: string;
        isHost: boolean;
        difficulty: string;
        opponent: Opponent;
        puzzle: number[][];
        myState: number[][];
        startTime: number;
        maxDuration: number;
        opponentFilledCells: string[];
        opponentFilledCount: number;
        spectatorCount: number;
      }) => {
        console.log("Received match:rejoin event:", data);

        // Restore match state
        matchStore.setRejoinState({
          matchId: data.matchId,
          status: data.status,
          isHost: data.isHost,
          difficulty: data.difficulty,
          opponent: data.opponent,
          puzzle: data.puzzle,
          startTime: data.startTime,
          maxDuration: data.maxDuration,
          opponentFilledCells: data.opponentFilledCells,
          opponentFilledCount: data.opponentFilledCount,
          spectatorCount: data.spectatorCount,
        });

        // Restore game state
        // Try to restore from localStorage first, otherwise use server state
        const savedMatch = loadActiveMatch();
        let currentState = data.myState;

        if (savedMatch && savedMatch.matchId === data.matchId) {
          // Use saved state from localStorage (more up-to-date)
          currentState = savedMatch.myState;
        }

        useGameStore.setState({
          currentState: currentState.map((row) => [...row]),
          initialState: data.puzzle.map((row) => [...row]),
          status: "active" as any,
          timeElapsed: Math.floor((Date.now() - data.startTime) / 1000),
          mistakes: 0,
          moveHistory: [],
        });

        // Update localStorage with current match
        saveActiveMatch(data.matchId, currentState);
      },
    );

    // === Opponent Moved ===
    socket.on(
      SOCKET_EVENTS.MATCH_OPPONENT_MOVED,
      (data: { row: number; col: number }) => {
        matchStore.addOpponentFilledCell(data.row, data.col);
      },
    );

    // === Opponent Progress (sync) ===
    socket.on(
      SOCKET_EVENTS.MATCH_OPPONENT_PROGRESS,
      (data: { filledCells: string[]; filledCount: number }) => {
        matchStore.setOpponentProgress(data.filledCells, data.filledCount);
      },
    );

    // === Time Sync ===
    socket.on(
      SOCKET_EVENTS.MATCH_TIME_SYNC,
      (data: { serverTime: number; remaining: number }) => {
        matchStore.updateRemainingTime(data.remaining);
      },
    );

    // === Match Ended ===
    socket.on(
      SOCKET_EVENTS.MATCH_ENDED,
      (data: {
        result: "win" | "lose" | "draw";
        winnerId?: string;
        reason: string;
        ratingChange?: number;
        newRating?: number;
        opponentRatingChange?: number;
      }) => {
        // Log chi tiết để debug
        const currentUserId = useAuthStore.getState().user?.id;
        console.log("=== MATCH ENDED EVENT ===");
        console.log("Current user ID:", currentUserId);
        console.log("Result received:", data.result);
        console.log("Winner ID:", data.winnerId);
        console.log("Reason:", data.reason);
        console.log("Rating change:", data.ratingChange);
        console.log(
          "Is current user the winner?",
          data.winnerId === currentUserId,
        );
        console.log("========================");

        matchStore.setResult(
          data.result,
          data.reason,
          data.ratingChange,
          data.newRating,
          data.opponentRatingChange,
        );

        // Clear saved match from localStorage when match ends
        clearActiveMatch();
      },
    );

    // === Match Error ===
    socket.on(
      SOCKET_EVENTS.MATCH_ERROR,
      (data: { message: string; code?: string }) => {
        matchStore.setError(data.message);
      },
    );

    // === Match Cancelled ===
    socket.on(SOCKET_EVENTS.MATCH_CANCELLED, (data: { reason: string }) => {
      matchStore.setCancelled(data.reason);
      // Clear saved match from localStorage when match is cancelled
      clearActiveMatch();
    });

    // === Submit Rejected (incorrect solution) ===
    socket.on(
      SOCKET_EVENTS.MATCH_SUBMIT_REJECTED,
      (data: { reason: string }) => {
        matchStore.setSubmitRejected(data.reason);
      },
    );

    // === Spectator Count ===
    socket.on(
      SOCKET_EVENTS.MATCH_SPECTATOR_COUNT,
      (data: { count: number }) => {
        matchStore.setSpectatorCount(data.count);
      },
    );

    // === Rematch Events ===
    socket.on(
      SOCKET_EVENTS.MATCH_REMATCH_REQUESTED,
      (data: { requestedBy: string }) => {
        matchStore.setRematchReceived(data.requestedBy);
      },
    );

    socket.on(SOCKET_EVENTS.MATCH_REMATCH_PENDING, () => {
      matchStore.setRematchRequested();
    });

    socket.on(
      SOCKET_EVENTS.MATCH_REMATCH_CREATED,
      (data: {
        newMatchId: string;
        hostId: string;
        guestId: string;
        hostName: string;
        guestName: string;
        difficulty: string;
      }) => {
        // Determine if current user is host in new match
        const currentUserId = useAuthStore.getState().user?.id;
        const isHost = currentUserId === data.hostId;
        const opponent = isHost
          ? { id: data.guestId, name: data.guestName }
          : { id: data.hostId, name: data.hostName };

        matchStore.setRematchCreated(data.newMatchId, isHost, opponent);
      },
    );

    socket.on(SOCKET_EVENTS.MATCH_REMATCH_DECLINED, () => {
      matchStore.setRematchDeclined();
    });

    socket.on(SOCKET_EVENTS.MATCH_REMATCH_EXPIRED, () => {
      matchStore.setRematchExpired();
    });

    // === Matchmaking Events ===
    socket.on(
      SOCKET_EVENTS.MATCHMAKING_JOINED,
      (data: { position: number; estimatedWait: number; searchRadius: number }) => {
        matchStore.setQueueStatus(data.position, data.estimatedWait, data.searchRadius);
      },
    );

    socket.on(
      SOCKET_EVENTS.MATCHMAKING_STATUS,
      (data: { position: number; estimatedWait: number; searchRadius: number }) => {
        matchStore.setQueueStatus(data.position, data.estimatedWait, data.searchRadius);
      },
    );

    socket.on(
      SOCKET_EVENTS.MATCHMAKING_FOUND,
      (data: {
        matchId: string;
        opponent: { opponentId: string; opponentName: string; opponentRating: number };
      }) => {
        const opponent = {
          id: data.opponent.opponentId,
          name: data.opponent.opponentName,
        };
        matchStore.setMatched(data.matchId, opponent, data.opponent.opponentRating);
      },
    );

    socket.on(
      SOCKET_EVENTS.MATCHMAKING_CANCELLED,
      (data: { reason: string }) => {
        matchStore.cancelQueue();
        if (data.reason && data.reason !== "Cancelled by user") {
          matchStore.setError(data.reason);
        }
      },
    );

    // Cleanup
    return () => {
      socket.off(SOCKET_EVENTS.MATCH_CREATED);
      socket.off(SOCKET_EVENTS.MATCH_JOINED);
      socket.off(SOCKET_EVENTS.MATCH_PLAYER_JOINED);
      socket.off(SOCKET_EVENTS.MATCH_PLAYER_LEFT);
      socket.off(SOCKET_EVENTS.MATCH_PLAYER_READY);
      socket.off(SOCKET_EVENTS.MATCH_START);
      socket.off(SOCKET_EVENTS.MATCH_OPPONENT_MOVED);
      socket.off(SOCKET_EVENTS.MATCH_OPPONENT_PROGRESS);
      socket.off(SOCKET_EVENTS.MATCH_TIME_SYNC);
      socket.off(SOCKET_EVENTS.MATCH_ENDED);
      socket.off(SOCKET_EVENTS.MATCH_ERROR);
      socket.off(SOCKET_EVENTS.MATCH_CANCELLED);
      socket.off(SOCKET_EVENTS.MATCH_SUBMIT_REJECTED);
      socket.off(SOCKET_EVENTS.MATCH_SPECTATOR_COUNT);
      socket.off(SOCKET_EVENTS.MATCH_REMATCH_REQUESTED);
      socket.off(SOCKET_EVENTS.MATCH_REMATCH_PENDING);
      socket.off(SOCKET_EVENTS.MATCH_REMATCH_CREATED);
      socket.off(SOCKET_EVENTS.MATCH_REMATCH_DECLINED);
      socket.off(SOCKET_EVENTS.MATCH_REMATCH_EXPIRED);
      socket.off(SOCKET_EVENTS.MATCHMAKING_JOINED);
      socket.off(SOCKET_EVENTS.MATCHMAKING_STATUS);
      socket.off(SOCKET_EVENTS.MATCHMAKING_FOUND);
      socket.off(SOCKET_EVENTS.MATCHMAKING_CANCELLED);
      socket.off("match:rejoin");
      socket.off(MATCH_PLAYER_RECONNECTED);
    };
  }, [token]);

  // === Actions ===
  const createMatch = useCallback((difficulty: string) => {
    matchStore.setCreating(difficulty);
    socketService.emit(SOCKET_EVENTS.MATCH_CREATE, { difficulty });
  }, []);

  const joinMatch = useCallback((matchId: string) => {
    matchStore.setJoining();
    socketService.emit(SOCKET_EVENTS.MATCH_JOIN, {
      matchId: matchId.toUpperCase(),
    });
  }, []);

  const setReady = useCallback(() => {
    if (!matchId) return;
    matchStore.setMyReady(true);
    socketService.emit(SOCKET_EVENTS.MATCH_READY, { matchId });
  }, [matchId]);

  const setUnready = useCallback(() => {
    if (!matchId) return;
    matchStore.setMyReady(false);
    socketService.emit(SOCKET_EVENTS.MATCH_UNREADY, { matchId });
  }, [matchId]);

  const leaveMatch = useCallback(() => {
    if (!matchId) return;
    socketService.emit(SOCKET_EVENTS.MATCH_LEAVE, { matchId });
    matchStore.reset();
  }, [matchId]);

  // Surrender match - counts as a loss with ELO penalty
  const surrender = useCallback(() => {
    if (!matchId) return;
    socketService.emit(SOCKET_EVENTS.MATCH_SURRENDER, { matchId });
    matchStore.reset();
  }, [matchId]);

  const sendMove = useCallback(
    (row: number, col: number, value: number) => {
      if (!matchId) return;
      socketService.emit(SOCKET_EVENTS.MATCH_MOVE, {
        matchId,
        row,
        col,
        value,
      });

      // Update localStorage with current game state for reconnection
      const currentState = useGameStore.getState().currentState;
      saveActiveMatch(matchId, currentState);
    },
    [matchId],
  );

  const submitSolution = useCallback(() => {
    if (!matchId) return;
    socketService.emit(SOCKET_EVENTS.MATCH_SUBMIT, { matchId });
  }, [matchId]);

  const syncMatch = useCallback(() => {
    if (!matchId) return;
    socketService.emit(SOCKET_EVENTS.MATCH_SYNC, { matchId });
  }, [matchId]);

  // Rematch actions
  const requestRematch = useCallback(() => {
    if (!matchId) return;
    socketService.emit(SOCKET_EVENTS.MATCH_REMATCH_REQUEST, { matchId });
  }, [matchId]);

  const declineRematch = useCallback(() => {
    if (!matchId) return;
    socketService.emit(SOCKET_EVENTS.MATCH_REMATCH_DECLINE, { matchId });
    matchStore.setRematchDeclined();
  }, [matchId]);

  // Clear active match (call when leaving match or resetting)
  const clearMatchStorage = useCallback(() => {
    clearActiveMatch();
  }, []);

  // Matchmaking actions
  const joinQueue = useCallback((difficulty: string) => {
    matchStore.setQueuing(difficulty);
    socketService.emit(SOCKET_EVENTS.MATCHMAKING_JOIN, { difficulty });
  }, []);

  const cancelQueue = useCallback(() => {
    socketService.emit(SOCKET_EVENTS.MATCHMAKING_CANCEL, {});
    matchStore.cancelQueue();
  }, []);

  return {
    createMatch,
    joinMatch,
    setReady,
    setUnready,
    leaveMatch,
    surrender,
    sendMove,
    submitSolution,
    syncMatch,
    requestRematch,
    declineRematch,
    clearMatchStorage,
    joinQueue,
    cancelQueue,
  };
}
