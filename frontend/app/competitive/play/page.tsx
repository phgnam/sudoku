"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMatchStore } from "@/store/match";
import { useGameStore } from "@/store/game";
import { useUIStore } from "@/store/ui";
import { useMatchSocket } from "@/hooks/useMatchSocket";
import { useAuthStore } from "@/store/auth";

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
import { SudokuGrid } from "@/components/game/SudokuGrid";
import { NumberPad } from "@/components/shared";
import {
  CompetitiveTimer,
  OpponentProgressBar,
  MatchResultModal,
} from "@/components/multiplayer";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { ArrowLeft, Eye, Trash2 } from "lucide-react";

// Check if placing a number causes a conflict
const checkConflict = (
  grid: number[][],
  row: number,
  col: number,
  num: number,
): boolean => {
  if (num === 0) return false;
  for (let x = 0; x < 9; x++) {
    if (x !== col && grid[row][x] === num) return true;
  }
  for (let x = 0; x < 9; x++) {
    if (x !== row && grid[x][col] === num) return true;
  }
  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const r = startRow + i;
      const c = startCol + j;
      if ((r !== row || c !== col) && grid[r][c] === num) return true;
    }
  }
  return false;
};

export default function CompetitivePlayPage() {
  const router = useRouter();
  const t = useTranslations("competitive");
  const tGame = useTranslations("game");
  const { colorMode } = useUIStore();
  const [mounted, setMounted] = useState(false);

  const {
    status,
    matchId,
    puzzle,
    opponent,
    opponentFilledCells,
    opponentFilledCount,
    startTime,
    maxDuration,
    remainingTime,
    spectatorCount,
    result,
    resultReason,
    ratingChange,
    newRating,
    submitRejected,
    clearSubmitRejected,
    rematchStatus,
    opponentDisconnected,
    opponentDisconnectReason,
  } = useMatchStore();

  const { currentState, initialState, notes, notesMode, updateState } =
    useGameStore();
  const {
    sendMove,
    submitSolution,
    syncMatch,
    requestRematch,
    declineRematch,
    leaveMatch,
    surrender,
  } = useMatchSocket();

  const [selectedCell, setSelectedCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showSurrenderConfirm, setShowSurrenderConfirm] = useState(false);

  // Countdown timer for opponent disconnect
  const [disconnectCountdown, setDisconnectCountdown] = useState<number>(30);

  // Track if we're waiting for rejoin
  const [waitingForRejoin, setWaitingForRejoin] = useState(true);
  const rejoinTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { token } = useAuthStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Countdown effect for opponent disconnect
  useEffect(() => {
    if (!opponentDisconnected) {
      // Reset countdown when opponent reconnects or is not disconnected
      setDisconnectCountdown(30);
      return;
    }

    // Start countdown from 30
    setDisconnectCountdown(30);

    const interval = setInterval(() => {
      setDisconnectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [opponentDisconnected]);

  // Give some time for socket to reconnect and receive rejoin event
  useEffect(() => {
    if (token && status === "idle") {
      // Wait for potential rejoin event from server
      rejoinTimeoutRef.current = setTimeout(() => {
        setWaitingForRejoin(false);
      }, 2000); // Wait 2 seconds for rejoin event
    } else if (status === "playing" || status === "finished") {
      // Already in a match, no need to wait
      setWaitingForRejoin(false);
    }

    return () => {
      if (rejoinTimeoutRef.current) {
        clearTimeout(rejoinTimeoutRef.current);
      }
    };
  }, [token, status]);

  const isDark = mounted && colorMode === "dark";

  const colors = {
    bg: isDark
      ? "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)"
      : "linear-gradient(135deg, #f8fafc 0%, #eef2ff 50%, #e0e7ff 100%)",
    cardBg: isDark ? "#1e293b" : "white",
    cardBorder: isDark ? "#4f46e5" : "#c7d2fe",
    title: isDark ? "#e0e7ff" : "#1e1b4b",
    text: isDark ? "#94a3b8" : "#64748b",
    accent: "#f97316",
    surfaceBg: isDark ? "#0f172a" : "#f1f5f9",
  };

  // Redirect to lobby if not in a playing state (only after waiting for rejoin)
  useEffect(() => {
    if (!waitingForRejoin && status !== "playing" && status !== "finished") {
      // Clear localStorage since match is no longer valid
      clearActiveMatch();
      router.push("/competitive");
    }
  }, [status, router, waitingForRejoin]);

  // Show result modal when game ends
  useEffect(() => {
    if (status === "finished" && result) {
      setShowResult(true);
    }
  }, [status, result]);

  // Auto-clear submit rejected toast after 3 seconds
  useEffect(() => {
    if (submitRejected) {
      const timer = setTimeout(() => {
        clearSubmitRejected();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [submitRejected, clearSubmitRejected]);

  // Sync match state on mount
  useEffect(() => {
    if (matchId && status === "playing") {
      syncMatch();
    }
  }, [matchId, status, syncMatch]);

  // Calculate total empty cells (cells to fill)
  const totalEmpty = useMemo(() => {
    if (!puzzle) return 0;
    let count = 0;
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (puzzle[row][col] === 0) count++;
      }
    }
    return count;
  }, [puzzle]);

  // Calculate number counts for each digit 1-9
  const numberCounts = useMemo((): Record<number, number> => {
    const counts: Record<number, number> = {};
    for (let num = 1; num <= 9; num++) {
      counts[num] = 0;
    }
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const value = currentState[row][col];
        if (value >= 1 && value <= 9) {
          counts[value]++;
        }
      }
    }
    return counts;
  }, [currentState]);

  const disabledNumbers = useMemo(() => {
    return Object.entries(numberCounts)
      .filter(([_, count]) => count >= 9)
      .map(([num]) => parseInt(num));
  }, [numberCounts]);

  // Calculate my filled cells count
  const myFilledCount = useMemo(() => {
    if (!puzzle) return 0;
    let count = 0;
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (puzzle[row][col] === 0 && currentState[row][col] !== 0) {
          count++;
        }
      }
    }
    return count;
  }, [puzzle, currentState]);

  // Check if puzzle is complete
  const isComplete = useMemo(() => {
    if (!puzzle) return false;
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (currentState[row][col] === 0) return false;
        if (checkConflict(currentState, row, col, currentState[row][col]))
          return false;
      }
    }
    return true;
  }, [puzzle, currentState]);

  // Auto-submit when complete
  useEffect(() => {
    if (isComplete && status === "playing") {
      submitSolution();
    }
  }, [isComplete, status, submitSolution]);

  const handleCellSelect = useCallback((row: number, col: number) => {
    setSelectedCell({ row, col });
  }, []);

  const handleNumberSelect = useCallback(
    (number: number) => {
      if (!selectedCell || !puzzle || status !== "playing") return;

      const { row, col } = selectedCell;

      // Can't modify initial cells
      if (initialState[row][col] !== 0) return;

      // Update local state
      const newState = currentState.map((r, i) =>
        i === row ? r.map((c, j) => (j === col ? number : c)) : r,
      );
      updateState(newState);

      // Send move to server (including erases) so opponent progress and rejoin state stay consistent
      sendMove(row, col, number);
    },
    [
      selectedCell,
      puzzle,
      status,
      initialState,
      currentState,
      updateState,
      sendMove,
    ],
  );

  const handleErase = useCallback(() => {
    if (!selectedCell) return;
    handleNumberSelect(0);
  }, [selectedCell, handleNumberSelect]);

  // Keyboard input handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (status !== "playing") return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key >= "1" && e.key <= "9") {
        const num = parseInt(e.key);
        if (!disabledNumbers.includes(num)) {
          handleNumberSelect(num);
        }
        return;
      }

      if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
        handleErase();
        return;
      }

      if (
        selectedCell &&
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)
      ) {
        e.preventDefault();
        let newRow = selectedCell.row;
        let newCol = selectedCell.col;
        switch (e.key) {
          case "ArrowUp":
            newRow = Math.max(0, selectedCell.row - 1);
            break;
          case "ArrowDown":
            newRow = Math.min(8, selectedCell.row + 1);
            break;
          case "ArrowLeft":
            newCol = Math.max(0, selectedCell.col - 1);
            break;
          case "ArrowRight":
            newCol = Math.min(8, selectedCell.col + 1);
            break;
        }
        setSelectedCell({ row: newRow, col: newCol });
        return;
      }

      if (e.key === "Escape") {
        setSelectedCell(null);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedCell, status, disabledNumbers, handleNumberSelect, handleErase]);

  if (waitingForRejoin || (status !== "playing" && status !== "finished")) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: colors.bg,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
        }}
      >
        <div
          style={{
            width: "48px",
            height: "48px",
            border: "4px solid #4f46e5",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
          }}
        />
        {waitingForRejoin && (
          <p style={{ color: colors.text, fontSize: "14px" }}>
            {t("game.reconnecting") || "Đang kết nối lại..."}
          </p>
        )}
      </div>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: colors.bg,
        padding: "40px 24px",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Theme Switcher */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: "24px",
          }}
        >
          <ThemeSwitcher />
        </div>

        {/* Header with Timer and Progress */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "20px",
            marginBottom: "32px",
            padding: "20px 28px",
            backgroundColor: colors.cardBg,
            borderRadius: "20px",
            border: `2px solid ${colors.cardBorder}`,
            boxShadow: isDark
              ? "0 8px 32px rgba(0, 0, 0, 0.4)"
              : "0 8px 32px rgba(79, 70, 229, 0.12)",
          }}
        >
          <CompetitiveTimer
            startTime={startTime}
            maxDuration={maxDuration}
            remainingTime={remainingTime}
          />

          {/* Spectator Count */}
          {spectatorCount > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 16px",
                backgroundColor: isDark
                  ? "rgba(139, 92, 246, 0.2)"
                  : "rgba(139, 92, 246, 0.1)",
                borderRadius: "12px",
                border: "1px solid #8b5cf6",
              }}
            >
              <Eye
                style={{ width: "18px", height: "18px", color: "#8b5cf6" }}
              />
              <span
                style={{
                  color: isDark ? "#c4b5fd" : "#7c3aed",
                  fontWeight: 500,
                  fontSize: "14px",
                }}
              >
                {spectatorCount} {t("game.spectators")}
              </span>
            </div>
          )}

          {opponent && (
            <OpponentProgressBar
              opponentName={opponent.name}
              filledCount={opponentFilledCount}
              totalEmpty={totalEmpty}
            />
          )}
        </div>

        {/* My Progress */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              padding: "10px 28px",
              backgroundColor: isDark ? "rgba(59, 130, 246, 0.2)" : "#dbeafe",
              borderRadius: "12px",
              border: "2px solid #3b82f6",
            }}
          >
            <span
              style={{
                fontWeight: 600,
                color: isDark ? "#93c5fd" : "#1d4ed8",
                fontSize: "14px",
              }}
            >
              {t("game.yourProgress")}: {myFilledCount}/{totalEmpty} (
              {totalEmpty > 0
                ? Math.round((myFilledCount / totalEmpty) * 100)
                : 0}
              %)
            </span>
          </div>
        </div>

        {/* Opponent Disconnected Toast */}
        {opponentDisconnected && (
          <div
            style={{
              position: "fixed",
              top: "20px",
              left: "50%",
              transform: "translateX(-50%)",
              backgroundColor: isDark ? "rgba(120, 53, 15, 0.9)" : "#fef3c7",
              border: "2px solid #f59e0b",
              borderRadius: "12px",
              padding: "12px 24px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
              zIndex: 100,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "20px" }}>⚠️</span>
              <span
                style={{
                  fontWeight: 600,
                  color: isDark ? "#fcd34d" : "#92400e",
                }}
              >
                {t("game.opponentDisconnected", {
                  seconds: disconnectCountdown,
                })}
              </span>
            </div>
          </div>
        )}

        {/* Submit Rejected Toast */}
        {submitRejected && (
          <div
            style={{
              position: "fixed",
              top: opponentDisconnected ? "80px" : "20px",
              left: "50%",
              transform: "translateX(-50%)",
              backgroundColor: isDark ? "rgba(127, 29, 29, 0.9)" : "#fef2f2",
              border: "2px solid #ef4444",
              borderRadius: "12px",
              padding: "12px 24px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
              zIndex: 100,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "20px" }}>❌</span>
              <span
                style={{
                  fontWeight: 600,
                  color: isDark ? "#fca5a5" : "#dc2626",
                }}
              >
                {t("game.submitRejected")}
              </span>
            </div>
          </div>
        )}

        {/* Game Area */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            gap: "48px",
            flexWrap: "wrap",
          }}
        >
          {/* Sudoku Grid */}
          <SudokuGrid
            onCellSelect={handleCellSelect}
            selectedCell={selectedCell}
            competitive
            opponentCells={opponentFilledCells}
          />

          {/* Controls Panel */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "24px",
              padding: "32px",
              backgroundColor: colors.cardBg,
              borderRadius: "20px",
              border: `2px solid ${colors.cardBorder}`,
              boxShadow: isDark
                ? "0 8px 32px rgba(0, 0, 0, 0.4)"
                : "0 8px 32px rgba(79, 70, 229, 0.12)",
              minWidth: "240px",
            }}
          >
            <NumberPad
              maxNumber={9}
              showCounts={true}
              onNumberSelect={handleNumberSelect}
              disabled={!selectedCell || status !== "playing"}
              disabledNumbers={disabledNumbers}
              numberCounts={numberCounts}
            />

            {/* Erase Button */}
            <button
              onClick={handleErase}
              disabled={!selectedCell || status !== "playing"}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "12px",
                backgroundColor: isDark ? "rgba(127, 29, 29, 0.3)" : "#fee2e2",
                color: isDark ? "#fca5a5" : "#dc2626",
                fontWeight: 600,
                border: `2px solid ${isDark ? "#ef4444" : "#fecaca"}`,
                cursor: selectedCell ? "pointer" : "not-allowed",
                opacity: selectedCell ? 1 : 0.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <Trash2 style={{ width: "18px", height: "18px" }} />{" "}
              {tGame("controls.erase")}
            </button>
          </div>
        </div>

        {/* Back to lobby link */}
        <div style={{ textAlign: "center", marginTop: "40px" }}>
          <button
            onClick={() => {
              if (status === "playing") {
                setShowSurrenderConfirm(true);
              } else {
                leaveMatch();
                router.push("/competitive");
              }
            }}
            style={{
              padding: "14px 28px",
              backgroundColor: isDark ? "#374151" : "#e5e7eb",
              color: colors.title,
              borderRadius: "14px",
              border: "none",
              cursor: "pointer",
              fontSize: "15px",
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              transition: "all 0.2s ease",
            }}
          >
            <ArrowLeft style={{ width: "18px", height: "18px" }} />
            {status === "playing" ? t("surrender") : t("backToLobby")}
          </button>
        </div>
      </div>

      {/* Surrender Confirmation Modal */}
      {showSurrenderConfirm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: isDark ? "#1f2937" : "#ffffff",
              padding: "32px",
              borderRadius: "16px",
              maxWidth: "400px",
              textAlign: "center",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
            }}
          >
            <h3
              style={{
                color: "#ef4444",
                marginBottom: "16px",
                fontSize: "20px",
              }}
            >
              {t("surrenderTitle") || "Surrender?"}
            </h3>
            <p
              style={{
                color: isDark ? "#9ca3af" : "#6b7280",
                marginBottom: "24px",
                lineHeight: 1.6,
              }}
            >
              {t("surrenderWarning") ||
                "You will lose this match and your ELO rating will decrease. Are you sure?"}
            </p>
            <div
              style={{ display: "flex", gap: "12px", justifyContent: "center" }}
            >
              <button
                onClick={() => setShowSurrenderConfirm(false)}
                style={{
                  padding: "12px 24px",
                  backgroundColor: isDark ? "#374151" : "#e5e7eb",
                  color: colors.title,
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                {t("cancel") || "Cancel"}
              </button>
              <button
                onClick={() => {
                  surrender();
                  router.push("/competitive");
                }}
                style={{
                  padding: "12px 24px",
                  backgroundColor: "#ef4444",
                  color: "#ffffff",
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                {t("confirmSurrender") || "Yes, Surrender"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result Modal */}
      {showResult && result && (
        <MatchResultModal
          result={result}
          reason={resultReason || ""}
          opponentName={opponent?.name}
          ratingChange={ratingChange}
          newRating={newRating}
          rematchStatus={rematchStatus}
          onRequestRematch={requestRematch}
          onAcceptRematch={requestRematch}
          onDeclineRematch={declineRematch}
          onClose={() => setShowResult(false)}
        />
      )}
    </main>
  );
}
