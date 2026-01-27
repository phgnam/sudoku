"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Trophy, Loader2, RefreshCw } from "lucide-react";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { LeaderboardFilters } from "./LeaderboardFilters";
import { LeaderboardTable } from "./LeaderboardTable";
import { Difficulty, LeaderboardPeriod } from "@/types/leaderboard";

interface LeaderboardSectionProps {
  cardStyle: React.CSSProperties;
  isDark: boolean;
  colors: { title: string; text: string };
}

export function LeaderboardSection({
  cardStyle,
  isDark,
  colors,
}: LeaderboardSectionProps) {
  const t = useTranslations();
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [period, setPeriod] = useState<LeaderboardPeriod>("allTime");

  const { data, isLoading, error, refetch } = useLeaderboard({
    filters: { difficulty, period },
    limit: 50,
  });

  return (
    <section
      aria-labelledby="leaderboard-heading"
      style={{ ...cardStyle, marginBottom: "32px" }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Trophy
            style={{ width: 28, height: 28, color: "#f59e0b" }}
            aria-hidden="true"
          />
          <h2
            id="leaderboard-heading"
            style={{ fontSize: "24px", fontWeight: 700, color: colors.title }}
          >
            {t("leaderboard.title")}
          </h2>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          aria-label={t("leaderboard.refresh")}
          aria-busy={isLoading}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 12px",
            border: "none",
            borderRadius: "8px",
            backgroundColor: isDark ? "#334155" : "#e0e7ff",
            color: isDark ? "#94a3b8" : "#4f46e5",
            cursor: isLoading ? "not-allowed" : "pointer",
            opacity: isLoading ? 0.6 : 1,
            fontSize: "14px",
            fontWeight: 500,
            outline: "none",
          }}
          className="focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
        >
          <RefreshCw
            style={{
              width: 16,
              height: 16,
              animation: isLoading ? "spin 1s linear infinite" : "none",
            }}
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Filters */}
      <LeaderboardFilters
        difficulty={difficulty}
        period={period}
        onDifficultyChange={setDifficulty}
        onPeriodChange={setPeriod}
        isDark={isDark}
      />

      {/* Content */}
      {isLoading ? (
        <div
          role="status"
          aria-live="polite"
          aria-label={t("leaderboard.loading")}
          style={{ display: "flex", justifyContent: "center", padding: "48px" }}
        >
          <Loader2
            style={{
              width: 32,
              height: 32,
              color: "#4f46e5",
              animation: "spin 1s linear infinite",
            }}
            aria-hidden="true"
          />
          <span className="sr-only">{t("leaderboard.loading")}</span>
        </div>
      ) : error ? (
        <div
          role="alert"
          aria-live="assertive"
          style={{ textAlign: "center", padding: "24px", color: "#ef4444" }}
        >
          {error}
        </div>
      ) : (
        <LeaderboardTable entries={data?.entries || []} isDark={isDark} />
      )}

      {/* CSS for spin animation and screen reader only text */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border-width: 0;
        }
        .focus-visible\\:ring-2:focus-visible {
          outline: none;
          box-shadow: 0 0 0 2px white, 0 0 0 4px #4f46e5;
        }
      `}</style>
    </section>
  );
}

