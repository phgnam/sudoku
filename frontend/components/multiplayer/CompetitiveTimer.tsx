"use client";

import { useState, useEffect } from "react";

interface CompetitiveTimerProps {
  startTime: number | null;
  maxDuration: number;
  remainingTime?: number; // From server sync
  onTimeSync?: (remaining: number) => void;
}

export function CompetitiveTimer({
  startTime,
  maxDuration,
  remainingTime: serverRemainingTime,
}: CompetitiveTimerProps) {
  const [remaining, setRemaining] = useState(maxDuration);
  // Track a local base time that can be adjusted when server sync occurs
  const [localBaseTime, setLocalBaseTime] = useState<number | null>(startTime);

  // Sync with server time if provided - recompute local base time
  useEffect(() => {
    if (serverRemainingTime !== undefined) {
      // Recompute the local start time based on server's remaining time
      // This ensures the interval continues from the server-corrected value
      const correctedStartTime = Date.now() - (maxDuration - serverRemainingTime);
      setLocalBaseTime(correctedStartTime);
      setRemaining(serverRemainingTime);
    }
  }, [serverRemainingTime, maxDuration]);

  // Update local base time when startTime changes (for new match/rematch)
  // Always update when startTime changes to a new value
  useEffect(() => {
    if (startTime) {
      setLocalBaseTime(startTime);
      setRemaining(maxDuration);
    }
  }, [startTime, maxDuration]);

  useEffect(() => {
    if (!localBaseTime) return;

    const updateTimer = () => {
      const elapsed = Date.now() - localBaseTime;
      const rem = Math.max(0, maxDuration - elapsed);
      setRemaining(rem);
    };

    // Initial update
    updateTimer();

    // Update every 100ms for smooth countdown
    const interval = setInterval(updateTimer, 100);

    return () => clearInterval(interval);
  }, [localBaseTime, maxDuration]);

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  
  const isLowTime = remaining < 60000; // Less than 1 minute
  const isCritical = remaining < 30000; // Less than 30 seconds

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 16px",
        backgroundColor: isCritical
          ? "#fee2e2"
          : isLowTime
          ? "#fef3c7"
          : "#f0fdf4",
        borderRadius: "12px",
        border: `2px solid ${
          isCritical ? "#ef4444" : isLowTime ? "#f59e0b" : "#22c55e"
        }`,
      }}
    >
      <span style={{ fontSize: "20px" }}>⏱️</span>
      <span
        style={{
          fontSize: "24px",
          fontWeight: 700,
          fontFamily: "monospace",
          color: isCritical ? "#dc2626" : isLowTime ? "#d97706" : "#16a34a",
          animation: isCritical ? "pulse 0.5s ease-in-out infinite" : "none",
        }}
      >
        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </span>
    </div>
  );
}

