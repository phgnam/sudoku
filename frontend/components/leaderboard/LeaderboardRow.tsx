"use client";

import { memo } from "react";
import { RankBadge } from "./RankBadge";
import { LeaderboardEntry } from "@/types/leaderboard";

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  isDark: boolean;
  formatTime: (seconds: number) => string;
}

export const LeaderboardRow = memo(function LeaderboardRow({
  entry,
  isDark,
  formatTime,
}: LeaderboardRowProps) {
  const rowStyle: React.CSSProperties = {
    backgroundColor: entry.isCurrentUser
      ? isDark
        ? "rgba(79, 70, 229, 0.2)"
        : "rgba(79, 70, 229, 0.1)"
      : "transparent",
    borderLeft: entry.isCurrentUser ? "3px solid #4f46e5" : "none",
  };

  const cellStyle: React.CSSProperties = {
    padding: "12px",
  };

  return (
    <tr style={rowStyle}>
      <td style={{ ...cellStyle, width: "60px" }}>
        <RankBadge rank={entry.rank} />
      </td>
      <td
        style={{
          ...cellStyle,
          fontWeight: entry.isCurrentUser ? 700 : 500,
        }}
      >
        {entry.username}
        {entry.isCurrentUser && (
          <span style={{ marginLeft: "8px", fontSize: "12px" }}>👤</span>
        )}
      </td>
      <td style={{ ...cellStyle, fontFamily: "monospace", textAlign: "right" }}>
        {formatTime(entry.bestTime)}
      </td>
      <td style={{ ...cellStyle, textAlign: "right" }}>{entry.gamesWon}</td>
    </tr>
  );
});

