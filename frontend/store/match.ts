import { create } from "zustand";

export type MatchStatus =
  | "idle" // Not in any match
  | "creating" // Creating a room
  | "waiting" // Host waiting for opponent
  | "joining" // Joining a room
  | "joined" // Guest joined, waiting for ready
  | "ready" // Both players ready, starting soon
  | "playing" // Game in progress
  | "finished"; // Game ended

export interface Opponent {
  id: string;
  name: string;
}

export interface MatchState {
  matchId: string | null;
  status: MatchStatus;
  isHost: boolean;
  difficulty: string;
  opponent: Opponent | null;
  myReady: boolean;
  opponentReady: boolean;
  puzzle: number[][] | null;
  startTime: number | null;
  maxDuration: number;
  remainingTime: number;
  opponentFilledCells: Set<string>; // "row,col" format
  opponentFilledCount: number;
  spectatorCount: number; // Number of spectators watching
  result: "win" | "lose" | "draw" | null;
  resultReason: string | null;
  ratingChange: number | null;
  newRating: number | null;
  opponentRatingChange: number | null;
  submitRejected: string | null; // Reason for rejected submission
  error: string | null;
  // Opponent disconnected state (for in-game disconnection)
  opponentDisconnected: boolean;
  opponentDisconnectReason: string | null;
  // Rematch state
  rematchStatus:
    | "none"
    | "requested"
    | "received"
    | "accepted"
    | "declined"
    | "expired";
  rematchRequestedBy: string | null;
}

interface MatchStore extends MatchState {
  // Actions
  setCreating: (difficulty: string) => void;
  setMatchCreated: (matchId: string, difficulty: string) => void;
  setJoining: () => void;
  setJoined: (matchId: string, opponent: Opponent) => void;
  setOpponent: (opponent: Opponent) => void;
  setMyReady: (ready: boolean) => void;
  setOpponentReady: (playerId: string, ready: boolean) => void;
  startMatch: (
    puzzle: number[][],
    startTime: number,
    maxDuration: number,
    opponent: Opponent,
  ) => void;
  addOpponentFilledCell: (row: number, col: number) => void;
  setOpponentProgress: (cells: string[], count: number) => void;
  updateRemainingTime: (remaining: number) => void;
  setSpectatorCount: (count: number) => void;
  setResult: (
    result: "win" | "lose" | "draw",
    reason: string,
    ratingChange?: number,
    newRating?: number,
    opponentRatingChange?: number,
  ) => void;
  setSubmitRejected: (reason: string) => void;
  clearSubmitRejected: () => void;
  setError: (error: string) => void;
  setPlayerLeft: (reason: string) => void;
  setOpponentReconnected: () => void;
  setCancelled: (reason: string) => void;
  reset: () => void;
  // Rematch actions
  setRematchRequested: () => void;
  setRematchReceived: (requestedBy: string) => void;
  setRematchDeclined: () => void;
  setRematchExpired: () => void;
  setRematchCreated: (
    newMatchId: string,
    isHost: boolean,
    opponent: Opponent,
  ) => void;
  // Rejoin action (for reconnection)
  setRejoinState: (data: {
    matchId: string;
    status: string;
    isHost: boolean;
    difficulty: string;
    opponent: Opponent;
    puzzle: number[][];
    startTime: number;
    maxDuration: number;
    opponentFilledCells: string[];
    opponentFilledCount: number;
    spectatorCount: number;
  }) => void;
}

const initialState: MatchState = {
  matchId: null,
  status: "idle",
  isHost: false,
  difficulty: "easy",
  opponent: null,
  myReady: false,
  opponentReady: false,
  puzzle: null,
  startTime: null,
  maxDuration: 20 * 60 * 1000, // 20 minutes
  remainingTime: 20 * 60 * 1000,
  opponentFilledCells: new Set(),
  opponentFilledCount: 0,
  spectatorCount: 0,
  result: null,
  resultReason: null,
  ratingChange: null,
  newRating: null,
  opponentRatingChange: null,
  submitRejected: null,
  error: null,
  // Opponent disconnected state
  opponentDisconnected: false,
  opponentDisconnectReason: null,
  // Rematch state
  rematchStatus: "none",
  rematchRequestedBy: null,
};

export const useMatchStore = create<MatchStore>((set, get) => ({
  ...initialState,

  setCreating: (difficulty) =>
    set({
      status: "creating",
      difficulty,
      isHost: true,
      error: null,
    }),

  setMatchCreated: (matchId, difficulty) =>
    set({
      matchId,
      difficulty,
      status: "waiting",
      isHost: true,
      error: null,
    }),

  setJoining: () =>
    set({
      status: "joining",
      isHost: false,
      error: null,
    }),

  setJoined: (matchId, opponent) =>
    set({
      matchId,
      opponent,
      status: "joined",
      isHost: false,
      error: null,
    }),

  setOpponent: (opponent) => set({ opponent }),

  setMyReady: (ready) => set({ myReady: ready }),

  setOpponentReady: (playerId, ready) => {
    const state = get();
    // If the playerId is opponent's ID, set opponent ready state
    if (state.opponent?.id === playerId) {
      set({ opponentReady: ready });
    }
  },

  startMatch: (puzzle, startTime, maxDuration, opponent) =>
    set({
      puzzle,
      startTime,
      maxDuration,
      remainingTime: maxDuration,
      status: "playing",
      opponent,
      error: null,
    }),

  addOpponentFilledCell: (row, col) =>
    set((state) => {
      const key = `${row},${col}`;
      const newSet = new Set(state.opponentFilledCells);
      newSet.add(key);
      return {
        opponentFilledCells: newSet,
        opponentFilledCount: newSet.size,
      };
    }),

  setOpponentProgress: (cells, count) =>
    set({
      opponentFilledCells: new Set(cells),
      opponentFilledCount: count,
    }),

  updateRemainingTime: (remaining) => set({ remainingTime: remaining }),

  setSpectatorCount: (count) => set({ spectatorCount: count }),

  setResult: (result, reason, ratingChange, newRating, opponentRatingChange) =>
    set({
      result,
      resultReason: reason,
      ratingChange: ratingChange ?? null,
      newRating: newRating ?? null,
      opponentRatingChange: opponentRatingChange ?? null,
      status: "finished",
    }),

  setSubmitRejected: (reason) => set({ submitRejected: reason }),

  clearSubmitRejected: () => set({ submitRejected: null }),

  setError: (error) => set({ error }),

  setPlayerLeft: (reason) => {
    const currentStatus = get().status;
    // If in game (playing), don't change status - just mark opponent as disconnected
    if (currentStatus === "playing") {
      set({
        opponentDisconnected: true,
        opponentDisconnectReason: reason,
      });
    } else {
      // In lobby (waiting/joined/ready), change status
      set({
        opponent: null,
        opponentReady: false,
        status: get().isHost ? "waiting" : "idle",
        error: reason,
      });
    }
  },

  setOpponentReconnected: () =>
    set({
      opponentDisconnected: false,
      opponentDisconnectReason: null,
    }),

  setCancelled: (reason) =>
    set({
      ...initialState,
      error: reason,
    }),

  reset: () => set(initialState),

  // Rematch actions
  setRematchRequested: () => set({ rematchStatus: "requested" }),

  setRematchReceived: (requestedBy) =>
    set({
      rematchStatus: "received",
      rematchRequestedBy: requestedBy,
    }),

  setRematchDeclined: () => set({ rematchStatus: "declined" }),

  setRematchExpired: () => set({ rematchStatus: "expired" }),

  setRematchCreated: (newMatchId, isHost, opponent) =>
    set({
      // Reset most state for new match
      matchId: newMatchId,
      status: "joined",
      isHost,
      opponent,
      myReady: false,
      opponentReady: false,
      puzzle: null,
      startTime: null,
      maxDuration: 20 * 60 * 1000,
      remainingTime: 20 * 60 * 1000,
      opponentFilledCells: new Set(),
      opponentFilledCount: 0,
      spectatorCount: 0,
      result: null,
      resultReason: null,
      ratingChange: null,
      newRating: null,
      opponentRatingChange: null,
      submitRejected: null,
      error: null,
      opponentDisconnected: false,
      opponentDisconnectReason: null,
      rematchStatus: "none",
      rematchRequestedBy: null,
    }),

  // Rejoin action (for reconnection after refresh)
  setRejoinState: (data) => {
    // Calculate remaining time and clamp to [0, maxDuration] range
    const calculatedRemaining = data.maxDuration - (Date.now() - data.startTime);
    const clampedRemaining = Math.max(0, Math.min(calculatedRemaining, data.maxDuration));

    set({
      matchId: data.matchId,
      status: data.status as MatchStatus,
      isHost: data.isHost,
      difficulty: data.difficulty,
      opponent: data.opponent,
      puzzle: data.puzzle,
      startTime: data.startTime,
      maxDuration: data.maxDuration,
      remainingTime: clampedRemaining,
      opponentFilledCells: new Set(data.opponentFilledCells),
      opponentFilledCount: data.opponentFilledCount,
      spectatorCount: data.spectatorCount,
      myReady: true,
      opponentReady: true,
      result: null,
      resultReason: null,
      ratingChange: null,
      newRating: null,
      opponentRatingChange: null,
      submitRejected: null,
      error: null,
      rematchStatus: "none",
      rematchRequestedBy: null,
      opponentDisconnected: false,
      opponentDisconnectReason: null,
    });
  },
}));
