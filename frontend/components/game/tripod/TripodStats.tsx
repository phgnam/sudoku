"use client";

import React, { useState } from "react";
import { useGameStore } from "@/store/game";

/**
 * TripodStats - Collapsible panel showing game statistics
 */
export function TripodStats() {
  const [isExpanded, setIsExpanded] = useState(false);
  const tripod = useGameStore((state) => state.tripod);

  const stats = tripod?.stats;
  const elapsedTime = tripod?.elapsedTime ?? 0;

  if (!stats) return null;

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const statItems = [
    { label: "Time Elapsed", value: formatTime(elapsedTime), icon: "⏱️" },
    { label: "Borders Placed", value: stats.bordersPlaced, icon: "➕" },
    { label: "Borders Removed", value: stats.bordersRemoved, icon: "➖" },
    { label: "Numbers Entered", value: stats.numbersEntered, icon: "🔢" },
    { label: "Undo Count", value: stats.undoCount, icon: "↩️" },
    { label: "Validations", value: stats.validationCount, icon: "✓" },
  ];

  return (
    <div
      style={{
        borderRadius: "12px",
        overflow: "hidden",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
      }}
      className="bg-white dark:bg-slate-800"
    >
      {/* Header - Clickable to expand/collapse */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          border: "none",
          backgroundColor: "transparent",
          cursor: "pointer",
          fontSize: "14px",
          fontWeight: 600,
        }}
        className="dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700"
      >
        <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          📊 Statistics
        </span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          style={{
            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div
          style={{
            padding: "0 16px 16px",
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "12px",
          }}
        >
          {statItems.map((item) => (
            <div
              key={item.label}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                padding: "10px",
                backgroundColor: "#f8fafc",
                borderRadius: "8px",
              }}
              className="dark:bg-slate-700"
            >
              <span
                style={{
                  fontSize: "11px",
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
                className="dark:text-slate-400"
              >
                {item.icon} {item.label}
              </span>
              <span
                style={{
                  fontSize: "18px",
                  fontWeight: 700,
                  fontVariantNumeric: "tabular-nums",
                }}
                className="dark:text-white"
              >
                {item.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TripodStats;
