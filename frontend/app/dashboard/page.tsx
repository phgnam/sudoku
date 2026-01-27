"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Smile, Zap, Flame, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { useUIStore } from "@/store/ui";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { LeaderboardSection } from "@/components/leaderboard";
import { api, fetchApi } from "@/lib/api";

// Types for dashboard data
interface DifficultyStats {
  played: number;
  completed: number;
  failed: number;
  bestTime: number | null;
  avgTime: number | null;
}

interface RecentGame {
  id: string;
  difficulty: string;
  timeElapsed: number;
  mistakes: number;
  status: string;
  startedAt: string;
  completedAt: string | null;
}

interface DashboardStats {
  totalGames: number;
  completedGames: number;
  failedGames: number;
  winRate: number;
  totalTimePlayed: number;
  currentStreak: number;
  easy: DifficultyStats;
  normal: DifficultyStats;
  hard: DifficultyStats;
  recentGames: RecentGame[];
}

export default function DashboardPage() {
  const t = useTranslations();
  const { user, isAuthenticated, _hasHydrated: authHydrated } = useAuthStore();
  const { colorMode } = useUIStore();
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch dashboard stats when authenticated
  useEffect(() => {
    const fetchStats = async () => {
      if (!authHydrated || !isAuthenticated()) {
        setIsLoading(false);
        return;
      }

      try {
        const data = await fetchApi<DashboardStats>(api.games.stats());
        setStats(data);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch dashboard stats:", err);
        setError("Failed to load stats. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [authHydrated, isAuthenticated]);

  // Wait for both component mount and auth hydration
  const isReady = mounted && authHydrated;
  const isDark = mounted && colorMode === "dark";

  const colors = {
    bg: isDark
      ? "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #3730a3 100%)"
      : "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 50%, #c7d2fe 100%)",
    cardBg: isDark ? "#1e293b" : "white",
    cardBorder: isDark ? "#4f46e5" : "#c7d2fe",
    title: isDark ? "#e0e7ff" : "#1e1b4b",
    text: isDark ? "#94a3b8" : "#64748b",
    tableBorder: isDark ? "#3730a3" : "#e0e7ff",
  };

  const cardStyle = {
    backgroundColor: colors.cardBg,
    borderRadius: "16px",
    padding: "24px",
    border: `2px solid ${colors.cardBorder}`,
    boxShadow: isDark ? "0 4px 14px rgba(0, 0, 0, 0.3)" : "0 4px 14px rgba(79, 70, 229, 0.1)",
  };

  // Show loading while waiting for hydration
  if (!isReady) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: colors.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "16px", color: colors.text }}>{t('common.loading')}</p>
        </div>
      </main>
    );
  }

  if (!isAuthenticated()) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: colors.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: "24px", fontWeight: 700, color: colors.title, marginBottom: "16px" }}>
            {t('dashboard.signInRequired')}
          </h2>
          <Link
            href="/auth/login"
            style={{
              display: "inline-block",
              backgroundColor: "#4f46e5",
              color: "white",
              fontWeight: 600,
              padding: "12px 24px",
              borderRadius: "8px",
              textDecoration: "none",
            }}
          >
            {t('common.signIn')}
          </Link>
        </div>
      </main>
    );
  }

  // Show loading while fetching data
  if (isLoading) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: colors.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <Loader2
            style={{
              width: "48px",
              height: "48px",
              color: "#4f46e5",
              animation: "spin 1s linear infinite",
            }}
          />
          <p style={{ fontSize: "16px", color: colors.text, marginTop: "16px" }}>{t('dashboard.loadingStats')}</p>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      </main>
    );
  }

  // Show error state
  if (error || !stats) {
    return (
      <main
        style={{
          minHeight: "100vh",
          background: colors.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h2 style={{ fontSize: "24px", fontWeight: 700, color: colors.title, marginBottom: "16px" }}>
            {error || t('dashboard.noStats')}
          </h2>
          <Link
            href="/game"
            style={{
              display: "inline-block",
              backgroundColor: "#f97316",
              color: "white",
              fontWeight: 600,
              padding: "12px 24px",
              borderRadius: "8px",
              textDecoration: "none",
            }}
          >
            {t('dashboard.playFirst')}
          </Link>
        </div>
      </main>
    );
  }

  const formatTime = (seconds: number | null) => {
    if (seconds === null || seconds === 0) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <main style={{ minHeight: "100vh", background: colors.bg, padding: "16px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <Link href="/" style={{ fontSize: "14px", color: "#818cf8" }}>{t('common.backToHome')}</Link>
          <ThemeSwitcher />
        </div>

        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "32px", fontWeight: 700, color: colors.title, marginBottom: "8px" }}>
            {t('dashboard.title')}
          </h1>
          <p style={{ color: colors.text }}>{t('dashboard.welcomeBack', { name: user?.username || 'Player' })}</p>
        </div>

        {/* Overview Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          <div style={cardStyle}>
            <div style={{ fontSize: "32px", fontWeight: 700, color: "#4f46e5", marginBottom: "8px" }}>{stats.totalGames}</div>
            <div style={{ fontSize: "14px", color: colors.text }}>{t('dashboard.overview.totalGames')}</div>
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: "32px", fontWeight: 700, color: "#10b981", marginBottom: "8px" }}>{stats.completedGames}</div>
            <div style={{ fontSize: "14px", color: colors.text }}>{t('dashboard.overview.completed')}</div>
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: "32px", fontWeight: 700, color: "#f97316", marginBottom: "8px" }}>{stats.winRate}%</div>
            <div style={{ fontSize: "14px", color: colors.text }}>{t('dashboard.overview.winRate')}</div>
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: "32px", fontWeight: 700, color: "#f59e0b", marginBottom: "8px" }}>{formatTime(stats.totalTimePlayed)}</div>
            <div style={{ fontSize: "14px", color: colors.text }}>{t('dashboard.overview.totalTime')}</div>
          </div>
          <div style={cardStyle}>
            <div style={{ fontSize: "32px", fontWeight: 700, color: "#8b5cf6", marginBottom: "8px" }}>{stats.currentStreak}</div>
            <div style={{ fontSize: "14px", color: colors.text }}>{t('dashboard.overview.currentStreak')}</div>
          </div>
        </div>

        {/* Per-Difficulty Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "24px",
            marginBottom: "32px",
          }}
        >
          {/* Easy */}
          <div style={cardStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "20px", fontWeight: 700, color: colors.title }}>{t('home.difficulty.easy')}</h3>
              <Smile width={32} height={32} style={{ width: "32px", height: "32px", color: "#10b981" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: colors.text }}>{t('dashboard.perDifficulty.played')}</span>
                <span style={{ fontWeight: 600, color: colors.title }}>{stats.easy.played}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: colors.text }}>{t('dashboard.perDifficulty.completed')}</span>
                <span style={{ fontWeight: 600, color: "#10b981" }}>{stats.easy.completed}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: colors.text }}>{t('dashboard.perDifficulty.bestTime')}</span>
                <span style={{ fontWeight: 600, color: colors.title }}>{formatTime(stats.easy.bestTime)}</span>
              </div>
            </div>
          </div>

          {/* Normal */}
          <div style={cardStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "20px", fontWeight: 700, color: colors.title }}>{t('home.difficulty.normal')}</h3>
              <Zap width={32} height={32} style={{ width: "32px", height: "32px", color: "#f59e0b" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: colors.text }}>{t('dashboard.perDifficulty.played')}</span>
                <span style={{ fontWeight: 600, color: colors.title }}>{stats.normal.played}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: colors.text }}>{t('dashboard.perDifficulty.completed')}</span>
                <span style={{ fontWeight: 600, color: "#10b981" }}>{stats.normal.completed}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: colors.text }}>{t('dashboard.perDifficulty.bestTime')}</span>
                <span style={{ fontWeight: 600, color: colors.title }}>{formatTime(stats.normal.bestTime)}</span>
              </div>
            </div>
          </div>

          {/* Hard */}
          <div style={cardStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "20px", fontWeight: 700, color: colors.title }}>{t('home.difficulty.hard')}</h3>
              <Flame width={32} height={32} style={{ width: "32px", height: "32px", color: "#ef4444" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: colors.text }}>{t('dashboard.perDifficulty.played')}</span>
                <span style={{ fontWeight: 600, color: colors.title }}>{stats.hard.played}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: colors.text }}>{t('dashboard.perDifficulty.completed')}</span>
                <span style={{ fontWeight: 600, color: "#10b981" }}>{stats.hard.completed}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: colors.text }}>{t('dashboard.perDifficulty.bestTime')}</span>
                <span style={{ fontWeight: 600, color: colors.title }}>{formatTime(stats.hard.bestTime)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <LeaderboardSection
          cardStyle={cardStyle}
          isDark={isDark}
          colors={{ title: colors.title, text: colors.text }}
        />

        {/* Recent Games */}
        <div style={{ ...cardStyle, marginBottom: "32px" }}>
          <h2 style={{ fontSize: "24px", fontWeight: 700, color: colors.title, marginBottom: "16px" }}>{t('dashboard.recentGames.title')}</h2>
          {stats.recentGames.length === 0 ? (
            <p style={{ color: colors.text, textAlign: "center", padding: "24px" }}>
              {t('dashboard.recentGames.noGames')}
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${colors.tableBorder}` }}>
                    <th style={{ textAlign: "left", padding: "12px", fontSize: "14px", fontWeight: 600, color: colors.text }}>{t('dashboard.recentGames.difficulty')}</th>
                    <th style={{ textAlign: "left", padding: "12px", fontSize: "14px", fontWeight: 600, color: colors.text }}>{t('dashboard.recentGames.time')}</th>
                    <th style={{ textAlign: "left", padding: "12px", fontSize: "14px", fontWeight: 600, color: colors.text }}>{t('dashboard.recentGames.mistakes')}</th>
                    <th style={{ textAlign: "left", padding: "12px", fontSize: "14px", fontWeight: 600, color: colors.text }}>{t('dashboard.recentGames.status')}</th>
                    <th style={{ textAlign: "left", padding: "12px", fontSize: "14px", fontWeight: 600, color: colors.text }}>{t('dashboard.recentGames.date')}</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentGames.map((game) => {
                    const difficultyLower = game.difficulty.toLowerCase();
                    const isCompleted = game.status === "completed";
                    const isFailed = game.status === "failed";
                    const isAbandoned = game.status === "abandoned";

                    return (
                      <tr key={game.id} style={{ borderBottom: `1px solid ${colors.tableBorder}` }}>
                        <td style={{ padding: "12px" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "4px 12px",
                              borderRadius: "9999px",
                              fontSize: "12px",
                              fontWeight: 600,
                              backgroundColor: difficultyLower === "easy" ? (isDark ? "#064e3b" : "#ecfdf5") : difficultyLower === "normal" ? (isDark ? "#78350f" : "#fffbeb") : (isDark ? "#7f1d1d" : "#fef2f2"),
                              color: difficultyLower === "easy" ? "#10b981" : difficultyLower === "normal" ? "#f59e0b" : "#ef4444",
                            }}
                          >
                            {t(`home.difficulty.${game.difficulty.toLowerCase()}`)}
                          </span>
                        </td>
                        <td style={{ padding: "12px", fontFamily: "monospace", color: colors.title }}>
                          {isCompleted ? formatTime(game.timeElapsed) : "--:--"}
                        </td>
                        <td style={{ padding: "12px", color: colors.title }}>{game.mistakes}/3</td>
                        <td style={{ padding: "12px" }}>
                          {isCompleted ? (
                            <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "#10b981", fontWeight: 600 }}>
                              <CheckCircle width={16} height={16} style={{ width: "16px", height: "16px" }} /> {t('dashboard.recentGames.completed')}
                            </span>
                          ) : isFailed ? (
                            <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "#ef4444", fontWeight: 600 }}>
                              <XCircle width={16} height={16} style={{ width: "16px", height: "16px" }} /> {t('dashboard.recentGames.failed')}
                            </span>
                          ) : isAbandoned ? (
                            <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "#6b7280", fontWeight: 600 }}>
                              <XCircle width={16} height={16} style={{ width: "16px", height: "16px" }} /> {t('dashboard.recentGames.abandoned')}
                            </span>
                          ) : (
                            <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "#f59e0b", fontWeight: 600 }}>
                              {t('dashboard.recentGames.inProgress')}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "12px", color: colors.text }}>{formatDate(game.startedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Play Button */}
        <div style={{ textAlign: "center" }}>
          <Link
            href="/game"
            style={{
              display: "inline-block",
              backgroundColor: "#f97316",
              color: "white",
              fontWeight: 700,
              fontSize: "20px",
              padding: "16px 48px",
              borderRadius: "9999px",
              textDecoration: "none",
              boxShadow: "0 10px 25px rgba(249, 115, 22, 0.3)",
            }}
          >
            {t('dashboard.playNow')}
          </Link>
        </div>
      </div>
    </main>
  );
}
