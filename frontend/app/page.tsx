"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Smile, Zap, Flame, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/store/auth";
import { useUIStore } from "@/store/ui";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";

export default function HomePage() {
  const t = useTranslations();
  const { isAuthenticated, _hasHydrated: authHydrated } = useAuthStore();
  const { colorMode } = useUIStore();
  const [selectedDifficulty, setSelectedDifficulty] = useState<"easy" | "normal" | "hard">("easy");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
    easy: { backgroundColor: isDark ? "#064e3b" : "#ecfdf5", borderColor: "#34d399" },
    normal: { backgroundColor: isDark ? "#78350f" : "#fffbeb", borderColor: "#fbbf24" },
    hard: { backgroundColor: isDark ? "#7f1d1d" : "#fef2f2", borderColor: "#f87171" },
  };

  const cardStyle = {
    backgroundColor: colors.cardBg,
    borderRadius: "24px",
    padding: "32px",
    borderWidth: "2px",
    borderStyle: "solid" as const,
    borderColor: colors.cardBorder,
    boxShadow: isDark ? "0 4px 14px rgba(0, 0, 0, 0.3)" : "0 4px 14px rgba(79, 70, 229, 0.1)",
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
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
          <ThemeSwitcher />
        </div>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <h1 style={{ fontSize: "48px", fontWeight: 700, color: colors.title, marginBottom: "16px" }}>
            {t('home.title')}
          </h1>
          <p style={{ fontSize: "18px", color: colors.subtitle }}>
            {t('home.subtitle')}
          </p>
        </div>

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
              <Smile width={64} height={64} style={{ width: "64px", height: "64px", color: "#10b981", margin: "0 auto" }} />
            </div>
            <h3 style={{ fontSize: "24px", fontWeight: 700, color: colors.title, marginBottom: "8px" }}>{t('home.difficulty.easy')}</h3>
            <p style={{ fontSize: "14px", color: colors.text }}>{t('home.difficulty.easyDesc')}</p>
            <p style={{ fontSize: "12px", color: colors.textMuted, marginTop: "8px" }}>{t('home.difficulty.easyCells')}</p>
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
                <Zap width={64} height={64} style={{ width: "64px", height: "64px", color: "#f59e0b", margin: "0 auto" }} />
              ) : (
                <Lock width={64} height={64} style={{ width: "64px", height: "64px", color: "#94a3b8", margin: "0 auto" }} />
              )}
            </div>
            <h3 style={{ fontSize: "24px", fontWeight: 700, color: colors.title, marginBottom: "8px" }}>{t('home.difficulty.normal')}</h3>
            <p style={{ fontSize: "14px", color: colors.text }}>
              {isNormalUnlocked ? t('home.difficulty.normalDesc') : t('home.difficulty.normalLocked')}
            </p>
            <p style={{ fontSize: "12px", color: colors.textMuted, marginTop: "8px" }}>{t('home.difficulty.normalCells')}</p>
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
                <Flame width={64} height={64} style={{ width: "64px", height: "64px", color: "#ef4444", margin: "0 auto" }} />
              ) : (
                <Lock width={64} height={64} style={{ width: "64px", height: "64px", color: "#94a3b8", margin: "0 auto" }} />
              )}
            </div>
            <h3 style={{ fontSize: "24px", fontWeight: 700, color: colors.title, marginBottom: "8px" }}>{t('home.difficulty.hard')}</h3>
            <p style={{ fontSize: "14px", color: colors.text }}>
              {isHardUnlocked ? t('home.difficulty.hardDesc') : t('home.difficulty.hardLocked')}
            </p>
            <p style={{ fontSize: "12px", color: colors.textMuted, marginTop: "8px" }}>{t('home.difficulty.hardCells')}</p>
          </button>
        </div>

        {/* Start Button */}
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
            {t('home.startGame')} ({t(`home.difficulty.${selectedDifficulty}`)})
          </Link>
        </div>

        {/* Auth Status */}
        <div style={{ textAlign: "center", marginTop: "32px", fontSize: "14px", color: colors.text }}>
          {!isReady ? (
            <p style={{ opacity: 0 }}>{t('common.loading')}</p>
          ) : !isAuthenticated() ? (
            <p>
              {t('home.playingAsGuest')} •{" "}
              <Link href="/auth/login" style={{ color: "#818cf8", fontWeight: 600 }}>{t('common.signIn')}</Link>
              {" "}{t('common.or')}{" "}
              <Link href="/auth/signup" style={{ color: "#818cf8", fontWeight: 600 }}>{t('common.signUp')}</Link>
              {" "}{t('home.toSaveProgress')}
            </p>
          ) : (
            <p>
              {t('home.signedIn')} •{" "}
              <Link href="/dashboard" style={{ color: "#818cf8", fontWeight: 600 }}>{t('home.viewStats')}</Link>
              {" • "}
              <button
                onClick={() => {
                  useAuthStore.getState().clearAuth();
                  window.location.reload();
                }}
                style={{ color: "#818cf8", fontWeight: 600, background: "none", border: "none", cursor: "pointer" }}
              >
                {t('common.signOut')}
              </button>
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
