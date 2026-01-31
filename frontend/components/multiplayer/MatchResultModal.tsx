"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMatchStore } from "@/store/match";
import { useUIStore } from "@/store/ui";

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

interface MatchResultModalProps {
  result: "win" | "lose" | "draw";
  reason: string;
  opponentName?: string;
  ratingChange?: number | null;
  newRating?: number | null;
  rematchStatus:
    | "none"
    | "requested"
    | "received"
    | "accepted"
    | "declined"
    | "expired";
  onRequestRematch: () => void;
  onAcceptRematch: () => void;
  onDeclineRematch: () => void;
  onClose: () => void;
}

export function MatchResultModal({
  result,
  reason,
  opponentName,
  ratingChange,
  newRating,
  rematchStatus,
  onRequestRematch,
  onAcceptRematch,
  onDeclineRematch,
  onClose,
}: MatchResultModalProps) {
  const router = useRouter();
  const t = useTranslations("competitive");
  const { colorMode } = useUIStore();
  const [mounted, setMounted] = useState(false);
  const resetMatch = useMatchStore((s) => s.reset);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && colorMode === "dark";

  const colors = {
    cardBg: isDark ? "#1e293b" : "white",
    cardBorder: isDark ? "#4f46e5" : "#c7d2fe",
    text: isDark ? "#94a3b8" : "#64748b",
    textDark: isDark ? "#e0e7ff" : "#1e1b4b",
    subtleText: isDark ? "#64748b" : "#9ca3af",
  };

  const getResultConfig = () => {
    switch (result) {
      case "win":
        return {
          emoji: "🏆",
          title: t("result.victory"),
          bgColor: isDark ? "rgba(6, 78, 59, 0.3)" : "#dcfce7",
          borderColor: "#22c55e",
          textColor: isDark ? "#86efac" : "#16a34a",
        };
      case "lose":
        return {
          emoji: "😔",
          title: t("result.defeat"),
          bgColor: isDark ? "rgba(127, 29, 29, 0.3)" : "#fee2e2",
          borderColor: "#ef4444",
          textColor: isDark ? "#fca5a5" : "#dc2626",
        };
      case "draw":
        return {
          emoji: "🤝",
          title: t("result.draw"),
          bgColor: isDark ? "rgba(120, 53, 15, 0.3)" : "#fef3c7",
          borderColor: "#f59e0b",
          textColor: isDark ? "#fcd34d" : "#d97706",
        };
    }
  };

  const config = getResultConfig();

  // Check if match ended in a way that rematch doesn't make sense
  // - Surrender: player intentionally quit
  // - Timeout: time expired, players may have left
  // - Disconnect: opponent left/disconnected
  const reasonLower = reason.toLowerCase();
  const shouldHideRematch =
    reasonLower.includes("surrendered") ||
    reasonLower.includes("timeout") ||
    reasonLower.includes("time") ||
    reasonLower.includes("disconnected") ||
    reasonLower.includes("left");

  const handlePlayAgain = () => {
    clearActiveMatch();
    resetMatch();
    router.push("/competitive");
  };

  const handleBackToHome = () => {
    clearActiveMatch();
    resetMatch();
    router.push("/dashboard");
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        backdropFilter: "blur(4px)",
        padding: "16px",
      }}
      onClick={onClose}
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
        onClick={(e) => e.stopPropagation()}
      >
        {/* Result Icon */}
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            backgroundColor: config.bgColor,
            border: `4px solid ${config.borderColor}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "40px",
            margin: "0 auto 16px",
          }}
        >
          {config.emoji}
        </div>

        {/* Title */}
        <h2
          style={{
            fontSize: "28px",
            fontWeight: 700,
            color: config.textColor,
            marginBottom: "8px",
          }}
        >
          {config.title}
        </h2>

        {/* Reason */}
        <p
          style={{
            fontSize: "16px",
            color: colors.text,
            marginBottom: "8px",
          }}
        >
          {reason}
        </p>

        {/* Opponent info */}
        {opponentName && (
          <p
            style={{
              fontSize: "14px",
              color: colors.subtleText,
              marginBottom: ratingChange != null ? "12px" : "24px",
            }}
          >
            {t("result.vs")} {opponentName}
          </p>
        )}

        {/* Rating change */}
        {ratingChange != null && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              marginBottom: "24px",
              padding: "12px 16px",
              backgroundColor:
                ratingChange >= 0
                  ? isDark
                    ? "rgba(6, 78, 59, 0.3)"
                    : "#f0fdf4"
                  : isDark
                    ? "rgba(127, 29, 29, 0.3)"
                    : "#fef2f2",
              borderRadius: "12px",
              border: `1px solid ${ratingChange >= 0 ? "#22c55e" : "#ef4444"}`,
            }}
          >
            <span style={{ fontSize: "14px", color: colors.text }}>
              {t("result.rating")}:
            </span>
            <span
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: ratingChange >= 0 ? "#22c55e" : "#ef4444",
              }}
            >
              {ratingChange >= 0 ? "+" : ""}
              {ratingChange}
            </span>
            <span style={{ fontSize: "14px", color: colors.subtleText }}>
              →
            </span>
            <span
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: colors.textDark,
              }}
            >
              {newRating}
            </span>
          </div>
        )}

        {/* Rematch section - hidden for surrender/timeout/disconnect matches */}
        {!shouldHideRematch && (
        <div style={{ marginBottom: "16px" }}>
          {rematchStatus === "none" && (
            <button
              onClick={onRequestRematch}
              style={{
                padding: "12px 24px",
                backgroundColor: "#8b5cf6",
                color: "white",
                borderRadius: "12px",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                width: "100%",
                fontSize: "16px",
                boxShadow: "0 4px 14px rgba(139, 92, 246, 0.3)",
              }}
            >
              🔄 {t("result.rematch.request")}
            </button>
          )}

          {rematchStatus === "requested" && (
            <div
              style={{
                padding: "12px 16px",
                backgroundColor: isDark ? "rgba(124, 58, 237, 0.2)" : "#f5f3ff",
                borderRadius: "12px",
                border: "1px solid #c4b5fd",
                color: isDark ? "#c4b5fd" : "#7c3aed",
                fontWeight: 500,
              }}
            >
              ⏳ {t("result.rematch.waiting")}
            </div>
          )}

          {rematchStatus === "received" && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              <div
                style={{
                  padding: "8px 12px",
                  backgroundColor: isDark
                    ? "rgba(120, 53, 15, 0.3)"
                    : "#fef3c7",
                  borderRadius: "8px",
                  color: isDark ? "#fcd34d" : "#92400e",
                  fontWeight: 500,
                  fontSize: "14px",
                }}
              >
                {opponentName || "Opponent"} {t("result.rematch.received")}
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={onDeclineRematch}
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    backgroundColor: isDark
                      ? "rgba(127, 29, 29, 0.3)"
                      : "#fee2e2",
                    color: isDark ? "#fca5a5" : "#dc2626",
                    borderRadius: "10px",
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  ✕ {t("result.rematch.decline")}
                </button>
                <button
                  onClick={onAcceptRematch}
                  style={{
                    flex: 1,
                    padding: "10px 16px",
                    backgroundColor: "#22c55e",
                    color: "white",
                    borderRadius: "10px",
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(34, 197, 94, 0.3)",
                  }}
                >
                  ✓ {t("result.rematch.accept")}
                </button>
              </div>
            </div>
          )}

          {rematchStatus === "declined" && (
            <div
              style={{
                padding: "12px 16px",
                backgroundColor: isDark ? "rgba(127, 29, 29, 0.3)" : "#fee2e2",
                borderRadius: "12px",
                border: "1px solid #fecaca",
                color: isDark ? "#fca5a5" : "#dc2626",
                fontWeight: 500,
              }}
            >
              ❌ {t("result.rematch.declined")}
            </div>
          )}

          {rematchStatus === "expired" && (
            <div
              style={{
                padding: "12px 16px",
                backgroundColor: isDark ? "rgba(120, 53, 15, 0.3)" : "#fef3c7",
                borderRadius: "12px",
                border: "1px solid #fde68a",
                color: isDark ? "#fcd34d" : "#92400e",
                fontWeight: 500,
              }}
            >
              ⏰ {t("result.rematch.expired")}
            </div>
          )}
        </div>
        )}

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button
            onClick={handleBackToHome}
            style={{
              padding: "12px 24px",
              backgroundColor: isDark ? "#374151" : "#e5e7eb",
              color: colors.textDark,
              borderRadius: "12px",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
            }}
          >
            {t("result.home")}
          </button>
          <button
            onClick={handlePlayAgain}
            style={{
              padding: "12px 24px",
              backgroundColor: "#f97316",
              color: "white",
              borderRadius: "12px",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(249, 115, 22, 0.3)",
            }}
          >
            {t("result.newMatch")}
          </button>
        </div>
      </div>
    </div>
  );
}
