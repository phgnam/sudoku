"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Copy, Check, Swords, Users, Clock, Shield } from "lucide-react";
import { Opponent } from "@/store/match";
import { useUIStore } from "@/store/ui";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";

interface WaitingRoomProps {
  matchId: string;
  isHost: boolean;
  difficulty: string;
  opponent: Opponent | null;
  myReady: boolean;
  opponentReady: boolean;
  onReady: () => void;
  onUnready: () => void;
  onLeave: () => void;
  error?: string | null;
}

export function WaitingRoom({
  matchId,
  isHost,
  difficulty,
  opponent,
  myReady,
  opponentReady,
  onReady,
  onUnready,
  onLeave,
  error,
}: WaitingRoomProps) {
  const t = useTranslations("competitive");
  const { colorMode } = useUIStore();
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

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
    borderRadius: "24px",
    padding: "40px",
    border: `2px solid ${colors.cardBorder}`,
    boxShadow: isDark
      ? "0 8px 32px rgba(0, 0, 0, 0.4)"
      : "0 8px 32px rgba(79, 70, 229, 0.12)",
  };

  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(matchId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement("input");
      input.value = matchId;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getDifficultyInfo = (d: string) => {
    const info: Record<
      string,
      { label: string; color: string; bg: string; icon: string }
    > = {
      easy: {
        label: t("lobby.difficulty.easy"),
        color: "#10b981",
        bg: isDark ? "#064e3b" : "#ecfdf5",
        icon: "😊",
      },
      normal: {
        label: t("lobby.difficulty.normal"),
        color: "#f59e0b",
        bg: isDark ? "#78350f" : "#fffbeb",
        icon: "⚡",
      },
      hard: {
        label: t("lobby.difficulty.hard"),
        color: "#ef4444",
        bg: isDark ? "#7f1d1d" : "#fef2f2",
        icon: "🔥",
      },
    };
    return info[d] || { label: d, color: "#6b7280", bg: "#f3f4f6", icon: "🎮" };
  };

  const bothReady = myReady && opponentReady && !!opponent;
  const diffInfo = getDifficultyInfo(difficulty);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: colors.bg,
        padding: "40px 24px",
      }}
    >
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: "32px",
          }}
        >
          <ThemeSwitcher />
        </div>

        {/* Main Card */}
        <div style={cardStyle}>
          {/* Title */}
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <h2
              style={{
                fontSize: "36px",
                fontWeight: 800,
                color: colors.title,
                marginBottom: "12px",
                letterSpacing: "-0.02em",
              }}
            >
              🎮 {t("waitingRoom.title")}
            </h2>
            <p style={{ fontSize: "16px", color: colors.text }}>
              {t("waitingRoom.subtitle") || "Waiting for players to get ready"}
            </p>
          </div>

          {/* Room Code Section */}
          <div
            style={{
              backgroundColor: colors.surfaceBg,
              borderRadius: "20px",
              padding: "28px",
              marginBottom: "32px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "20px",
              }}
            >
              {/* Room Code */}
              <div>
                <p
                  style={{
                    fontSize: "13px",
                    color: colors.text,
                    marginBottom: "8px",
                    fontWeight: 500,
                  }}
                >
                  {t("waitingRoom.roomCode")}
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "40px",
                      fontFamily: "monospace",
                      fontWeight: 800,
                      letterSpacing: "0.12em",
                      color: colors.title,
                    }}
                  >
                    {matchId}
                  </span>
                  <button
                    onClick={copyRoomCode}
                    style={{
                      padding: "12px",
                      backgroundColor: isDark ? "#374151" : "#e2e8f0",
                      borderRadius: "12px",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.2s ease",
                    }}
                    title={t("waitingRoom.clickToCopy")}
                  >
                    {copied ? (
                      <Check
                        style={{
                          width: "24px",
                          height: "24px",
                          color: "#10b981",
                        }}
                      />
                    ) : (
                      <Copy
                        style={{
                          width: "24px",
                          height: "24px",
                          color: colors.text,
                        }}
                      />
                    )}
                  </button>
                </div>
              </div>

              {/* Difficulty Badge */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    fontSize: "13px",
                    color: colors.text,
                    fontWeight: 500,
                  }}
                >
                  {t("lobby.difficulty.title") || "Difficulty"}
                </span>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 20px",
                    backgroundColor: diffInfo.bg,
                    color: diffInfo.color,
                    borderRadius: "12px",
                    fontSize: "15px",
                    fontWeight: 700,
                    border: `2px solid ${diffInfo.color}30`,
                  }}
                >
                  <span>{diffInfo.icon}</span>
                  {diffInfo.label}
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div
              style={{
                backgroundColor: isDark ? "rgba(161, 98, 7, 0.2)" : "#fef3c7",
                color: isDark ? "#fcd34d" : "#b45309",
                padding: "16px 20px",
                borderRadius: "14px",
                marginBottom: "28px",
                fontSize: "14px",
                fontWeight: 500,
                textAlign: "center",
              }}
            >
              {error}
            </div>
          )}

          {/* Players Section */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto 1fr",
              gap: "32px",
              alignItems: "center",
              marginBottom: "36px",
            }}
          >
            {/* You */}
            <div
              style={{
                padding: "32px",
                borderRadius: "20px",
                border: `3px solid ${myReady ? "#10b981" : colors.cardBorder}`,
                backgroundColor: myReady
                  ? isDark
                    ? "rgba(6, 78, 59, 0.3)"
                    : "#ecfdf5"
                  : colors.surfaceBg,
                transition: "all 0.3s ease",
              }}
            >
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  backgroundColor: "#4f46e5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px",
                  fontSize: "36px",
                  boxShadow: "0 8px 24px rgba(79, 70, 229, 0.35)",
                }}
              >
                👤
              </div>
              <div
                style={{
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: 700,
                    color: colors.title,
                    marginBottom: "8px",
                  }}
                >
                  {t("waitingRoom.you")}
                </div>
                {isHost && (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "4px 12px",
                      backgroundColor: isDark ? "#78350f" : "#fef3c7",
                      color: "#f97316",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: 600,
                      marginBottom: "12px",
                    }}
                  >
                    <Shield style={{ width: "14px", height: "14px" }} />
                    {t("waitingRoom.host")}
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: myReady ? "#10b981" : colors.text,
                  }}
                >
                  {myReady ? (
                    <>
                      <Check style={{ width: "18px", height: "18px" }} />
                      {t("waitingRoom.ready")}
                    </>
                  ) : (
                    t("waitingRoom.notReady")
                  )}
                </div>
              </div>
            </div>

            {/* VS Divider */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <Swords
                style={{
                  width: "48px",
                  height: "48px",
                  color: isDark ? "#6366f1" : "#4f46e5",
                }}
              />
              <span
                style={{
                  fontSize: "24px",
                  fontWeight: 800,
                  color: isDark ? "#6366f1" : "#4f46e5",
                  letterSpacing: "0.1em",
                }}
              >
                VS
              </span>
            </div>

            {/* Opponent */}
            <div
              style={{
                padding: "32px",
                borderRadius: "20px",
                border: `3px ${opponent ? "solid" : "dashed"} ${
                  opponent && opponentReady ? "#10b981" : colors.cardBorder
                }`,
                backgroundColor:
                  opponent && opponentReady
                    ? isDark
                      ? "rgba(6, 78, 59, 0.3)"
                      : "#ecfdf5"
                    : colors.surfaceBg,
                transition: "all 0.3s ease",
              }}
            >
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "50%",
                  backgroundColor: opponent
                    ? "#f97316"
                    : isDark
                      ? "#374151"
                      : "#e5e7eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px",
                  fontSize: "36px",
                  boxShadow: opponent
                    ? "0 8px 24px rgba(249, 115, 22, 0.35)"
                    : "none",
                }}
              >
                {opponent ? "👤" : "❓"}
              </div>
              <div
                style={{
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: 700,
                    color: colors.title,
                    marginBottom: "12px",
                  }}
                >
                  {opponent
                    ? opponent.name
                    : t("waitingRoom.waitingForOpponent")}
                </div>
                {opponent && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      fontSize: "14px",
                      fontWeight: 600,
                      color: opponentReady ? "#10b981" : colors.text,
                    }}
                  >
                    {opponentReady ? (
                      <>
                        <Check style={{ width: "18px", height: "18px" }} />
                        {t("waitingRoom.ready")}
                      </>
                    ) : (
                      t("waitingRoom.notReady")
                    )}
                  </div>
                )}
                {!opponent && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                      color: colors.text,
                      fontSize: "14px",
                    }}
                  >
                    <div
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: "#f59e0b",
                        animation: "pulse 1.5s infinite",
                      }}
                    />
                    {t("waitingRoom.waiting") || "Waiting..."}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Starting indicator */}
          {bothReady && (
            <div
              style={{
                backgroundColor: isDark ? "rgba(6, 78, 59, 0.3)" : "#ecfdf5",
                color: "#10b981",
                padding: "20px 28px",
                borderRadius: "16px",
                fontSize: "20px",
                fontWeight: 700,
                marginBottom: "28px",
                textAlign: "center",
                border: "2px solid #10b98140",
              }}
            >
              🚀 {t("waitingRoom.startingSoon")}
            </div>
          )}

          {/* Actions */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={onLeave}
              style={{
                padding: "16px 32px",
                backgroundColor: isDark ? "#374151" : "#e5e7eb",
                color: colors.title,
                borderRadius: "14px",
                fontWeight: 600,
                fontSize: "16px",
                border: "none",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              {t("waitingRoom.leaveRoom")}
            </button>

            {opponent && (
              <button
                onClick={myReady ? onUnready : onReady}
                disabled={bothReady}
                style={{
                  padding: "16px 48px",
                  backgroundColor: myReady ? "#f59e0b" : "#10b981",
                  color: "white",
                  borderRadius: "14px",
                  fontWeight: 600,
                  fontSize: "16px",
                  border: "none",
                  cursor: bothReady ? "not-allowed" : "pointer",
                  opacity: bothReady ? 0.5 : 1,
                  boxShadow: myReady
                    ? "0 4px 20px rgba(245, 158, 11, 0.35)"
                    : "0 4px 20px rgba(16, 185, 129, 0.35)",
                  transition: "all 0.2s ease",
                }}
              >
                {myReady
                  ? t("waitingRoom.setUnready")
                  : t("waitingRoom.setReady")}
              </button>
            )}
          </div>

          {!opponent && isHost && (
            <p
              style={{
                marginTop: "24px",
                fontSize: "15px",
                color: colors.text,
                textAlign: "center",
              }}
            >
              📤 {t("waitingRoom.shareCode")}
            </p>
          )}
        </div>
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
