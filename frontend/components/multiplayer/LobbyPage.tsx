"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMatchStore } from "@/store/match";
import { useMatchSocket } from "@/hooks/useMatchSocket";
import { LobbyHome } from "./LobbyHome";
import { WaitingRoom } from "./WaitingRoom";

// Key for storing active match info in localStorage
const ACTIVE_MATCH_KEY = "sudoku_active_match";

// Helper to clear active match from localStorage
function clearActiveMatch() {
  try {
    localStorage.removeItem(ACTIVE_MATCH_KEY);
  } catch (e) {
    console.error("Failed to clear active match:", e);
  }
}

export function LobbyPage() {
  const router = useRouter();
  const {
    matchId,
    status,
    isHost,
    difficulty,
    opponent,
    myReady,
    opponentReady,
    error,
  } = useMatchStore();

  const { createMatch, joinMatch, setReady, setUnready, leaveMatch } =
    useMatchSocket();

  // Redirect to game when match starts
  useEffect(() => {
    if (status === "playing") {
      router.push("/competitive/play");
    }
  }, [status, router]);

  // Show loading states
  const isLoading = status === "creating" || status === "joining";

  // Idle state - show home
  if (status === "idle" || status === "creating" || status === "joining") {
    return (
      <LobbyHome
        onCreateRoom={createMatch}
        onJoinRoom={joinMatch}
        isLoading={isLoading}
        error={error}
      />
    );
  }

  // Waiting/Joined state - show waiting room
  if (status === "waiting" || status === "joined" || status === "ready") {
    return (
      <WaitingRoom
        matchId={matchId!}
        isHost={isHost}
        difficulty={difficulty}
        opponent={opponent}
        myReady={myReady}
        opponentReady={opponentReady}
        onReady={setReady}
        onUnready={setUnready}
        onLeave={leaveMatch}
        error={error}
      />
    );
  }

  // Finished state - show result (or redirect)
  if (status === "finished") {
    const handleReset = () => {
      clearActiveMatch();
      useMatchStore.getState().reset();
    };

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-4">
        <h2 className="text-2xl font-bold">Match Finished</h2>
        <button
          onClick={handleReset}
          className="py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold"
        >
          Back to Lobby
        </button>
      </div>
    );
  }

  // Default fallback
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
    </div>
  );
}
