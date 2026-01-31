"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Smile,
  Zap,
  Flame,
  Trophy,
  Users,
  Target,
  Home,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { GAME_CONFIG } from "@/lib/constants";
import { useCompetitiveStats } from "@/hooks/useCompetitiveStats";
import { useUIStore } from "@/store/ui";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";

interface LobbyHomeProps {
  onCreateRoom: (difficulty: string) => void;
  onJoinRoom: (matchId: string) => void;
  onQuickMatch?: (difficulty: string) => void;
  isLoading?: boolean;
  error?: string | null;
}

export function LobbyHome({
  onCreateRoom,
  onJoinRoom,
  onQuickMatch,
  isLoading,
  error,
}: LobbyHomeProps) {
  const t = useTranslations("competitive");
  const { colorMode } = useUIStore();
  const [mounted, setMounted] = useState(false);
  const [difficulty, setDifficulty] = useState<string>("easy");
  const [roomCode, setRoomCode] = useState("");
  const [mode, setMode] = useState<"select" | "create" | "join" | "quickmatch">("select");
  const { stats, loading: statsLoading } = useCompetitiveStats();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && colorMode === "dark";

  const colors = {
    bg: isDark
      ? "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)"
      : "linear-gradient(135deg, #f8fafc 0%, #eef2ff 50%, #e0e7ff 100%)",
    cardBg: isDark ? "#1e293b" : "white",
    cardBorder: isDark ? "#4f46e5" : "#c7d2fe",
    title: isDark ? "#e0e7ff" : "#1e1b4b",
    subtitle: isDark ? "#a5b4fc" : "#6366f1",
    text: isDark ? "#94a3b8" : "#64748b",
    inputBg: isDark ? "#0f172a" : "#f8fafc",
    inputBorder: isDark ? "#4f46e5" : "#c7d2fe",
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: colors.cardBg,
    borderRadius: "24px",
    padding: "32px",
    border: `2px solid ${colors.cardBorder}`,
    boxShadow: isDark
      ? "0 8px 32px rgba(0, 0, 0, 0.4)"
      : "0 8px 32px rgba(79, 70, 229, 0.12)",
  };

  const difficultyStyles = {
    easy: {
      bg: isDark ? "#064e3b" : "#ecfdf5",
      border: "#34d399",
      color: "#10b981",
      icon: Smile,
    },
    normal: {
      bg: isDark ? "#78350f" : "#fffbeb",
      border: "#fbbf24",
      color: "#f59e0b",
      icon: Zap,
    },
    hard: {
      bg: isDark ? "#7f1d1d" : "#fef2f2",
      border: "#f87171",
      color: "#ef4444",
      icon: Flame,
    },
  };

  const handleCreate = () => {
    onCreateRoom(difficulty);
  };

  const handleJoin = () => {
    if (roomCode.trim().length >= 6) {
      onJoinRoom(roomCode.trim().toUpperCase());
    }
  };

  const handleQuickMatch = () => {
    if (onQuickMatch) {
      onQuickMatch(difficulty);
    }
  };

  const getDifficultyLabel = (d: string) => {
    const labels: Record<string, string> = {
      easy: t("lobby.difficulty.easy"),
      normal: t("lobby.difficulty.normal"),
      hard: t("lobby.difficulty.hard"),
    };
    return labels[d] || d;
  };

  // Main lobby view with responsive two-column layout
  if (mode === "select") {
    return (
      <>
        <style>{`
          .lobby-container {
            min-height: 100vh;
            padding: 40px 24px;
          }
          .lobby-content {
            max-width: 1200px;
            margin: 0 auto;
          }
          .lobby-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 40px;
            flex-wrap: wrap;
            gap: 16px;
          }
          .lobby-title {
            text-align: center;
            margin-bottom: 48px;
          }
          .lobby-title h1 {
            font-size: 48px;
            font-weight: 800;
            margin-bottom: 12px;
            letter-spacing: -0.02em;
          }
          .lobby-title p {
            font-size: 18px;
          }
          .lobby-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 32px;
            align-items: start;
          }
          .stats-card {
            border-radius: 24px;
            padding: 32px;
            color: white;
            box-shadow: 0 12px 40px rgba(79, 70, 229, 0.35);
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
          }
          .rating-value {
            font-size: 72px;
            font-weight: 800;
            margin-bottom: 32px;
            letter-spacing: -0.02em;
          }
          .action-card {
            margin-bottom: 24px;
          }
          .action-card:last-child {
            margin-bottom: 0;
          }

          /* Tablet breakpoint */
          @media (max-width: 1024px) {
            .lobby-title h1 {
              font-size: 40px;
            }
            .lobby-grid {
              gap: 24px;
            }
            .rating-value {
              font-size: 56px;
            }
            .stats-grid {
              gap: 12px;
            }
          }

          /* Mobile breakpoint */
          @media (max-width: 768px) {
            .lobby-container {
              padding: 24px 16px;
            }
            .lobby-header {
              margin-bottom: 24px;
            }
            .lobby-title {
              margin-bottom: 32px;
            }
            .lobby-title h1 {
              font-size: 32px;
            }
            .lobby-title p {
              font-size: 16px;
            }
            .lobby-grid {
              grid-template-columns: 1fr;
              gap: 24px;
            }
            .stats-card {
              padding: 24px;
            }
            .rating-value {
              font-size: 48px;
              margin-bottom: 24px;
            }
            .stats-grid {
              grid-template-columns: repeat(3, 1fr);
              gap: 8px;
            }
            .stats-item {
              padding: 16px 12px !important;
            }
            .stats-item .stat-value {
              font-size: 22px !important;
            }
            .stats-item .stat-label {
              font-size: 11px !important;
            }
          }

          /* Small mobile breakpoint */
          @media (max-width: 480px) {
            .lobby-title h1 {
              font-size: 28px;
            }
            .rating-value {
              font-size: 40px;
            }
          }
        `}</style>

        <div className="lobby-container" style={{ background: colors.bg }}>
          <div className="lobby-content">
            {/* Header */}
            <div className="lobby-header">
              <Link
                href="/"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "12px 20px",
                  backgroundColor: isDark ? "#374151" : "#e5e7eb",
                  color: colors.title,
                  borderRadius: "12px",
                  fontWeight: 500,
                  fontSize: "14px",
                  textDecoration: "none",
                  transition: "all 0.2s ease",
                }}
              >
                <Home style={{ width: "18px", height: "18px" }} />
                {t("backToHome")}
              </Link>
              <ThemeSwitcher />
            </div>

            {/* Title */}
            <div className="lobby-title">
              <h1 style={{ color: colors.title }}>🎮 {t("title")}</h1>
              <p style={{ color: colors.subtitle }}>{t("subtitle")}</p>
            </div>

            {/* Two Column Layout */}
            <div className="lobby-grid">
              {/* Left Column - Stats */}
              <div>
                {/* Rating Card */}
                <div
                  className="stats-card"
                  style={{
                    background:
                      "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "24px",
                      flexWrap: "wrap",
                      gap: "12px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <Trophy style={{ width: "24px", height: "24px" }} />
                      <span
                        style={{
                          fontSize: "16px",
                          opacity: 0.95,
                          fontWeight: 500,
                        }}
                      >
                        {t("lobby.yourStats")}
                      </span>
                    </div>
                    {stats?.rank && (
                      <span
                        style={{
                          fontSize: "13px",
                          backgroundColor: "rgba(255,255,255,0.2)",
                          padding: "6px 16px",
                          borderRadius: "9999px",
                          fontWeight: 600,
                        }}
                      >
                        {t("lobby.rank")} #{stats.rank}
                      </span>
                    )}
                  </div>

                  <div className="rating-value">
                    {statsLoading ? "..." : (stats?.rating ?? 1000)}
                  </div>

                  <div className="stats-grid">
                    <div
                      className="stats-item"
                      style={{
                        backgroundColor: "rgba(255,255,255,0.15)",
                        borderRadius: "16px",
                        padding: "20px",
                        textAlign: "center",
                        backdropFilter: "blur(10px)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          marginBottom: "8px",
                        }}
                      >
                        <Users style={{ width: "20px", height: "20px" }} />
                      </div>
                      <div
                        className="stat-value"
                        style={{ fontSize: "28px", fontWeight: 700 }}
                      >
                        {stats?.competitiveGames ?? 0}
                      </div>
                      <div
                        className="stat-label"
                        style={{
                          fontSize: "13px",
                          opacity: 0.85,
                          marginTop: "4px",
                        }}
                      >
                        {t("lobby.games")}
                      </div>
                    </div>
                    <div
                      className="stats-item"
                      style={{
                        backgroundColor: "rgba(255,255,255,0.15)",
                        borderRadius: "16px",
                        padding: "20px",
                        textAlign: "center",
                        backdropFilter: "blur(10px)",
                      }}
                    >
                      <div
                        className="stat-value"
                        style={{
                          fontSize: "28px",
                          fontWeight: 700,
                          color: "#86efac",
                        }}
                      >
                        {stats?.competitiveWins ?? 0}
                      </div>
                      <div
                        className="stat-label"
                        style={{
                          fontSize: "13px",
                          opacity: 0.85,
                          marginTop: "4px",
                        }}
                      >
                        {t("lobby.wins")}
                      </div>
                    </div>
                    <div
                      className="stats-item"
                      style={{
                        backgroundColor: "rgba(255,255,255,0.15)",
                        borderRadius: "16px",
                        padding: "20px",
                        textAlign: "center",
                        backdropFilter: "blur(10px)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          marginBottom: "8px",
                        }}
                      >
                        <Target style={{ width: "20px", height: "20px" }} />
                      </div>
                      <div
                        className="stat-value"
                        style={{ fontSize: "28px", fontWeight: 700 }}
                      >
                        {stats?.winRate ?? 0}%
                      </div>
                      <div
                        className="stat-label"
                        style={{
                          fontSize: "13px",
                          opacity: 0.85,
                          marginTop: "4px",
                        }}
                      >
                        {t("lobby.winRate")}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tips Card */}
                <div
                  style={{
                    ...cardStyle,
                    marginTop: "24px",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "18px",
                      fontWeight: 600,
                      color: colors.title,
                      marginBottom: "16px",
                    }}
                  >
                    💡 {t("lobby.tips")}
                  </h3>
                  <ul
                    style={{
                      listStyle: "none",
                      padding: 0,
                      margin: 0,
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                    }}
                  >
                    <li
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "12px",
                        fontSize: "14px",
                        color: colors.text,
                      }}
                    >
                      <span style={{ color: "#10b981" }}>✓</span>
                      {t("lobby.tip1")}
                    </li>
                    <li
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "12px",
                        fontSize: "14px",
                        color: colors.text,
                      }}
                    >
                      <span style={{ color: "#10b981" }}>✓</span>
                      {t("lobby.tip2")}
                    </li>
                    <li
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "12px",
                        fontSize: "14px",
                        color: colors.text,
                      }}
                    >
                      <span style={{ color: "#10b981" }}>✓</span>
                      {t("lobby.tip3")}
                    </li>
                  </ul>
                </div>
              </div>

              {/* Right Column - Actions */}
              <div>
                {error && (
                  <div
                    style={{
                      backgroundColor: isDark
                        ? "rgba(127, 29, 29, 0.3)"
                        : "#fee2e2",
                      color: isDark ? "#fca5a5" : "#dc2626",
                      padding: "16px 20px",
                      borderRadius: "16px",
                      marginBottom: "24px",
                      textAlign: "center",
                      fontSize: "14px",
                      fontWeight: 500,
                    }}
                  >
                    {error}
                  </div>
                )}

                {/* Create Room Card */}
                <div className="action-card" style={cardStyle}>
                  <h3
                    style={{
                      fontSize: "20px",
                      fontWeight: 700,
                      color: colors.title,
                      marginBottom: "16px",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    🏠 {t("lobby.createRoom")}
                  </h3>
                  <p
                    style={{
                      fontSize: "14px",
                      color: colors.text,
                      marginBottom: "20px",
                    }}
                  >
                    {t("lobby.createRoomDesc")}
                  </p>
                  <button
                    onClick={() => setMode("create")}
                    disabled={isLoading}
                    style={{
                      width: "100%",
                      padding: "16px 24px",
                      backgroundColor: "#4f46e5",
                      color: "white",
                      borderRadius: "14px",
                      fontWeight: 600,
                      fontSize: "16px",
                      border: "none",
                      cursor: isLoading ? "not-allowed" : "pointer",
                      opacity: isLoading ? 0.5 : 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "10px",
                      boxShadow: "0 4px 20px rgba(79, 70, 229, 0.35)",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {t("lobby.createRoom")}
                  </button>
                </div>

                {/* Join Room Card */}
                <div className="action-card" style={cardStyle}>
                  <h3
                    style={{
                      fontSize: "20px",
                      fontWeight: 700,
                      color: colors.title,
                      marginBottom: "16px",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    🚪 {t("lobby.joinRoom")}
                  </h3>
                  <p
                    style={{
                      fontSize: "14px",
                      color: colors.text,
                      marginBottom: "20px",
                    }}
                  >
                    {t("lobby.joinRoomDesc")}
                  </p>
                  <button
                    onClick={() => setMode("join")}
                    disabled={isLoading}
                    style={{
                      width: "100%",
                      padding: "16px 24px",
                      backgroundColor: "#10b981",
                      color: "white",
                      borderRadius: "14px",
                      fontWeight: 600,
                      fontSize: "16px",
                      border: "none",
                      cursor: isLoading ? "not-allowed" : "pointer",
                      opacity: isLoading ? 0.5 : 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "10px",
                      boxShadow: "0 4px 20px rgba(16, 185, 129, 0.35)",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {t("lobby.joinRoom")}
                  </button>
                </div>

                {/* Quick Match Card */}
                {onQuickMatch && (
                  <div className="action-card" style={cardStyle}>
                    <h3
                      style={{
                        fontSize: "20px",
                        fontWeight: 700,
                        color: colors.title,
                        marginBottom: "16px",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      ⚡ {t("lobby.quickMatch")}
                    </h3>
                    <p
                      style={{
                        fontSize: "14px",
                        color: colors.text,
                        marginBottom: "20px",
                      }}
                    >
                      {t("lobby.quickMatchDesc")}
                    </p>
                    <button
                      onClick={() => setMode("quickmatch")}
                      disabled={isLoading}
                      style={{
                        width: "100%",
                        padding: "16px 24px",
                        backgroundColor: "#f59e0b",
                        color: "white",
                        borderRadius: "14px",
                        fontWeight: 600,
                        fontSize: "16px",
                        border: "none",
                        cursor: isLoading ? "not-allowed" : "pointer",
                        opacity: isLoading ? 0.5 : 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "10px",
                        boxShadow: "0 4px 20px rgba(245, 158, 11, 0.35)",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {t("lobby.quickMatch")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Create Room View
  if (mode === "create") {
    return (
      <>
        <style>{`
          .create-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px 24px;
          }
          .create-content {
            max-width: 560px;
            width: 100%;
          }
          .create-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 32px;
            flex-wrap: wrap;
            gap: 16px;
          }
          .create-title {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 12px;
          }
          .difficulty-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
          }
          .difficulty-btn {
            padding: 24px 16px;
            border-radius: 16px;
            cursor: pointer;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
            transition: all 0.2s ease;
          }
          .difficulty-btn:hover {
            transform: scale(1.02);
          }

          @media (max-width: 768px) {
            .create-container {
              padding: 24px 16px;
            }
            .create-title {
              font-size: 26px;
            }
            .difficulty-grid {
              gap: 12px;
            }
            .difficulty-btn {
              padding: 20px 12px;
              gap: 8px;
            }
          }

          @media (max-width: 480px) {
            .difficulty-grid {
              grid-template-columns: 1fr;
            }
            .difficulty-btn {
              flex-direction: row;
              justify-content: center;
              padding: 16px;
            }
          }
        `}</style>

        <div className="create-container" style={{ background: colors.bg }}>
          <div className="create-content">
            {/* Header */}
            <div className="create-header">
              <button
                onClick={() => setMode("select")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "12px 20px",
                  backgroundColor: isDark ? "#374151" : "#e5e7eb",
                  color: colors.title,
                  borderRadius: "12px",
                  fontWeight: 500,
                  fontSize: "14px",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                <ArrowLeft style={{ width: "18px", height: "18px" }} />
                {t("lobby.back")}
              </button>
              <ThemeSwitcher />
            </div>

            <div style={{ ...cardStyle, textAlign: "center" }}>
              <h2 className="create-title" style={{ color: colors.title }}>
                🏠 {t("lobby.createRoom")}
              </h2>
              <p
                style={{
                  fontSize: "15px",
                  color: colors.text,
                  marginBottom: "32px",
                }}
              >
                {t("lobby.selectDifficulty")}
              </p>

              {error && (
                <div
                  style={{
                    backgroundColor: isDark
                      ? "rgba(127, 29, 29, 0.3)"
                      : "#fee2e2",
                    color: isDark ? "#fca5a5" : "#dc2626",
                    padding: "14px 18px",
                    borderRadius: "12px",
                    marginBottom: "24px",
                    fontSize: "14px",
                  }}
                >
                  {error}
                </div>
              )}

              {/* Difficulty Selection */}
              <div style={{ marginBottom: "32px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: colors.text,
                    marginBottom: "16px",
                    textAlign: "left",
                  }}
                >
                  {t("lobby.difficulty.title")}
                </label>
                <div className="difficulty-grid">
                  {GAME_CONFIG.DIFFICULTIES.map((d) => {
                    const style =
                      difficultyStyles[d as keyof typeof difficultyStyles];
                    const Icon = style.icon;
                    const isSelected = difficulty === d;
                    return (
                      <button
                        key={d}
                        onClick={() => setDifficulty(d)}
                        className="difficulty-btn"
                        style={{
                          border: `3px solid ${isSelected ? style.border : colors.cardBorder}`,
                          backgroundColor: isSelected
                            ? style.bg
                            : colors.cardBg,
                          transform: isSelected ? "scale(1.02)" : "scale(1)",
                        }}
                      >
                        <Icon
                          style={{
                            width: "32px",
                            height: "32px",
                            color: style.color,
                          }}
                        />
                        <span
                          style={{
                            fontSize: "15px",
                            fontWeight: 600,
                            color: isSelected ? style.color : colors.title,
                          }}
                        >
                          {getDifficultyLabel(d)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Create Button */}
              <button
                onClick={handleCreate}
                disabled={isLoading}
                style={{
                  width: "100%",
                  padding: "18px 24px",
                  backgroundColor: "#4f46e5",
                  color: "white",
                  borderRadius: "14px",
                  fontWeight: 600,
                  fontSize: "17px",
                  border: "none",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  opacity: isLoading ? 0.5 : 1,
                  boxShadow: "0 4px 20px rgba(79, 70, 229, 0.35)",
                  transition: "all 0.2s ease",
                }}
              >
                {isLoading ? t("lobby.creating") : t("lobby.createRoom")}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Quick Match View
  if (mode === "quickmatch") {
    return (
      <>
        <style>{`
          .quickmatch-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px 24px;
          }
          .quickmatch-content {
            max-width: 560px;
            width: 100%;
          }
          .quickmatch-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 32px;
            flex-wrap: wrap;
            gap: 16px;
          }
          .quickmatch-title {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 12px;
          }
          .difficulty-grid-qm {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
          }
          .difficulty-btn-qm {
            padding: 24px 16px;
            border-radius: 16px;
            cursor: pointer;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
            transition: all 0.2s ease;
          }
          .difficulty-btn-qm:hover {
            transform: scale(1.02);
          }

          @media (max-width: 768px) {
            .quickmatch-container {
              padding: 24px 16px;
            }
            .quickmatch-title {
              font-size: 26px;
            }
            .difficulty-grid-qm {
              gap: 12px;
            }
            .difficulty-btn-qm {
              padding: 20px 12px;
              gap: 8px;
            }
          }

          @media (max-width: 480px) {
            .difficulty-grid-qm {
              grid-template-columns: 1fr;
            }
            .difficulty-btn-qm {
              flex-direction: row;
              justify-content: center;
              padding: 16px;
            }
          }
        `}</style>

        <div className="quickmatch-container" style={{ background: colors.bg }}>
          <div className="quickmatch-content">
            {/* Header */}
            <div className="quickmatch-header">
              <button
                onClick={() => setMode("select")}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "12px 20px",
                  backgroundColor: isDark ? "#374151" : "#e5e7eb",
                  color: colors.title,
                  borderRadius: "12px",
                  fontWeight: 500,
                  fontSize: "14px",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                <ArrowLeft style={{ width: "18px", height: "18px" }} />
                {t("lobby.back")}
              </button>
              <ThemeSwitcher />
            </div>

            <div style={{ ...cardStyle, textAlign: "center" }}>
              <h2 className="quickmatch-title" style={{ color: colors.title }}>
                ⚡ {t("lobby.quickMatch")}
              </h2>
              <p
                style={{
                  fontSize: "15px",
                  color: colors.text,
                  marginBottom: "32px",
                }}
              >
                {t("lobby.quickMatchSelectDifficulty")}
              </p>

              {error && (
                <div
                  style={{
                    backgroundColor: isDark
                      ? "rgba(127, 29, 29, 0.3)"
                      : "#fee2e2",
                    color: isDark ? "#fca5a5" : "#dc2626",
                    padding: "14px 18px",
                    borderRadius: "12px",
                    marginBottom: "24px",
                    fontSize: "14px",
                  }}
                >
                  {error}
                </div>
              )}

              {/* Difficulty Selection */}
              <div style={{ marginBottom: "32px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: colors.text,
                    marginBottom: "16px",
                    textAlign: "left",
                  }}
                >
                  {t("lobby.difficulty.title")}
                </label>
                <div className="difficulty-grid-qm">
                  {GAME_CONFIG.DIFFICULTIES.map((d) => {
                    const style =
                      difficultyStyles[d as keyof typeof difficultyStyles];
                    const Icon = style.icon;
                    const isSelected = difficulty === d;
                    return (
                      <button
                        key={d}
                        onClick={() => setDifficulty(d)}
                        className="difficulty-btn-qm"
                        style={{
                          border: `3px solid ${isSelected ? style.border : colors.cardBorder}`,
                          backgroundColor: isSelected
                            ? style.bg
                            : colors.cardBg,
                          transform: isSelected ? "scale(1.02)" : "scale(1)",
                        }}
                      >
                        <Icon
                          style={{
                            width: "32px",
                            height: "32px",
                            color: style.color,
                          }}
                        />
                        <span
                          style={{
                            fontSize: "15px",
                            fontWeight: 600,
                            color: isSelected ? style.color : colors.title,
                          }}
                        >
                          {getDifficultyLabel(d)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Find Match Button */}
              <button
                onClick={handleQuickMatch}
                disabled={isLoading}
                style={{
                  width: "100%",
                  padding: "18px 24px",
                  backgroundColor: "#f59e0b",
                  color: "white",
                  borderRadius: "14px",
                  fontWeight: 600,
                  fontSize: "17px",
                  border: "none",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  opacity: isLoading ? 0.5 : 1,
                  boxShadow: "0 4px 20px rgba(245, 158, 11, 0.35)",
                  transition: "all 0.2s ease",
                }}
              >
                {isLoading ? t("lobby.searching") : t("lobby.findMatch")}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Join Room View
  return (
    <>
      <style>{`
        .join-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 24px;
        }
        .join-content {
          max-width: 560px;
          width: 100%;
        }
        .join-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
          flex-wrap: wrap;
          gap: 16px;
        }
        .join-title {
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 12px;
        }
        .room-code-input {
          width: 100%;
          padding: 20px;
          text-align: center;
          font-size: 28px;
          font-family: monospace;
          letter-spacing: 0.2em;
          border-radius: 14px;
          outline: none;
          box-sizing: border-box;
          transition: all 0.2s ease;
        }
        .room-code-input:focus {
          border-color: #4f46e5;
        }

        @media (max-width: 768px) {
          .join-container {
            padding: 24px 16px;
          }
          .join-title {
            font-size: 26px;
          }
          .room-code-input {
            font-size: 24px;
            padding: 16px;
          }
        }

        @media (max-width: 480px) {
          .room-code-input {
            font-size: 20px;
            letter-spacing: 0.15em;
          }
        }
      `}</style>

      <div className="join-container" style={{ background: colors.bg }}>
        <div className="join-content">
          {/* Header */}
          <div className="join-header">
            <button
              onClick={() => setMode("select")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "12px 20px",
                backgroundColor: isDark ? "#374151" : "#e5e7eb",
                color: colors.title,
                borderRadius: "12px",
                fontWeight: 500,
                fontSize: "14px",
                border: "none",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <ArrowLeft style={{ width: "18px", height: "18px" }} />
              {t("lobby.back")}
            </button>
            <ThemeSwitcher />
          </div>

          <div style={{ ...cardStyle, textAlign: "center" }}>
            <h2 className="join-title" style={{ color: colors.title }}>
              🚪 {t("lobby.joinRoom")}
            </h2>
            <p
              style={{
                fontSize: "15px",
                color: colors.text,
                marginBottom: "32px",
              }}
            >
              {t("lobby.enterCodeDesc")}
            </p>

            {error && (
              <div
                style={{
                  backgroundColor: isDark
                    ? "rgba(127, 29, 29, 0.3)"
                    : "#fee2e2",
                  color: isDark ? "#fca5a5" : "#dc2626",
                  padding: "14px 18px",
                  borderRadius: "12px",
                  marginBottom: "24px",
                  fontSize: "14px",
                }}
              >
                {error}
              </div>
            )}

            {/* Room Code Input */}
            <div style={{ marginBottom: "32px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: colors.text,
                  marginBottom: "16px",
                  textAlign: "left",
                }}
              >
                {t("lobby.enterCode")}
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder={t("lobby.roomCodePlaceholder")}
                maxLength={10}
                className="room-code-input"
                style={{
                  border: `3px solid ${colors.inputBorder}`,
                  backgroundColor: colors.inputBg,
                  color: colors.title,
                }}
              />
            </div>

            {/* Join Button */}
            <button
              onClick={handleJoin}
              disabled={isLoading || roomCode.trim().length < 6}
              style={{
                width: "100%",
                padding: "18px 24px",
                backgroundColor: "#10b981",
                color: "white",
                borderRadius: "14px",
                fontWeight: 600,
                fontSize: "17px",
                border: "none",
                cursor:
                  isLoading || roomCode.trim().length < 6
                    ? "not-allowed"
                    : "pointer",
                opacity: isLoading || roomCode.trim().length < 6 ? 0.5 : 1,
                boxShadow: "0 4px 20px rgba(16, 185, 129, 0.35)",
                transition: "all 0.2s ease",
              }}
            >
              {isLoading ? t("lobby.joining") : t("lobby.joinRoom")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
