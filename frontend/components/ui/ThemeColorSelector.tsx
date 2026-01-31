"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useUIStore } from "@/store/ui";

const themeColors = {
  blue: "#3b82f6",
  green: "#10b981",
  orange: "#f97316",
};

export function ThemeColorSelector() {
  const { theme, colorMode, setTheme } = useUIStore();
  const t = useTranslations();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && colorMode === "dark";

  const themes = [
    { id: "blue" as const, name: "Ocean Blue", color: themeColors.blue },
    { id: "green" as const, name: "Forest Green", color: themeColors.green },
    { id: "orange" as const, name: "Sunset Orange", color: themeColors.orange },
  ];

  if (!mounted) {
    return null;
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <span style={{ fontSize: "14px", fontWeight: 500, color: isDark ? "#d1d5db" : "#374151" }}>
        {t('common.theme')}:
      </span>
      <div style={{ display: "flex", gap: "8px" }}>
        {themes.map((themeOption) => (
          <button
            type="button"
            key={themeOption.id}
            onClick={() => setTheme(themeOption.id)}
            aria-label={`Select ${themeOption.name} theme${theme === themeOption.id ? ', currently selected' : ''}`}
            aria-pressed={theme === themeOption.id}
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
  );
}
