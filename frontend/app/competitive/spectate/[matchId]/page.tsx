"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/store/auth";
import { useUIStore } from "@/store/ui";
import { useSpectatorStore } from "@/store/spectator";
import { useSpectatorSocket } from "@/hooks/useSpectatorSocket";
import { SpectatorGrid } from "@/components/multiplayer/SpectatorGrid";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { MATCH_CONFIG } from "@/lib/constants";
import { ArrowLeft, Eye, Clock, Trophy } from "lucide-react";

export default function SpectatorPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations("competitive");
  const matchId = params.matchId as string;

  const { token, _hasHydrated } = useAuthStore();
  const isAuthenticated = _hasHydrated && !!token;
  const { colorMode } = useUIStore();
  const [mounted, setMounted] = useState(false);

  const {
    isSpectating,
    status,
    hostName,
    guestName,
    hostState,
    guestState,
    puzzle,
    difficulty,
    startTime,
    spectatorCount,
    result,
    error,
  } = useSpectatorStore();

  const { leaveSpectate, isConnected } = useSpectatorSocket(matchId);

  // Timer state
  const [timeRemaining, setTimeRemaining] = useState<number>(
    MATCH_CONFIG.MAX_DURATION_MS,
  );

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
    text: isDark ? "#94a3b8" : "#64748b",
    surfaceBg: isDark ? "#0f172a" : "#f1f5f9",
  };

  const cardStyle = {
    backgroundColor: colors.cardBg,
    borderRadius: "20px",
    padding: "28px",
    border: `2px solid ${colors.cardBorder}`,
    boxShadow: isDark
      ? "0 8px 32px rgba(0, 0, 0, 0.4)"
      : "0 8px 32px rgba(79, 70, 229, 0.12)",
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.push(`/auth/login?redirect=/competitive/spectate/${matchId}`);
    }
  }, [_hasHydrated, isAuthenticated, matchId, router]);

  // Timer update
  useEffect(() => {
    if (!startTime || status !== "playing") return;

    const updateTimer = () => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, MATCH_CONFIG.MAX_DURATION_MS - elapsed);
      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [startTime, status]);

  // Format time display
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  // Handle leaving
  const handleLeave = () => {
    leaveSpectate();
    router.push("/competitive");
  };

  // Loading state
  if (!_hasHydrated || !isConnected) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: colors.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              border: "4px solid #4f46e5",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <p style={{ color: colors.text }}>Connecting...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: colors.bg,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div
          style={{
            backgroundColor: isDark ? "rgba(127, 29, 29, 0.3)" : "#fee2e2",
            color: isDark ? "#fca5a5" : "#dc2626",
            padding: "16px 24px",
            borderRadius: "16px",
            marginBottom: "16px",
            border: "1px solid #ef4444",
          }}
        >
          {error}
        </div>
        <button
          onClick={handleLeave}
          style={{
            padding: "12px 24px",
            backgroundColor: isDark ? "#374151" : "#e5e7eb",
            color: colors.title,
            borderRadius: "12px",
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          {t("spectator.backToLobby")}
        </button>
      </div>
    );
  }

  // Waiting for state
  if (!isSpectating || !puzzle) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: colors.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              border: "4px solid #8b5cf6",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <p style={{ color: colors.text }}>Loading match...</p>
        </div>
      </div>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: colors.bg,
        padding: "40px 24px",
      }}
    >
      {/* Theme Switcher */}
      <div style={{ maxWidth: "1200px", margin: "0 auto 24px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <ThemeSwitcher />
        </div>
      </div>

      {/* Header */}
      <div style={{ maxWidth: "1200px", margin: "0 auto 28px" }}>
        <div
          style={{
            ...cardStyle,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <button
              onClick={handleLeave}
              style={{
                padding: "12px 20px",
                backgroundColor: isDark ? "#374151" : "#e5e7eb",
                color: colors.title,
                borderRadius: "12px",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "15px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                transition: "all 0.2s ease",
              }}
            >
              <ArrowLeft style={{ width: "18px", height: "18px" }} />
              {t("backToLobby")}
            </button>
            <div>
              <h1
                style={{
                  fontSize: "24px",
                  fontWeight: 800,
                  color: colors.title,
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <Eye
                  style={{ width: "26px", height: "26px", color: "#8b5cf6" }}
                />
                {t("spectator.title")}
              </h1>
              <p
                style={{
                  fontSize: "14px",
                  color: colors.text,
                  marginTop: "6px",
                }}
              >
                {difficulty?.toUpperCase()} • {spectatorCount}{" "}
                {t("game.spectators")}
              </p>
            </div>
          </div>

          {status === "playing" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 20px",
                backgroundColor:
                  timeRemaining < 60000
                    ? isDark
                      ? "rgba(127, 29, 29, 0.3)"
                      : "#fef2f2"
                    : isDark
                      ? "rgba(59, 130, 246, 0.2)"
                      : "#dbeafe",
                borderRadius: "12px",
                border: `2px solid ${timeRemaining < 60000 ? "#ef4444" : "#3b82f6"}`,
              }}
            >
              <Clock
                style={{
                  width: "20px",
                  height: "20px",
                  color: timeRemaining < 60000 ? "#ef4444" : "#3b82f6",
                }}
              />
              <span
                style={{
                  fontSize: "24px",
                  fontFamily: "monospace",
                  fontWeight: 700,
                  color:
                    timeRemaining < 60000
                      ? isDark
                        ? "#fca5a5"
                        : "#dc2626"
                      : isDark
                        ? "#93c5fd"
                        : "#1d4ed8",
                }}
              >
                {formatTime(timeRemaining)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Grids Container */}
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
            gap: "24px",
          }}
        >
          {/* Host Grid */}
          <div style={cardStyle}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "16px",
              }}
            >
              <h3
                style={{
                  fontSize: "18px",
                  fontWeight: 700,
                  color: "#3b82f6",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    width: "24px",
                    height: "24px",
                    backgroundColor: "#3b82f6",
                    borderRadius: "4px",
                  }}
                />
                {hostName || t("spectator.host")}
              </h3>
              {result?.winnerId && result.winnerName === hostName && (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    color: "#22c55e",
                    fontWeight: 700,
                    fontSize: "14px",
                  }}
                >
                  <Trophy style={{ width: "18px", height: "18px" }} />
                  {t("spectator.winner")}!
                </span>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              {hostState && puzzle ? (
                <SpectatorGrid grid={hostState} puzzle={puzzle} />
              ) : (
                <div
                  style={{
                    width: "360px",
                    height: "360px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: isDark ? "#0f172a" : "#f1f5f9",
                    borderRadius: "12px",
                  }}
                >
                  <p style={{ color: colors.text }}>Loading...</p>
                </div>
              )}
            </div>
          </div>

          {/* Guest Grid */}
          <div style={cardStyle}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "16px",
              }}
            >
              <h3
                style={{
                  fontSize: "18px",
                  fontWeight: 700,
                  color: "#f97316",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    width: "24px",
                    height: "24px",
                    backgroundColor: "#f97316",
                    borderRadius: "4px",
                  }}
                />
                {guestName || t("spectator.guest")}
              </h3>
              {result?.winnerId && result.winnerName === guestName && (
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    color: "#22c55e",
                    fontWeight: 700,
                    fontSize: "14px",
                  }}
                >
                  <Trophy style={{ width: "18px", height: "18px" }} />
                  {t("spectator.winner")}!
                </span>
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              {guestState && puzzle ? (
                <SpectatorGrid grid={guestState} puzzle={puzzle} />
              ) : (
                <div
                  style={{
                    width: "360px",
                    height: "360px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: isDark ? "#0f172a" : "#f1f5f9",
                    borderRadius: "12px",
                  }}
                >
                  <p style={{ color: colors.text }}>
                    {t("waitingRoom.waitingForOpponent")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Match Result Modal */}
      {result && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: "24px",
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            style={{
              backgroundColor: colors.cardBg,
              borderRadius: "24px",
              padding: "32px",
              maxWidth: "420px",
              width: "100%",
              textAlign: "center",
              boxShadow: isDark
                ? "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
                : "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              border: `2px solid ${colors.cardBorder}`,
            }}
          >
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                backgroundColor: result.winnerId
                  ? isDark
                    ? "rgba(6, 78, 59, 0.3)"
                    : "#dcfce7"
                  : isDark
                    ? "rgba(120, 53, 15, 0.3)"
                    : "#fef3c7",
                border: `4px solid ${result.winnerId ? "#22c55e" : "#f59e0b"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "40px",
                margin: "0 auto 16px",
              }}
            >
              {result.winnerId ? "🏆" : "🤝"}
            </div>
            <h2
              style={{
                fontSize: "24px",
                fontWeight: 700,
                color: result.winnerId
                  ? isDark
                    ? "#86efac"
                    : "#16a34a"
                  : isDark
                    ? "#fcd34d"
                    : "#d97706",
                marginBottom: "8px",
              }}
            >
              {result.winnerId
                ? `${result.winnerName} ${t("spectator.winner")}!`
                : `${t("spectator.matchEnded")} - ${t("spectator.draw")}`}
            </h2>
            <p style={{ color: colors.text, marginBottom: "24px" }}>
              {result.reason}
            </p>
            <button
              onClick={handleLeave}
              style={{
                width: "100%",
                padding: "14px 24px",
                backgroundColor: "#f97316",
                color: "white",
                borderRadius: "12px",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "16px",
                boxShadow: "0 4px 14px rgba(249, 115, 22, 0.3)",
              }}
            >
              {t("spectator.backToLobby")}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
