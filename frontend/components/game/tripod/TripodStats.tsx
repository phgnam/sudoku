"use client";

import React, { useState } from "react";
import { Clock, Plus, Minus, Hash, Undo, CheckCircle } from "lucide-react";
import { useTripodStore } from "@/store/tripod";

/**
 * TripodStats - Collapsible panel showing game statistics
 */
export function TripodStats() {
  const [isExpanded, setIsExpanded] = useState(false);
  const tripod = useTripodStore((state) => state.tripod);

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
    { label: "Time Elapsed", value: formatTime(elapsedTime), Icon: Clock },
    { label: "Borders Placed", value: stats.bordersPlaced, Icon: Plus },
    { label: "Borders Removed", value: stats.bordersRemoved, Icon: Minus },
    { label: "Numbers Entered", value: stats.numbersEntered, Icon: Hash },
    { label: "Undo Count", value: stats.undoCount, Icon: Undo },
    { label: "Validations", value: stats.validationCount, Icon: CheckCircle },
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
          {statItems.map((item) => {
            const IconComponent = item.Icon;
            return (
              <div
                key={item.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  padding: "10px",
                  backgroundColor: "#f8fafc",
                  borderRadius: "8px",
                  transition: "all 0.2s ease",
                  cursor: "default",
                }}
                className="dark:bg-slate-700 hover:shadow-md hover:-translate-y-0.5"
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "11px",
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                  className="dark:text-slate-400"
                >
                  <IconComponent
                    size={14}
                    className="text-teal-600 dark:text-teal-400"
                    style={{ color: "#14b8a6" }}
                  />
                  <span>{item.label}</span>
                </div>
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
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TripodStats;
