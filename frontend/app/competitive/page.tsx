"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { useMatchStore } from "@/store/match";
import { useMatchSocket } from "@/hooks/useMatchSocket";
import { LobbyPage } from "@/components/multiplayer";

// Key for storing active match info in localStorage
const ACTIVE_MATCH_KEY = "sudoku_active_match";

export default function CompetitivePage() {
  const router = useRouter();
  const { token, _hasHydrated } = useAuthStore();
  const { status, matchId } = useMatchStore();
  const isAuthenticated = _hasHydrated && !!token;
  const isLoading = !_hasHydrated;

  // Initialize socket connection to receive rejoin event
  useMatchSocket();

  // Track if we're checking for active match
  const [checkingActiveMatch, setCheckingActiveMatch] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/login?redirect=/competitive");
    }
  }, [isAuthenticated, isLoading, router]);

  // Check for active match in localStorage and wait for potential rejoin
  useEffect(() => {
    if (!isAuthenticated || isLoading) return;

    // Check if there's a saved match in localStorage
    try {
      const savedMatch = localStorage.getItem(ACTIVE_MATCH_KEY);
      if (savedMatch) {
        // There's a saved match, wait for rejoin event from server
        const timeout = setTimeout(() => {
          setCheckingActiveMatch(false);
        }, 2500); // Wait 2.5 seconds for rejoin event

        return () => clearTimeout(timeout);
      } else {
        // No saved match, no need to wait
        setCheckingActiveMatch(false);
      }
    } catch {
      setCheckingActiveMatch(false);
    }
  }, [isAuthenticated, isLoading]);

  // Redirect to play page if already in a playing match
  useEffect(() => {
    if (status === "playing") {
      router.push("/competitive/play");
    }
  }, [status, router]);

  if (isLoading || checkingActiveMatch) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        {checkingActiveMatch && (
          <p className="text-gray-500 text-sm">Đang kiểm tra trận đấu...</p>
        )}
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <LobbyPage />
    </main>
  );
}
