"use client";

import { useEffect, useState, useRef } from "react";
import { useGameStore, GameStatus } from "@/store/game";
import { socketService } from "@/lib/socket";
import { SOCKET_EVENTS } from "@/lib/constants";

export function GameTimer() {
  const { id: gameId, timeElapsed, status, updateTime } = useGameStore();
  const [displayTime, setDisplayTime] = useState(timeElapsed);
  const displayTimeRef = useRef(timeElapsed);
  const lastSyncedTimeRef = useRef(timeElapsed);
  const prevGameIdRef = useRef(gameId);
  const justResetRef = useRef(false);

  // Reset timer when gameId changes (new game created)
  useEffect(() => {
    if (gameId !== prevGameIdRef.current) {
      // New game detected, reset everything
      setDisplayTime(0);
      displayTimeRef.current = 0;
      lastSyncedTimeRef.current = 0;
      prevGameIdRef.current = gameId;
      // Also update the store to ensure timeElapsed is 0
      updateTime(0);
      // Mark that we just reset to prevent timeElapsed sync from overriding
      justResetRef.current = true;
      // Clear the flag after a short delay to allow normal sync later
      setTimeout(() => {
        justResetRef.current = false;
      }, 100);
    }
  }, [gameId, updateTime]);

  // Sync displayTime with timeElapsed when it changes (e.g., after hydration)
  useEffect(() => {
    // Skip sync if we just reset for a new game (to prevent old time from overriding)
    if (justResetRef.current) {
      return;
    }
    setDisplayTime(timeElapsed);
    displayTimeRef.current = timeElapsed;
  }, [timeElapsed]);

  // Update ref whenever displayTime changes
  useEffect(() => {
    displayTimeRef.current = displayTime;
  }, [displayTime]);

  // Timer interval - restart when gameId changes (new game)
  useEffect(() => {
    if (status !== GameStatus.ACTIVE) return;

    // Reset displayTime to 0 at the start of a new game interval
    // This ensures the timer starts fresh when gameId changes
    const interval = setInterval(() => {
      setDisplayTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [status, gameId]); // Add gameId to restart interval on new game

  // Periodic sync to store AND backend (every 5 seconds)
  useEffect(() => {
    if (status !== GameStatus.ACTIVE) return;

    const syncInterval = setInterval(() => {
      queueMicrotask(() => {
        const currentTime = displayTimeRef.current;

        // Sync to local store
        if (currentTime !== timeElapsed) {
          updateTime(currentTime);
        }

        // Sync to backend if time has changed since last sync
        if (gameId && currentTime !== lastSyncedTimeRef.current) {
          socketService.emit(SOCKET_EVENTS.GAME_UPDATE_TIME, {
            gameId,
            timeElapsed: currentTime,
          });
          lastSyncedTimeRef.current = currentTime;
        }
      });
    }, 5000); // Sync every 5 seconds

    return () => clearInterval(syncInterval);
  }, [status, updateTime, timeElapsed, gameId]);

  // Sync to store and backend before page unload (F5, close tab, navigation)
  useEffect(() => {
    const handleBeforeUnload = () => {
      const currentTime = displayTimeRef.current;

      // Sync current time to store
      updateTime(currentTime);

      // Sync to backend
      if (gameId) {
        socketService.emit(SOCKET_EVENTS.GAME_UPDATE_TIME, {
          gameId,
          timeElapsed: currentTime,
        });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      // Also sync on unmount (navigation within app)
      handleBeforeUnload();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [updateTime, gameId]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#64748b"
        strokeWidth={2}
        style={{ width: "16px", height: "16px", flexShrink: 0 }}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span
        data-testid="timer"
        style={{
          fontFamily: "monospace",
          fontSize: "16px",
          fontWeight: 600,
          color: "#1e293b",
        }}
        className="dark:text-white"
      >
        {formatTime(displayTime)}
      </span>
    </div>
  );
}
