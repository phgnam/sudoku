"use client";

import { ThemeColorSelector } from "./ThemeColorSelector";
import { SoundToggle } from "./SoundToggle";
import { NightModeToggle } from "./NightModeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function ThemeSwitcher() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
      {/* Theme Color Selector */}
      <ThemeColorSelector />

      {/* Sound Toggle */}
      <SoundToggle />

      {/* Dark Mode Toggle */}
      <NightModeToggle />

      {/* Language Switcher */}
      <LanguageSwitcher />
    </div>
  );
}
