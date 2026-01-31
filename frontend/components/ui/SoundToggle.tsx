"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useUIStore } from "@/store/ui";
import { soundManager } from "@/lib/sounds";

export function SoundToggle() {
  const { soundEnabled, setSoundEnabled, colorMode } = useUIStore();
  const t = useTranslations();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    soundManager.setEnabled(soundEnabled);
  }, [soundEnabled]);

  const isDark = mounted && colorMode === "dark";

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

  if (!mounted) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => setSoundEnabled(!soundEnabled)}
      style={buttonStyle}
      aria-label={soundEnabled ? t("common.soundOn") : t("common.soundOff")}
      aria-pressed={soundEnabled}
      title={soundEnabled ? t("common.soundOn") : t("common.soundOff")}
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
  );
}
