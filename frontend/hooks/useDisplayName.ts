import { useCallback } from "react";
import { useAuthStore } from "@/store/auth";

/**
 * Hook to get display name for current user.
 * Returns: username > email prefix > undefined (for guests)
 */
export function useDisplayName() {
  // Use selector for stable reference - only re-render when username/email changes
  const username = useAuthStore((state) => state.user?.username);
  const email = useAuthStore((state) => state.user?.email);

  return useCallback(() => {
    const trimmedUsername = username?.trim();
    if (trimmedUsername) return trimmedUsername;

    const trimmedEmail = email?.trim();
    if (trimmedEmail?.includes("@")) return trimmedEmail.split("@")[0];

    return undefined;
  }, [username, email]);
}

