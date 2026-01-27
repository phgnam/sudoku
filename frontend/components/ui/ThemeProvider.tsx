"use client";

import { useEffect, useState } from "react";
import { useUIStore } from "@/store/ui";

// Script to run before hydration to prevent flash of incorrect theme
const themeScript = `
(function() {
  try {
    const stored = localStorage.getItem('ui-storage');
    if (stored) {
      const { state } = JSON.parse(stored);
      if (state?.theme) document.documentElement.setAttribute('data-theme', state.theme);
      if (state?.colorMode === 'dark') document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    }
  } catch (e) {}
})();
`;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, colorMode } = useUIStore();
  const [mounted, setMounted] = useState(false);

  // Inject script on first render to set theme before hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    // Apply theme
    document.documentElement.setAttribute("data-theme", theme);

    // Apply dark mode
    if (colorMode === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme, colorMode, mounted]);

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      {children}
    </>
  );
}
