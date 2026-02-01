"use client";

// External libs
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Smile, Zap, Flame, Lock, Swords, Play, X } from "lucide-react";

// Stores
import { useAuthStore } from "@/store/auth";
import { useUIStore, Difficulty } from "@/store/ui";
import { useMatchStore } from "@/store/match";
import { useGameStore, GameStatus } from "@/store/game";

// Components
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";

// Lib/utils
import {
  loadActiveMatch,
  clearActiveMatch,
  isMatchValid,
  ActiveMatchInfo,
} from "@/lib/match-storage";
import { GAME_MODES, GameMode } from "@/lib/constants";
import { socketService } from "@/lib/socket";

export default function HomePage() {
  const t = useTranslations();
  const router = useRouter();
  const { isAuthenticated, _hasHydrated: authHydrated } = useAuthStore();
  const { colorMode, selectedDifficulty, setSelectedDifficulty } = useUIStore();
  const [mounted, setMounted] = useState(false);
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode>(GAME_MODES.CLASSIC);
  const [activeMatch, setActiveMatch] = useState<ActiveMatchInfo | null>(null);
  const { status: matchStatus } = useMatchStore();

  // Handler for starting a new game - clears old game state and navigates
  const handleStartGame = () => {
    const gameStore = useGameStore.getState();
    const currentStatus = gameStore.status;
    const currentDifficulty = gameStore.difficulty;
    const currentGameMode = gameStore.gameMode;
    const currentGameId = gameStore.id;

    // Clear game state if:
    // 1. Game is completed or failed
    // 2. Difficulty is different
    // 3. Game mode is different
    const shouldClearGame =
      currentStatus === GameStatus.COMPLETED ||
      currentStatus === GameStatus.FAILED ||
      (currentDifficulty && currentDifficulty !== selectedDifficulty) ||
      (currentGameMode && currentGameMode !== selectedGameMode);

    if (shouldClearGame) {
      // #27: Stop mutation timer if leaving a mutating game
      if (currentGameMode === 'mutating' && currentGameId && currentStatus === GameStatus.ACTIVE) {
        if (socketService.getSocket()?.connected) {
          socketService.emit('game:leave', { gameId: currentGameId });
        }
      }
      useGameStore.getState().clearGame();
    }

    // Set the game mode in store before navigating
    useGameStore.getState().setGameMode(selectedGameMode);

    router.push("/game");
  };

  useEffect(() => {
    setMounted(true);

    // Check for active competitive match in localStorage
    const savedMatch = loadActiveMatch();
    if (savedMatch?.matchId && isMatchValid(savedMatch.savedAt)) {
      setActiveMatch(savedMatch);
    } else if (savedMatch) {
      // Clear expired/invalid match data
      clearActiveMatch();
    }
  }, []);

  // Clear banner if match store shows match has finished
  // Note: Only clear for "finished" status, not "idle" - idle is the default state
  // and clearing on idle would erase valid saved matches on initial load
  useEffect(() => {
    if (matchStatus === "finished") {
      if (activeMatch) {
        clearActiveMatch();
        setActiveMatch(null);
      }
    }
  }, [matchStatus, activeMatch]);

  // Handler to dismiss the active match banner
  const handleDismissActiveMatch = () => {
    clearActiveMatch();
    setActiveMatch(null);
    // Also reset match store if needed
    useMatchStore.getState().reset();
  };

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
    subtitle: isDark ? "#a5b4fc" : "#6366f1",
    text: isDark ? "#94a3b8" : "#64748b",
    textMuted: isDark ? "#64748b" : "#94a3b8",
  };

  const selectedStyles = {
    easy: {
      backgroundColor: isDark ? "#064e3b" : "#ecfdf5",
      borderColor: "#34d399",
    },
    normal: {
      backgroundColor: isDark ? "#78350f" : "#fffbeb",
      borderColor: "#fbbf24",
    },
    hard: {
      backgroundColor: isDark ? "#7f1d1d" : "#fef2f2",
      borderColor: "#f87171",
    },
  };

  const cardStyle = {
    backgroundColor: colors.cardBg,
    borderRadius: "24px",
    padding: "32px",
    borderWidth: "2px",
    borderStyle: "solid" as const,
    borderColor: colors.cardBorder,
    boxShadow: isDark
      ? "0 4px 14px rgba(0, 0, 0, 0.3)"
      : "0 4px 14px rgba(79, 70, 229, 0.1)",
    cursor: "pointer",
    transition: "all 0.2s ease",
  };

  const isNormalUnlocked = true;
  const isHardUnlocked = true;

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
      <div style={{ maxWidth: "900px", width: "100%" }}>
        {/* Theme Switcher */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: "16px",
          }}
        >
          <ThemeSwitcher />
        </div>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <h1
            style={{
              fontSize: "48px",
              fontWeight: 700,
              color: colors.title,
              marginBottom: "16px",
            }}
          >
            {t("home.title")}
          </h1>
          <p style={{ fontSize: "18px", color: colors.subtitle }}>
            {t("home.subtitle")}
          </p>
        </div>

        {/* Active Competitive Match Banner */}
        {activeMatch && isAuthenticated() && (
          <div
            style={{
              marginBottom: "32px",
              padding: "20px 24px",
              background: isDark
                ? "linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(22, 163, 74, 0.3) 100%)"
                : "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)",
              borderRadius: "16px",
              border: "2px solid #22c55e",
              position: "relative",
            }}
          >
            {/* Dismiss button */}
            <button
              onClick={handleDismissActiveMatch}
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                backgroundColor: isDark
                  ? "rgba(0, 0, 0, 0.3)"
                  : "rgba(0, 0, 0, 0.1)",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s ease",
              }}
              title={t("home.activeMatch.dismiss") || "Bỏ qua"}
            >
              <X
                style={{
                  width: "16px",
                  height: "16px",
                  color: isDark ? "#86efac" : "#166534",
                }}
              />
            </button>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    backgroundColor: isDark
                      ? "rgba(34, 197, 94, 0.3)"
                      : "#bbf7d0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Swords
                    style={{ width: "28px", height: "28px", color: "#16a34a" }}
                  />
                </div>
                <div>
                  <h3
                    style={{
                      fontSize: "18px",
                      fontWeight: 700,
                      color: isDark ? "#86efac" : "#15803d",
                      margin: 0,
                    }}
                  >
                    {t("home.activeMatch.title")}
                  </h3>
                  <p
                    style={{
                      fontSize: "14px",
                      color: isDark ? "#4ade80" : "#166534",
                      margin: 0,
                    }}
                  >
                    {t("home.activeMatch.description")}
                  </p>
                </div>
              </div>
              <Link
                href="/competitive/play"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  backgroundColor: "#22c55e",
                  color: "white",
                  fontWeight: 700,
                  fontSize: "16px",
                  padding: "12px 24px",
                  borderRadius: "9999px",
                  textDecoration: "none",
                  boxShadow: "0 4px 14px rgba(34, 197, 94, 0.4)",
                  transition: "all 0.2s ease",
                }}
              >
                <Play style={{ width: "20px", height: "20px" }} />
                {t("home.activeMatch.continue")}
              </Link>
            </div>
          </div>
        )}

        {/* Difficulty Selection */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "24px",
            marginBottom: "32px",
          }}
        >
          {/* Easy */}
          <button
            onClick={() => setSelectedDifficulty("easy")}
            style={{
              ...cardStyle,
              ...(selectedDifficulty === "easy" ? selectedStyles.easy : {}),
              textAlign: "center",
            }}
          >
            <div style={{ marginBottom: "16px" }}>
              <Smile
                width={64}
                height={64}
                style={{
                  width: "64px",
                  height: "64px",
                  color: "#10b981",
                  margin: "0 auto",
                }}
              />
            </div>
            <h3
              style={{
                fontSize: "24px",
                fontWeight: 700,
                color: colors.title,
                marginBottom: "8px",
              }}
            >
              {t("home.difficulty.easy")}
            </h3>
            <p style={{ fontSize: "14px", color: colors.text }}>
              {t("home.difficulty.easyDesc")}
            </p>
            <p
              style={{
                fontSize: "12px",
                color: colors.textMuted,
                marginTop: "8px",
              }}
            >
              {t("home.difficulty.easyCells")}
            </p>
          </button>

          {/* Normal */}
          <button
            onClick={() => isNormalUnlocked && setSelectedDifficulty("normal")}
            disabled={!isNormalUnlocked}
            style={{
              ...cardStyle,
              ...(selectedDifficulty === "normal" ? selectedStyles.normal : {}),
              textAlign: "center",
              opacity: isNormalUnlocked ? 1 : 0.5,
              cursor: isNormalUnlocked ? "pointer" : "not-allowed",
            }}
          >
            <div style={{ marginBottom: "16px" }}>
              {isNormalUnlocked ? (
                <Zap
                  width={64}
                  height={64}
                  style={{
                    width: "64px",
                    height: "64px",
                    color: "#f59e0b",
                    margin: "0 auto",
                  }}
                />
              ) : (
                <Lock
                  width={64}
                  height={64}
                  style={{
                    width: "64px",
                    height: "64px",
                    color: "#94a3b8",
                    margin: "0 auto",
                  }}
                />
              )}
            </div>
            <h3
              style={{
                fontSize: "24px",
                fontWeight: 700,
                color: colors.title,
                marginBottom: "8px",
              }}
            >
              {t("home.difficulty.normal")}
            </h3>
            <p style={{ fontSize: "14px", color: colors.text }}>
              {isNormalUnlocked
                ? t("home.difficulty.normalDesc")
                : t("home.difficulty.normalLocked")}
            </p>
            <p
              style={{
                fontSize: "12px",
                color: colors.textMuted,
                marginTop: "8px",
              }}
            >
              {t("home.difficulty.normalCells")}
            </p>
          </button>

          {/* Hard */}
          <button
            onClick={() => isHardUnlocked && setSelectedDifficulty("hard")}
            disabled={!isHardUnlocked}
            style={{
              ...cardStyle,
              ...(selectedDifficulty === "hard" ? selectedStyles.hard : {}),
              textAlign: "center",
              opacity: isHardUnlocked ? 1 : 0.5,
              cursor: isHardUnlocked ? "pointer" : "not-allowed",
            }}
          >
            <div style={{ marginBottom: "16px" }}>
              {isHardUnlocked ? (
                <Flame
                  width={64}
                  height={64}
                  style={{
                    width: "64px",
                    height: "64px",
                    color: "#ef4444",
                    margin: "0 auto",
                  }}
                />
              ) : (
                <Lock
                  width={64}
                  height={64}
                  style={{
                    width: "64px",
                    height: "64px",
                    color: "#94a3b8",
                    margin: "0 auto",
                  }}
                />
              )}
            </div>
            <h3
              style={{
                fontSize: "24px",
                fontWeight: 700,
                color: colors.title,
                marginBottom: "8px",
              }}
            >
              {t("home.difficulty.hard")}
            </h3>
            <p style={{ fontSize: "14px", color: colors.text }}>
              {isHardUnlocked
                ? t("home.difficulty.hardDesc")
                : t("home.difficulty.hardLocked")}
            </p>
            <p
              style={{
                fontSize: "12px",
                color: colors.textMuted,
                marginTop: "8px",
              }}
            >
              {t("home.difficulty.hardCells")}
            </p>
          </button>
        </div>

        {/* Game Mode Selection */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "16px",
            marginBottom: "32px",
            maxWidth: "600px",
            margin: "0 auto 32px",
          }}
        >
          {/* Classic Mode */}
          <button
            onClick={() => setSelectedGameMode(GAME_MODES.CLASSIC)}
            style={{
              ...cardStyle,
              padding: "20px",
              textAlign: "center",
              ...(selectedGameMode === GAME_MODES.CLASSIC
                ? {
                    backgroundColor: isDark ? "#1e3a5f" : "#e0f2fe",
                    borderColor: "#0ea5e9",
                  }
                : {}),
            }}
          >
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>🎯</div>
            <h3
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: colors.title,
                marginBottom: "4px",
              }}
            >
              {t("home.gameMode.classic")}
            </h3>
            <p style={{ fontSize: "12px", color: colors.text }}>
              {t("home.gameMode.classicDesc")}
            </p>
          </button>

          {/* Mutating Mode */}
          <button
            onClick={() => setSelectedGameMode(GAME_MODES.MUTATING)}
            style={{
              ...cardStyle,
              padding: "20px",
              textAlign: "center",
              ...(selectedGameMode === GAME_MODES.MUTATING
                ? {
                    backgroundColor: isDark ? "#4a1d1d" : "#fef2f2",
                    borderColor: "#ef4444",
                  }
                : {}),
            }}
          >
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>🧬</div>
            <h3
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: colors.title,
                marginBottom: "4px",
              }}
            >
              {t("home.gameMode.mutating")}
            </h3>
            <p style={{ fontSize: "12px", color: colors.text }}>
              {t("home.gameMode.mutatingDesc")}
            </p>
            <span className="mutation-mode-badge" style={{ marginTop: "8px", display: "inline-block" }}>
              ⚡ 30s
            </span>
          </button>
        </div>

        {/* Start Button */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <button
            onClick={handleStartGame}
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
              border: "none",
              cursor: "pointer",
            }}
          >
            {t("home.startGame")} ({t(`home.difficulty.${selectedDifficulty}`)}{selectedGameMode === GAME_MODES.MUTATING ? " • 🧬" : ""})
          </button>
        </div>

        {/* Competitive Mode Section */}
        <div
          style={{
            ...cardStyle,
            textAlign: "center",
            marginBottom: "32px",
            background: isDark
              ? "linear-gradient(135deg, #1e293b 0%, #312e81 100%)"
              : "linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%)",
            borderColor: isDark ? "#8b5cf6" : "#a78bfa",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "16px",
              marginBottom: "16px",
            }}
          >
            <Swords
              width={48}
              height={48}
              style={{ width: "48px", height: "48px", color: "#8b5cf6" }}
            />
            <h2
              style={{
                fontSize: "28px",
                fontWeight: 700,
                color: colors.title,
                margin: 0,
              }}
            >
              {t("competitive.title")}
            </h2>
          </div>
          <p
            style={{
              fontSize: "16px",
              color: colors.text,
              marginBottom: "24px",
            }}
          >
            {t("competitive.subtitle")}
          </p>
          <Link
            href="/competitive"
            style={{
              display: "inline-block",
              backgroundColor: "#8b5cf6",
              color: "white",
              fontWeight: 700,
              fontSize: "18px",
              padding: "14px 40px",
              borderRadius: "9999px",
              textDecoration: "none",
              boxShadow: "0 10px 25px rgba(139, 92, 246, 0.3)",
              transition: "all 0.2s ease",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Swords width={20} height={20} />
              {t("competitive.lobby.joinRoom")}
            </span>
          </Link>
        </div>

        {/* Auth Status */}
        <div
          style={{
            textAlign: "center",
            marginTop: "32px",
            fontSize: "14px",
            color: colors.text,
          }}
        >
          {!isReady ? (
            <p style={{ opacity: 0 }}>{t("common.loading")}</p>
          ) : !isAuthenticated() ? (
            <p>
              {t("home.playingAsGuest")} •{" "}
              <Link
                href="/auth/login"
                style={{ color: "#818cf8", fontWeight: 600 }}
              >
                {t("common.signIn")}
              </Link>{" "}
              {t("common.or")}{" "}
              <Link
                href="/auth/signup"
                style={{ color: "#818cf8", fontWeight: 600 }}
              >
                {t("common.signUp")}
              </Link>{" "}
              {t("home.toSaveProgress")}
            </p>
          ) : (
            <p>
              {t("home.signedIn")} •{" "}
              <Link
                href="/dashboard"
                style={{ color: "#818cf8", fontWeight: 600 }}
              >
                {t("home.viewStats")}
              </Link>
              {" • "}
              <button
                onClick={() => {
                  useAuthStore.getState().clearAuth();
                  window.location.reload();
                }}
                style={{
                  color: "#818cf8",
                  fontWeight: 600,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {t("common.signOut")}
              </button>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
