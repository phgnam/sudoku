import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "blue" | "green" | "orange";
export type ColorMode = "light" | "dark";

interface UIState {
  theme: Theme;
  colorMode: ColorMode;
  soundEnabled: boolean;
  showTutorial: boolean;
  setTheme: (theme: Theme) => void;
  setColorMode: (mode: ColorMode) => void;
  toggleSound: () => void;
  setSoundEnabled: (enabled: boolean) => void;
  setShowTutorial: (show: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: "blue",
      colorMode: "dark",
      soundEnabled: true,
      showTutorial: true,

      setTheme: (theme) => set({ theme }),
      setColorMode: (colorMode) => set({ colorMode }),
      toggleSound: () =>
        set((state) => ({ soundEnabled: !state.soundEnabled })),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }), // Added this line
      setShowTutorial: (showTutorial) => set({ showTutorial }),
    }),
    {
      name: "ui-storage",
    },
  ),
);
