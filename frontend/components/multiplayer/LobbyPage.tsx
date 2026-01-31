"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMatchStore } from "@/store/match";
import { useUIStore } from "@/store/ui";
import { useMatchSocket } from "@/hooks/useMatchSocket";
import { LobbyHome } from "./LobbyHome";
import { WaitingRoom } from "./WaitingRoom";
import { QuickMatchQueue } from "./QuickMatchQueue";
import { Trophy, XCircle, Home, RotateCcw } from "lucide-react";

// Key for storing active match info in localStorage
const ACTIVE_MATCH_KEY = "sudoku_active_match";

// Helper to clear active match from localStorage
function clearActiveMatch() {
  try {
    localStorage.removeItem(ACTIVE_MATCH_KEY);
  } catch (e) {
    console.error("Failed to clear active match:", e);
  }
}

export function LobbyPage() {
  const router = useRouter();
  const t = useTranslations("competitive");
  const { colorMode } = useUIStore();
  const [mounted, setMounted] = useState(false);

  const {
    matchId,
    status,
    isHost,
    difficulty,
    opponent,
    myReady,
    opponentReady,
    error,
    result,
    resultReason,
    ratingChange,
    newRating,
  } = useMatchStore();

  const { createMatch, joinMatch, setReady, setUnready, leaveMatch, joinQueue, cancelQueue } =
    useMatchSocket();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect to game when match starts
  useEffect(() => {
    if (status === "playing") {
      router.push("/competitive/play");
    }
  }, [status, router]);

  const isDark = mounted && colorMode === "dark";

  // Show loading states
  const isLoading = status === "creating" || status === "joining";

  // Queuing state - show quick match queue
  if (status === "queuing") {
    return <QuickMatchQueue onCancel={cancelQueue} />;
  }

  // Idle state - show home
  if (status === "idle" || status === "creating" || status === "joining") {
    return (
      <LobbyHome
        onCreateRoom={createMatch}
        onJoinRoom={joinMatch}
        onQuickMatch={joinQueue}
        isLoading={isLoading}
        error={error}
      />
    );
  }

  // Waiting/Joined state - show waiting room
  if (status === "waiting" || status === "joined" || status === "ready") {
    return (
      <WaitingRoom
        matchId={matchId!}
        isHost={isHost}
        difficulty={difficulty}
        opponent={opponent}
        myReady={myReady}
        opponentReady={opponentReady}
        onReady={setReady}
        onUnready={setUnready}
        onLeave={leaveMatch}
        error={error}
      />
    );
  }

  // Finished state - show result
  if (status === "finished") {
    const handleReset = () => {
      clearActiveMatch();
      useMatchStore.getState().reset();
    };

    const handleNewMatch = () => {
      clearActiveMatch();
      useMatchStore.getState().reset();
    };

    const handleGoHome = () => {
      clearActiveMatch();
      useMatchStore.getState().reset();
      router.push("/");
    };

    const getResultConfig = () => {
      switch (result) {
        case "win":
          return {
            icon: <Trophy style={{ width: "48px", height: "48px", color: "#22c55e" }} />,
            title: t("result.victory"),
            bgColor: isDark ? "rgba(6, 78, 59, 0.3)" : "#dcfce7",
            borderColor: "#22c55e",
            titleColor: isDark ? "#86efac" : "#16a34a",
          };
        case "lose":
          return {
            icon: <XCircle style={{ width: "48px", height: "48px", color: "#ef4444" }} />,
            title: t("result.defeat"),
            bgColor: isDark ? "rgba(127, 29, 29, 0.3)" : "#fee2e2",
            borderColor: "#ef4444",
            titleColor: isDark ? "#fca5a5" : "#dc2626",
          };
        case "draw":
        default:
          return {
            icon: <span style={{ fontSize: "48px" }}>🤝</span>,
            title: t("result.draw"),
            bgColor: isDark ? "rgba(120, 53, 15, 0.3)" : "#fef3c7",
            borderColor: "#f59e0b",
            titleColor: isDark ? "#fcd34d" : "#d97706",
          };
      }
    };

    const config = getResultConfig();

    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          gap: "24px",
          padding: "24px",
        }}
      >
        {/* Result Card */}
        <div
          style={{
            backgroundColor: config.bgColor,
            border: `2px solid ${config.borderColor}`,
            borderRadius: "20px",
            padding: "32px 48px",
            textAlign: "center",
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.15)",
          }}
        >
          <div style={{ marginBottom: "16px" }}>{config.icon}</div>
          <h2
            style={{
              fontSize: "28px",
              fontWeight: 800,
              color: config.titleColor,
              marginBottom: "8px",
            }}
          >
            {config.title}
          </h2>
          {resultReason && (
            <p
              style={{
                fontSize: "14px",
                color: isDark ? "#94a3b8" : "#64748b",
                marginBottom: "16px",
              }}
            >
              {resultReason}
            </p>
          )}

          {/* Rating Change */}
          {ratingChange !== undefined && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "4px",
                marginTop: "16px",
                padding: "12px 20px",
                backgroundColor: isDark ? "rgba(0, 0, 0, 0.2)" : "rgba(255, 255, 255, 0.5)",
                borderRadius: "12px",
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  color: isDark ? "#64748b" : "#9ca3af",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                {t("result.ratingChange")}
              </span>
              <span
                style={{
                  fontSize: "24px",
                  fontWeight: 700,
                  color: (ratingChange ?? 0) >= 0 ? "#22c55e" : "#ef4444",
                }}
              >
                {(ratingChange ?? 0) >= 0 ? `+${ratingChange}` : ratingChange}
              </span>
              {newRating !== undefined && (
                <span
                  style={{
                    fontSize: "14px",
                    color: isDark ? "#94a3b8" : "#64748b",
                  }}
                >
                  {t("result.newRating")}: <strong>{newRating}</strong>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
          <button
            onClick={handleNewMatch}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "14px 24px",
              backgroundColor: "#4f46e5",
              color: "white",
              borderRadius: "12px",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "15px",
              boxShadow: "0 4px 14px rgba(79, 70, 229, 0.3)",
              transition: "all 0.2s ease",
            }}
          >
            <RotateCcw style={{ width: "18px", height: "18px" }} />
            {t("result.newMatch")}
          </button>
          <button
            onClick={handleGoHome}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "14px 24px",
              backgroundColor: isDark ? "#374151" : "#e5e7eb",
              color: isDark ? "#e0e7ff" : "#1e1b4b",
              borderRadius: "12px",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "15px",
              transition: "all 0.2s ease",
            }}
          >
            <Home style={{ width: "18px", height: "18px" }} />
            {t("result.home")}
          </button>
        </div>
      </div>
    );
  }

  // Default fallback
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
    </div>
  );
}
