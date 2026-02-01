import { useEffect } from "react";
import { soundManager } from "@/lib/sounds";

/**
 * Hook to unlock Web Audio API on iOS Safari.
 * Must be triggered by user interaction (touch/click).
 * Add this hook to a high-level component like layout or game page.
 */
export function useSoundUnlock() {
  useEffect(() => {
    const handleInteraction = () => {
      soundManager.unlock();
      document.removeEventListener("touchstart", handleInteraction);
      document.removeEventListener("click", handleInteraction);
    };

    document.addEventListener("touchstart", handleInteraction, { once: true });
    document.addEventListener("click", handleInteraction, { once: true });

    return () => {
      document.removeEventListener("touchstart", handleInteraction);
      document.removeEventListener("click", handleInteraction);
    };
  }, []);
}

