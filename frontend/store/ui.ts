import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "blue" | "green" | "orange";
export type ColorMode = "light" | "dark";
export type Difficulty = "easy" | "normal" | "hard";

interface UIState {
  theme: Theme;
  colorMode: ColorMode;
  soundEnabled: boolean;
  showTutorial: boolean;
  selectedDifficulty: Difficulty;
  _hasHydrated: boolean;
  setTheme: (theme: Theme) => void;
  setColorMode: (mode: ColorMode) => void;
  toggleSound: () => void;
  setSoundEnabled: (enabled: boolean) => void;
  setShowTutorial: (show: boolean) => void;
  setSelectedDifficulty: (difficulty: Difficulty) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: "blue",
      colorMode: "dark",
      soundEnabled: true,
      showTutorial: true,
      selectedDifficulty: "easy",
      _hasHydrated: false,

      setTheme: (theme) => set({ theme }),
      setColorMode: (colorMode) => set({ colorMode }),
      toggleSound: () =>
        set((state) => ({ soundEnabled: !state.soundEnabled })),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setShowTutorial: (showTutorial) => set({ showTutorial }),
      setSelectedDifficulty: (selectedDifficulty) => set({ selectedDifficulty }),
      setHasHydrated: (hasHydrated) => set({ _hasHydrated: hasHydrated }),
    }),
    {
      name: "ui-storage",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
