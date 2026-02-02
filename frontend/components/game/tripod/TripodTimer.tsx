'use client';

import React, { useEffect, useRef } from 'react';
import { useGameStore } from '@/store/game';

interface TripodTimerProps {
  isPaused?: boolean;
}

/**
 * TripodTimer - Displays elapsed time in MM:SS format
 * Auto-updates every second when not paused
 */
export function TripodTimer({ isPaused = false }: TripodTimerProps) {
  const tripod = useGameStore((state) => state.tripod);
  const updateTripodElapsedTime = useGameStore((state) => state.updateTripodElapsedTime);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const elapsedTime = tripod?.elapsedTime ?? 0;
  const startTime = tripod?.startTime ?? null;
  const isTimerPaused = tripod?.isTimerPaused ?? false;
  const totalPausedDuration = tripod?.totalPausedDuration ?? 0;

  // Update elapsed time every second
  useEffect(() => {
    if (isPaused || isTimerPaused || !startTime) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      // Subtract total paused duration from elapsed time
      const elapsed = Math.floor((now - startTime - totalPausedDuration) / 1000);
      updateTripodElapsedTime(elapsed);
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPaused, isTimerPaused, startTime, totalPausedDuration, updateTripodElapsedTime]);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 12px',
        borderRadius: '8px',
        backgroundColor: isTimerPaused ? '#fef3c7' : '#f0fdf4',
        border: `1px solid ${isTimerPaused ? '#fbbf24' : '#86efac'}`,
      }}
      className="dark:bg-slate-700 dark:border-slate-600"
    >
      {/* Clock Icon */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke={isTimerPaused ? '#d97706' : '#22c55e'}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>

      {/* Time Display */}
      <span
        style={{
          fontSize: '16px',
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          color: isTimerPaused ? '#d97706' : '#16a34a',
          minWidth: '48px',
        }}
        className="dark:text-slate-200"
      >
        {formatTime(elapsedTime)}
      </span>

      {/* Paused Indicator */}
      {isTimerPaused && (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="#d97706"
          stroke="none"
        >
          <rect x="6" y="4" width="4" height="16" rx="1" />
          <rect x="14" y="4" width="4" height="16" rx="1" />
        </svg>
      )}
    </div>
  );
}

export default TripodTimer;

