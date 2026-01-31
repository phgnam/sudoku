"use client";

import { useTranslations } from "next-intl";
import { useMatchStore } from "@/store/match";
import { useUIStore } from "@/store/ui";
import { useEffect, useState } from "react";

interface QuickMatchQueueProps {
  onCancel: () => void;
}

export function QuickMatchQueue({ onCancel }: QuickMatchQueueProps) {
  const t = useTranslations("competitive");
  const { colorMode } = useUIStore();
  const {
    queuePosition,
    estimatedWait,
    searchRadius,
    queueDifficulty,
    queueJoinedAt,
  } = useMatchStore();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && colorMode === "dark";

  // Calculate actual wait time
  const [actualWaitTime, setActualWaitTime] = useState(0);

  useEffect(() => {
    if (!queueJoinedAt) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - queueJoinedAt) / 1000);
      setActualWaitTime(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [queueJoinedAt]);

  // Format time as mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const colors = {
    bg: isDark
      ? "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)"
      : "linear-gradient(135deg, #f8fafc 0%, #eef2ff 50%, #e0e7ff 100%)",
    cardBg: isDark ? "#1e293b" : "white",
    cardBorder: isDark ? "#4f46e5" : "#c7d2fe",
    title: isDark ? "#e0e7ff" : "#1e1b4b",
    text: isDark ? "#94a3b8" : "#64748b",
    infoBg: isDark ? "#0f172a" : "#f3f4f6",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "24px",
        padding: "32px",
        maxWidth: "400px",
        margin: "0 auto",
        minHeight: "100vh",
        background: colors.bg,
      }}
    >
      {/* Card container */}
      <div
        style={{
          backgroundColor: colors.cardBg,
          borderRadius: "24px",
          padding: "40px",
          border: `2px solid ${colors.cardBorder}`,
          boxShadow: isDark
            ? "0 8px 32px rgba(0, 0, 0, 0.4)"
            : "0 8px 32px rgba(79, 70, 229, 0.12)",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "24px",
        }}
      >
        {/* Title */}
        <h2
          style={{
            fontSize: "24px",
            fontWeight: "bold",
            color: colors.title,
            margin: 0,
            textAlign: "center",
          }}
        >
          🔍 {t("quickMatch.searching")}
        </h2>

        {/* Animated searching indicator */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                backgroundColor: "#f59e0b",
                animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>

        {/* Queue info */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            width: "100%",
            padding: "16px",
            backgroundColor: colors.infoBg,
            borderRadius: "12px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: colors.text }}>{t("quickMatch.difficulty")}:</span>
            <span style={{ fontWeight: "600", textTransform: "capitalize", color: colors.title }}>
              {queueDifficulty || "normal"}
            </span>
          </div>

          {queuePosition !== null && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: colors.text }}>{t("quickMatch.position")}:</span>
              <span style={{ fontWeight: "600", color: colors.title }}>#{queuePosition}</span>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: colors.text }}>{t("quickMatch.waitTime")}:</span>
            <span style={{ fontWeight: "600", color: colors.title }}>{formatTime(actualWaitTime)}</span>
          </div>

          {estimatedWait !== null && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: colors.text }}>{t("quickMatch.estimatedWait")}:</span>
              <span style={{ fontWeight: "600", color: colors.title }}>~{estimatedWait}s</span>
            </div>
          )}

          {searchRadius !== null && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: colors.text }}>{t("quickMatch.searchRange")}:</span>
              <span style={{ fontWeight: "600", color: colors.title }}>±{searchRadius} ELO</span>
            </div>
          )}
        </div>

        {/* Cancel button */}
        <button
          onClick={onCancel}
          style={{
            padding: "14px 40px",
            backgroundColor: "#ef4444",
            color: "white",
            border: "none",
            borderRadius: "12px",
            fontSize: "16px",
            fontWeight: "600",
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(239, 68, 68, 0.35)",
            transition: "all 0.2s ease",
          }}
        >
          {t("quickMatch.cancel")}
        </button>
      </div>

      {/* Pulse animation */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}

