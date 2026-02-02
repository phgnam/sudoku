"use client";

import { useEffect, useState, useRef } from "react";
import { useGameStore, GameStatus } from "@/store/game";
import { socketService } from "@/lib/socket";
import { SOCKET_EVENTS } from "@/lib/constants";

interface TimerProps {
  /** Mode determines behavior: classic auto-syncs with backend, tripod uses local state */
  mode: "classic" | "tripod";
  /** Game ID for classic mode socket sync */
  gameId?: string;
  /** Elapsed time in seconds (for tripod mode - controlled component) */
  elapsedTime?: number;
  /** Whether timer is paused (for tripod mode) */
  isPaused?: boolean;
}

export function Timer({
  mode,
  gameId,
  elapsedTime = 0,
  isPaused = false,
}: TimerProps) {
  // Classic mode: use game store and auto-increment
  const classicGameStore = useGameStore();
  const classicTimeElapsed = classicGameStore.timeElapsed;
  const classicStatus = classicGameStore.status;
  const updateTime = classicGameStore.updateTime;

  const [displayTime, setDisplayTime] = useState(
    mode === "classic" ? classicTimeElapsed : elapsedTime,
  );
  const displayTimeRef = useRef(displayTime);
  const lastSyncedTimeRef = useRef(displayTime);
  const prevGameIdRef = useRef(gameId);
  const justResetRef = useRef(false);

  // Reset timer when gameId changes (new game created) - classic mode only
  useEffect(() => {
    if (mode !== "classic") return;

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
  }, [gameId, updateTime, mode]);

  // Sync displayTime with timeElapsed when it changes (classic mode - after hydration)
  useEffect(() => {
    if (mode !== "classic") return;

    // Skip sync if we just reset for a new game (to prevent old time from overriding)
    if (justResetRef.current) {
      return;
    }
    setDisplayTime(classicTimeElapsed);
    displayTimeRef.current = classicTimeElapsed;
  }, [classicTimeElapsed, mode]);

  // For tripod mode: sync with controlled elapsedTime prop
  useEffect(() => {
    if (mode === "tripod") {
      setDisplayTime(elapsedTime);
      displayTimeRef.current = elapsedTime;
    }
  }, [elapsedTime, mode]);

  // Update ref whenever displayTime changes
  useEffect(() => {
    displayTimeRef.current = displayTime;
  }, [displayTime]);

  // Timer interval - classic mode only
  useEffect(() => {
    if (mode !== "classic") return;
    if (classicStatus !== GameStatus.ACTIVE) return;

    const interval = setInterval(() => {
      setDisplayTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [classicStatus, gameId, mode]);

  // Periodic sync to store AND backend (every 5 seconds) - classic mode only
  useEffect(() => {
    if (mode !== "classic") return;
    if (classicStatus !== GameStatus.ACTIVE) return;

    const syncInterval = setInterval(() => {
      queueMicrotask(() => {
        const currentTime = displayTimeRef.current;

        // Sync to local store
        if (currentTime !== classicTimeElapsed) {
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
  }, [classicStatus, updateTime, classicTimeElapsed, gameId, mode]);

  // Sync to store and backend before page unload - classic mode only
  useEffect(() => {
    if (mode !== "classic") return;

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
  }, [updateTime, gameId, mode]);

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
