"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useUIStore } from "@/store/ui";
import { soundManager } from "@/lib/sounds";
import { LanguageSwitcher } from "./LanguageSwitcher";

const themeColors = {
  blue: "#3b82f6",
  green: "#10b981",
  orange: "#f97316",
};

export function ThemeSwitcher() {
  const {
    theme,
    colorMode,
    soundEnabled,
    setTheme,
    setColorMode,
    setSoundEnabled,
  } = useUIStore();
  const t = useTranslations();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    soundManager.setEnabled(soundEnabled);
  }, [soundEnabled]);

  const isDark = mounted && colorMode === "dark";

  const themes = [
    { id: "blue" as const, name: "Ocean Blue", color: themeColors.blue },
    { id: "green" as const, name: "Forest Green", color: themeColors.green },
    { id: "orange" as const, name: "Sunset Orange", color: themeColors.orange },
  ];

  const buttonStyle = {
    padding: "8px",
    borderRadius: "8px",
    backgroundColor: isDark ? "#374151" : "#e5e7eb",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
      {/* Theme Color Selector */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "14px", fontWeight: 500, color: isDark ? "#d1d5db" : "#374151" }}>
          {t('common.theme')}:
        </span>
        <div style={{ display: "flex", gap: "8px" }}>
          {themes.map((themeOption) => (
            <button
              key={themeOption.id}
              onClick={() => setTheme(themeOption.id)}
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "9999px",
                backgroundColor: themeOption.color,
                border: "none",
                cursor: "pointer",
                transform: theme === themeOption.id ? "scale(1.1)" : "scale(1)",
                boxShadow: theme === themeOption.id ? `0 0 0 2px ${isDark ? "#1f2937" : "white"}, 0 0 0 4px ${isDark ? "#e5e7eb" : "#1f2937"}` : "none",
                transition: "all 0.2s ease",
              }}
              title={themeOption.name}
            />
          ))}
        </div>
      </div>

      {/* Sound Toggle */}
      <button
        onClick={() => setSoundEnabled(!soundEnabled)}
        style={buttonStyle}
        title={soundEnabled ? t('common.soundOn') : t('common.soundOff')}
      >
        {soundEnabled ? (
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill={isDark ? "#d1d5db" : "#374151"}
            style={{ width: "20px", height: "20px", flexShrink: 0 }}
          >
            <path
              fillRule="evenodd"
              d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill={isDark ? "#d1d5db" : "#374151"}
            style={{ width: "20px", height: "20px", flexShrink: 0 }}
          >
            <path
              fillRule="evenodd"
              d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>

      {/* Dark Mode Toggle */}
      <button
        onClick={() => setColorMode(colorMode === "dark" ? "light" : "dark")}
        style={buttonStyle}
        title={colorMode === "dark" ? t('common.lightMode') : t('common.darkMode')}
      >
        {colorMode === "dark" ? (
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="#eab308"
            style={{ width: "20px", height: "20px", flexShrink: 0 }}
          >
            <path
              fillRule="evenodd"
              d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="#374151"
            style={{ width: "20px", height: "20px", flexShrink: 0 }}
          >
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        )}
      </button>

      {/* Language Switcher */}
      <LanguageSwitcher />
    </div>
  );
}
