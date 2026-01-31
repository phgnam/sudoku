"use client";

import { create } from "zustand";

export interface SpectatorState {
  // Connection state
  isSpectating: boolean;
  matchId: string | null;
  
  // Player info
  hostId: string | null;
  hostName: string | null;
  guestId: string | null;
  guestName: string | null;
  
  // Game state
  hostState: number[][] | null;
  guestState: number[][] | null;
  puzzle: number[][] | null;
  difficulty: string | null;
  startTime: number | null;
  spectatorCount: number;
  status: "waiting" | "playing" | "finished" | null;
  
  // Match result
  result: {
    winnerId?: string;
    winnerName?: string;
    reason: string;
  } | null;
  
  // Error state
  error: string | null;
}

interface SpectatorActions {
  // Set match data from initial state
  setSpectateState: (data: {
    matchId: string;
    status: string;
    hostId: string;
    hostName: string;
    guestId: string | null;
    guestName: string | null;
    hostState: number[][] | null;
    guestState: number[][] | null;
    puzzle: number[][] | null;
    difficulty: string;
    startTime: number | null;
    spectatorCount: number;
  }) => void;
  
  // Update from move events
  updateState: (data: {
    hostState: number[][] | null;
    guestState: number[][] | null;
  }) => void;
  
  // Update spectator count
  setSpectatorCount: (count: number) => void;
  
  // Set match ended
  setMatchEnded: (data: {
    winnerId?: string;
    winnerName?: string;
    reason: string;
  }) => void;
  
  // Set error
  setError: (error: string) => void;
  
  // Reset state
  reset: () => void;
}

const initialState: SpectatorState = {
  isSpectating: false,
  matchId: null,
  hostId: null,
  hostName: null,
  guestId: null,
  guestName: null,
  hostState: null,
  guestState: null,
  puzzle: null,
  difficulty: null,
  startTime: null,
  spectatorCount: 0,
  status: null,
  result: null,
  error: null,
};

export const useSpectatorStore = create<SpectatorState & SpectatorActions>((set) => ({
  ...initialState,
  
  setSpectateState: (data) => {
    const status = data.status === "playing" ? "playing" :
                   data.status === "finished" ? "finished" :
                   "waiting";
    set({
      isSpectating: true,
      matchId: data.matchId,
      status,
      hostId: data.hostId,
      hostName: data.hostName,
      guestId: data.guestId,
      guestName: data.guestName,
      hostState: data.hostState,
      guestState: data.guestState,
      puzzle: data.puzzle,
      difficulty: data.difficulty,
      startTime: data.startTime,
      spectatorCount: data.spectatorCount,
      result: null, // Reset result when loading new match
      error: null,
    });
  },
  
  updateState: (data) => {
    set({
      hostState: data.hostState,
      guestState: data.guestState,
    });
  },
  
  setSpectatorCount: (count) => {
    set({ spectatorCount: count });
  },
  
  setMatchEnded: (data) => {
    set({
      status: "finished",
      result: {
        winnerId: data.winnerId,
        winnerName: data.winnerName,
        reason: data.reason,
      },
    });
  },
  
  setError: (error) => {
    set({ error });
  },
  
  reset: () => {
    set(initialState);
  },
}));

