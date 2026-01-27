"use client";

import { useTranslations } from "next-intl";
import { Difficulty, LeaderboardPeriod } from "@/types/leaderboard";

interface LeaderboardFiltersProps {
  difficulty: Difficulty;
  period: LeaderboardPeriod;
  onDifficultyChange: (d: Difficulty) => void;
  onPeriodChange: (p: LeaderboardPeriod) => void;
  isDark: boolean;
}

export function LeaderboardFilters({
  difficulty,
  period,
  onDifficultyChange,
  onPeriodChange,
  isDark,
}: LeaderboardFiltersProps) {
  const t = useTranslations();

  const difficulties: Difficulty[] = ["easy", "normal", "hard"];
  const periods: { value: LeaderboardPeriod; label: string }[] = [
    { value: "daily", label: t("leaderboard.period.daily") },
    { value: "weekly", label: t("leaderboard.period.weekly") },
    { value: "monthly", label: t("leaderboard.period.monthly") },
    { value: "allTime", label: t("leaderboard.period.allTime") },
  ];

  const buttonStyle = (active: boolean): React.CSSProperties => ({
    padding: "8px 16px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "14px",
    backgroundColor: active ? "#4f46e5" : isDark ? "#334155" : "#e0e7ff",
    color: active ? "white" : isDark ? "#94a3b8" : "#4f46e5",
    transition: "all 0.2s",
  });

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "16px",
        marginBottom: "16px",
      }}
    >
      {/* Difficulty Tabs */}
      <div style={{ display: "flex", gap: "8px" }}>
        {difficulties.map((d) => (
          <button
            key={d}
            onClick={() => onDifficultyChange(d)}
            style={buttonStyle(difficulty === d)}
          >
            {t(`home.difficulty.${d}`)}
          </button>
        ))}
      </div>

      {/* Period Tabs */}
      <div style={{ display: "flex", gap: "8px", marginLeft: "auto" }}>
        {periods.map((p) => (
          <button
            key={p.value}
            onClick={() => onPeriodChange(p.value)}
            style={buttonStyle(period === p.value)}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

