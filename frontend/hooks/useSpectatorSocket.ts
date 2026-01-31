"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { useSpectatorStore } from "@/store/spectator";
import { socketService } from "@/lib/socket";
import { SOCKET_EVENTS } from "@/lib/constants";

export function useSpectatorSocket(matchId: string | null) {
  const { token } = useAuthStore();
  const [isConnected, setIsConnected] = useState(false);
  const hasJoinedRef = useRef(false);

  const {
    setSpectateState,
    updateState,
    setSpectatorCount,
    setMatchEnded,
    setError,
    reset,
  } = useSpectatorStore();

  // Join as spectator
  const joinSpectate = useCallback((targetMatchId: string) => {
    if (!isConnected) {
      setError("Not connected to server");
      return;
    }

    socketService.emit(SOCKET_EVENTS.MATCH_SPECTATE, { matchId: targetMatchId });
  }, [isConnected, setError]);

  // Leave spectating
  const leaveSpectate = useCallback(() => {
    if (!matchId) return;

    socketService.emit(SOCKET_EVENTS.MATCH_SPECTATE_LEAVE, { matchId });
    reset();
    hasJoinedRef.current = false;
  }, [matchId, reset]);

  // Set up socket connection and event listeners
  useEffect(() => {
    if (!token) return;

    // Connect socket
    const socket = socketService.connect(token);
    setIsConnected(true);

    // Initial state when joining as spectator
    socket.on(SOCKET_EVENTS.MATCH_SPECTATE_STATE, (data: {
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
    }) => {
      setSpectateState(data);
    });

    // Update when players make moves
    socket.on(SOCKET_EVENTS.MATCH_SPECTATOR_UPDATE, (data: {
      playerId: string;
      playerRole: "host" | "guest";
      row: number;
      col: number;
      value: number;
      hostState: number[][] | null;
      guestState: number[][] | null;
    }) => {
      updateState({
        hostState: data.hostState,
        guestState: data.guestState,
      });
    });

    // Spectator count updates
    socket.on(SOCKET_EVENTS.MATCH_SPECTATOR_COUNT, (data: { count: number }) => {
      setSpectatorCount(data.count);
    });

    // Match ended for spectators
    socket.on(SOCKET_EVENTS.MATCH_SPECTATOR_ENDED, (data: {
      matchId: string;
      winnerId?: string;
      result: string;
      reason: string;
      hostName: string;
      guestName: string | null;
    }) => {
      const winnerName = data.winnerId
        ? (data.result === "host_win" ? data.hostName : data.guestName || undefined)
        : undefined;

      setMatchEnded({
        winnerId: data.winnerId,
        winnerName,
        reason: data.reason,
      });
    });

    // Error handling
    socket.on(SOCKET_EVENTS.MATCH_ERROR, (data: { message: string }) => {
      setError(data.message);
    });

    return () => {
      socket.off(SOCKET_EVENTS.MATCH_SPECTATE_STATE);
      socket.off(SOCKET_EVENTS.MATCH_SPECTATOR_UPDATE);
      socket.off(SOCKET_EVENTS.MATCH_SPECTATOR_COUNT);
      socket.off(SOCKET_EVENTS.MATCH_SPECTATOR_ENDED);
      socket.off(SOCKET_EVENTS.MATCH_ERROR);
      setIsConnected(false);
    };
  }, [token, setSpectateState, updateState, setSpectatorCount, setMatchEnded, setError]);

  // Auto-join when matchId is provided and connected
  useEffect(() => {
    if (matchId && isConnected && !hasJoinedRef.current) {
      joinSpectate(matchId);
      hasJoinedRef.current = true;
    }
  }, [matchId, isConnected, joinSpectate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hasJoinedRef.current && matchId) {
        leaveSpectate();
      }
    };
  }, [matchId, leaveSpectate]);

  return {
    joinSpectate,
    leaveSpectate,
    isConnected,
  };
}

