"use client";

import { useTranslations } from "next-intl";
import { LeaderboardRow } from "./LeaderboardRow";
import { LeaderboardEntry } from "@/types/leaderboard";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  isDark: boolean;
}

export function LeaderboardTable({ entries, isDark }: LeaderboardTableProps) {
  const t = useTranslations();

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const colors = {
    headerBg: isDark ? "#1e293b" : "#f8fafc",
    border: isDark ? "#3730a3" : "#e0e7ff",
    text: isDark ? "#94a3b8" : "#64748b",
  };

  const headerCellStyle: React.CSSProperties = {
    padding: "12px",
    fontSize: "14px",
    fontWeight: 600,
    color: colors.text,
  };

  if (entries.length === 0) {
    return (
      <div
        style={{ textAlign: "center", padding: "48px", color: colors.text }}
      >
        {t("leaderboard.noEntries")}
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto", maxHeight: "400px", overflowY: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead
          style={{
            position: "sticky",
            top: 0,
            backgroundColor: colors.headerBg,
            zIndex: 1,
          }}
        >
          <tr style={{ borderBottom: `2px solid ${colors.border}` }}>
            <th style={{ ...headerCellStyle, textAlign: "left" }}>
              {t("leaderboard.rank")}
            </th>
            <th style={{ ...headerCellStyle, textAlign: "left" }}>
              {t("leaderboard.player")}
            </th>
            <th style={{ ...headerCellStyle, textAlign: "right" }}>
              {t("leaderboard.bestTime")}
            </th>
            <th style={{ ...headerCellStyle, textAlign: "right" }}>
              {t("leaderboard.gamesWon")}
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <LeaderboardRow
              key={entry.userId}
              entry={entry}
              isDark={isDark}
              formatTime={formatTime}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

