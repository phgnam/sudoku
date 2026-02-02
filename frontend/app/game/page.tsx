"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useGameStore, GameStatus } from "@/store/game";
import { useAuthStore } from "@/store/auth";
import { useUIStore } from "@/store/ui";
import { useGameSocket } from "@/hooks/useGameSocket";
import { SudokuGrid } from "@/components/game/SudokuGrid";
import { NumberPad, Timer } from "@/components/shared";
import { GameControls } from "@/components/game/GameControls";
import { MutationTimer } from "@/components/game/MutationTimer";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { EnhancedModal } from "@/components/ui/EnhancedModal";
import { Tutorial } from "@/components/game/Tutorial";
import { DebugPanel } from "@/components/game/DebugPanel";
import { GAME_CONFIG, GAME_MODES, MUTATION_CONFIG } from "@/lib/constants";
import { api, fetchApi } from "@/lib/api";
import { initDevMode } from "@/lib/dev-mode";
import { useMutationSocket } from "@/hooks/useMutationSocket";

// Game API response type
interface GameApiResponse {
  id: string;
  difficulty: string;
  currentState: number[][];
  puzzle?: { id: string; solution: number[][] };
  moveHistory?: any[];
  hintsUsed?: number;
  mistakes?: number;
  timeElapsed?: number;
  status?: GameStatus;
}

// Helper to convert API response to game state
const mapGameResponseToState = (
  game: GameApiResponse & { gameMode?: string },
) => ({
  id: game.id,
  difficulty: game.difficulty,
  currentState: game.currentState,
  initialState: game.currentState,
  solution: game.puzzle?.solution || null,
  moveHistory: game.moveHistory || [],
  hintsUsed: game.hintsUsed || 0,
  mistakes: game.mistakes || 0,
  timeElapsed: game.timeElapsed || 0,
  status: game.status || GameStatus.ACTIVE,
  wrongCells: [] as Array<{ row: number; col: number }>,
  hintedCells: [] as Array<{ row: number; col: number }>,
  gameMode: (game.gameMode as "classic" | "mutating") || "classic",
});

// Check if placing a number causes a conflict (same logic as backend isValidMove)
// Returns true if there's a conflict (number is wrong), false if valid
const checkConflict = (
  grid: number[][],
  row: number,
  col: number,
  num: number,
): boolean => {
  if (num === 0) return false;

  // Check row for duplicates
  for (let x = 0; x < 9; x++) {
    if (x !== col && grid[row][x] === num) return true;
  }

  // Check column for duplicates
  for (let x = 0; x < 9; x++) {
    if (x !== row && grid[x][col] === num) return true;
  }

  // Check 3x3 box for duplicates
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

export default function GamePage() {
  const router = useRouter();
  const t = useTranslations();
  const { token, isAuthenticated, _hasHydrated: authHydrated } = useAuthStore();
  const { showTutorial, setShowTutorial, selectedDifficulty } = useUIStore();
  const {
    id: gameId,
    difficulty,
    currentState,
    initialState,
    moveHistory,
    hintsUsed,
    hintedCells,
    mistakes,
    status,
    notesMode,
    notes,
    solution,
    setGame,
    updateState,
    toggleNotesMode,
    setNote,
    clearNotes,
    addHintedCell,
    isHintedCell,
    addWrongCell,
    removeWrongCell,
    // Mutation mode state
    gameMode,
    mutationCount,
    nextMutationAt,
    lastMutatedCell,
    mutationAnimating,
    setGameMode,
  } = useGameStore();

  const { makeMove, undoMove, requestHint, applyHintToBackend } =
    useGameSocket();

  // Initialize mutation socket events
  useMutationSocket();

  const [selectedCell, setSelectedCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [highlightedCells, setHighlightedCells] = useState<
    Array<{ row: number; col: number }>
  >([]);
  const [errorCells, setErrorCells] = useState<
    Array<{ row: number; col: number }>
  >([]);

  // Hint step-by-step state
  interface HintStep {
    type: "row" | "col" | "box" | "result";
    values: number[];
    cells: Array<{ row: number; col: number }>;
    message: string;
  }

  const [hintData, setHintData] = useState<{
    row: number;
    col: number;
    value: number;
    steps: HintStep[];
    currentStep: number;
  } | null>(null);

  // Legacy hint cell for simple reveal
  const [hintCell, setHintCell] = useState<{
    row: number;
    col: number;
    value?: number;
    phase: "highlight" | "reveal";
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [showNewGameConfirm, setShowNewGameConfirm] = useState(false);
  const isCreatingGameRef = useRef(false);
  const hasHydrated = useGameStore((state) => state._hasHydrated);

  // Initialize dev mode for console debugging
  useEffect(() => {
    initDevMode();
  }, []);

  // Initialize game - load from localStorage or create new
  useEffect(() => {
    // Don't run until both Zustand stores have hydrated from localStorage
    if (!hasHydrated || !authHydrated) return;

    const initGame = async () => {
      let currentToken = token;

      if (!currentToken) {
        // Generate anonymous token
        try {
          const { accessToken, sessionId } = await fetchApi<{
            accessToken: string;
            sessionId: string;
          }>(api.auth.anonymous(), {
            method: "POST",
          });
          useAuthStore
            .getState()
            .setAuth(
              { id: sessionId, isAnonymous: true },
              accessToken,
              sessionId,
            );
          currentToken = accessToken;
        } catch (error) {
          console.error("Failed to get anonymous token:", error);
          setIsLoading(false);
          return;
        }
      }

      // Check if there's a saved game in localStorage (via zustand persist)
      // If gameId exists in store, the game state is already loaded
      if (!gameId && !isCreatingGameRef.current) {
        // Prevent duplicate game creation (React StrictMode or race conditions)
        isCreatingGameRef.current = true;

        // Create new game with selected difficulty from UI store
        try {
          const response = await fetch(api.games.create(), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${currentToken}`,
            },
            body: JSON.stringify({
              difficulty: selectedDifficulty,
              gameMode: useGameStore.getState().gameMode || "classic",
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error("Failed to create game:", response.status, errorData);
            isCreatingGameRef.current = false;
            setIsLoading(false);
            return;
          }

          const game: GameApiResponse = await response.json();
          setGame(mapGameResponseToState(game));
        } catch (error) {
          console.error("Failed to create game:", error);
          isCreatingGameRef.current = false; // Reset flag on error to allow retry
        }
      } else {
        // Game was restored from localStorage
        console.log("Game restored from localStorage:", gameId);

        // Recalculate wrongCells based on conflicts (not solution)
        // This fixes any stale wrongCells from old logic
        const restoredState = useGameStore.getState().currentState;
        const newWrongCells: Array<{ row: number; col: number }> = [];
        for (let row = 0; row < 9; row++) {
          for (let col = 0; col < 9; col++) {
            const value = restoredState[row][col];
            if (value !== 0 && checkConflict(restoredState, row, col, value)) {
              newWrongCells.push({ row, col });
            }
          }
        }
        useGameStore.setState({ wrongCells: newWrongCells });
      }

      setIsLoading(false);
    };

    initGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, authHydrated, token, gameId, selectedDifficulty]);

  // Recalculate wrongCells whenever currentState changes (ensures consistency)
  useEffect(() => {
    if (!hasHydrated) return;

    const newWrongCells: Array<{ row: number; col: number }> = [];
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        const value = currentState[row][col];
        if (value !== 0 && checkConflict(currentState, row, col, value)) {
          newWrongCells.push({ row, col });
        }
      }
    }

    // Only update if different to avoid infinite loop
    const currentWrongCells = useGameStore.getState().wrongCells;
    const isDifferent =
      newWrongCells.length !== currentWrongCells.length ||
      newWrongCells.some(
        (c, i) =>
          !currentWrongCells[i] ||
          c.row !== currentWrongCells[i].row ||
          c.col !== currentWrongCells[i].col,
      );

    if (isDifferent) {
      useGameStore.setState({ wrongCells: newWrongCells });
    }
  }, [currentState, hasHydrated]);

  // #19: Clear selected cell if it was mutated
  useEffect(() => {
    if (lastMutatedCell && selectedCell) {
      if (
        lastMutatedCell.row === selectedCell.row &&
        lastMutatedCell.col === selectedCell.col
      ) {
        setSelectedCell(null);
      }
    }
  }, [lastMutatedCell, selectedCell]);

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
      .map(([num, _]) => parseInt(num));
  }, [numberCounts]);

  // Calculate if undo is possible (has undoable moves that are not on hinted cells)
  const canUndo = useMemo(() => {
    if (status !== GameStatus.ACTIVE) return false;
    if (moveHistory.length === 0) return false;

    // Check if there's at least one move that is not on a hinted cell
    for (let i = moveHistory.length - 1; i >= 0; i--) {
      const move = moveHistory[i];
      const isHinted = hintedCells.some(
        (c) => c.row === move.row && c.col === move.col,
      );
      if (!isHinted) {
        return true;
      }
    }
    return false;
  }, [moveHistory, hintedCells, status]);

  // Calculate if erase is possible for the selected cell
  const canErase = useMemo(() => {
    if (status !== GameStatus.ACTIVE) return false;
    if (!selectedCell) return false;

    const { row, col } = selectedCell;

    // Can't erase hinted cells
    if (hintedCells.some((c) => c.row === row && c.col === col)) {
      return false;
    }

    // Can't erase initial/puzzle cells
    if (initialState[row][col] !== 0) {
      return false;
    }

    // In notes mode, can erase if there are notes
    if (notesMode) {
      return notes[row][col].length > 0;
    }

    // Can erase if cell has a value
    return currentState[row][col] !== 0;
  }, [
    selectedCell,
    currentState,
    initialState,
    hintedCells,
    notes,
    notesMode,
    status,
  ]);

  // Keyboard input handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if game is not active
      if (status !== GameStatus.ACTIVE) return;

      // Ignore if typing in an input field
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Number keys 1-9
      if (e.key >= "1" && e.key <= "9") {
        const num = parseInt(e.key);
        // Check if number is not disabled (already has 9 occurrences)
        if (!disabledNumbers.includes(num)) {
          handleNumberSelect(num);
        }
        return;
      }

      // Backspace or Delete to erase
      if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
        handleErase();
        return;
      }

      // Arrow keys to navigate cells
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

      // N key to toggle notes mode
      if (e.key === "n" || e.key === "N") {
        toggleNotesMode();
        return;
      }

      // Z key for undo (Ctrl+Z or just Z)
      if (e.key === "z" || e.key === "Z") {
        handleUndo();
        return;
      }

      // Escape to deselect
      if (e.key === "Escape") {
        setSelectedCell(null);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedCell, status, notesMode, disabledNumbers]);

  const handleCellSelect = (row: number, col: number) => {
    setSelectedCell({ row, col });
    setErrorCells([]); // Clear errors on new selection
  };

  const handleNumberSelect = (number: number) => {
    if (!selectedCell || !gameId) return;

    const { row, col } = selectedCell;

    // Prevent erasing cells that were filled by hints
    if (number === 0 && isHintedCell(row, col)) {
      return; // Don't allow erase on hinted cells
    }

    // If in notes mode, toggle the note instead of placing the number
    if (notesMode) {
      setNote(row, col, number);
      return;
    }

    // Clear notes for this cell when placing a number
    clearNotes(row, col);

    // Get the latest state from store to avoid stale closure issue
    const latestState = useGameStore.getState().currentState;
    const latestSolution = useGameStore.getState().solution;

    // Check if the number causes a conflict (same logic as backend)
    // This matches when mistakes increase
    if (number !== 0) {
      const hasConflict = checkConflict(latestState, row, col, number);
      if (hasConflict) {
        addWrongCell(row, col);
      } else {
        removeWrongCell(row, col);
      }
    } else {
      // Remove from wrong cells when erasing
      removeWrongCell(row, col);
    }

    const newState = latestState.map((r: number[], i: number) =>
      i === row ? r.map((c: number, j: number) => (j === col ? number : c)) : r,
    );
    updateState(newState);

    // Send move to backend
    makeMove(row, col, number);

    // Keep selection to allow arrow key navigation after entering a number
  };

  const handleErase = () => {
    if (!selectedCell) return;

    const { row, col } = selectedCell;

    // Prevent erasing cells that were filled by hints
    if (isHintedCell(row, col)) {
      return; // Don't allow erase on hinted cells
    }

    // If in notes mode, clear all notes for this cell
    if (notesMode) {
      clearNotes(row, col);
      return;
    }

    // Remove from wrong cells when erasing
    removeWrongCell(row, col);

    // Otherwise erase the cell value
    handleNumberSelect(0);
  };

  const handleToggleNotes = () => {
    toggleNotesMode();
  };

  const handleUndo = () => {
    undoMove();
  };

  const handleHint = async () => {
    // Don't allow hint if one is already in progress
    if (hintCell || hintData) return;

    const hint = await requestHint();

    if (hint) {
      // Handle different hint types
      if (hint.type === "reveal_cell") {
        const { row, col, value } = hint.data;
        if (row !== undefined && col !== undefined && value !== undefined) {
          setHintCell({ row, col, value, phase: "highlight" });
          clearNotes(row, col);

          setTimeout(() => {
            setHintCell({ row, col, value, phase: "reveal" });
            const latestState = useGameStore.getState().currentState;
            const newState = latestState.map((r, i) =>
              i === row ? r.map((c, j) => (j === col ? value : c)) : r,
            );
            updateState(newState);
            // Mark this cell as hinted (cannot be erased or undone)
            addHintedCell(row, col);
            // Save hint to backend (persisted, undo won't affect it)
            applyHintToBackend(row, col, value);
          }, 800);

          setTimeout(() => setHintCell(null), 2800);
        }
      } else if (hint.type === "show_conflicts") {
        if (hint.data.conflicts) {
          setErrorCells(hint.data.conflicts);
          setTimeout(() => setErrorCells([]), 3000);
        }
      } else if (hint.type === "highlight_suggestion") {
        const { row, col, possibleValue, steps } = hint.data;
        if (
          row !== undefined &&
          col !== undefined &&
          possibleValue !== undefined &&
          steps
        ) {
          // Build step-by-step explanation
          const hintSteps: Array<{
            type: "row" | "col" | "box" | "result";
            values: number[];
            cells: Array<{ row: number; col: number }>;
            message: string;
          }> = [];

          // Step 1: Row check
          if (steps.row.values.length > 0) {
            hintSteps.push({
              type: "row",
              values: steps.row.values,
              cells: steps.row.cells,
              message: t("game.hint.rowHas", {
                row: row + 1,
                values: steps.row.values.join(", "),
              }),
            });
          }

          // Step 2: Column check
          if (steps.col.values.length > 0) {
            hintSteps.push({
              type: "col",
              values: steps.col.values,
              cells: steps.col.cells,
              message: t("game.hint.colHas", {
                col: col + 1,
                values: steps.col.values.join(", "),
              }),
            });
          }

          // Step 3: Box check
          if (steps.box.values.length > 0) {
            const boxRow = Math.floor(row / 3) + 1;
            const boxCol = Math.floor(col / 3) + 1;
            hintSteps.push({
              type: "box",
              values: steps.box.values,
              cells: steps.box.cells,
              message: t("game.hint.boxHas", {
                boxRow,
                boxCol,
                values: steps.box.values.join(", "),
              }),
            });
          }

          // Step 4: Result
          const allUsedNumbers = [
            ...new Set([
              ...steps.row.values,
              ...steps.col.values,
              ...steps.box.values,
            ]),
          ].sort((a, b) => a - b);

          hintSteps.push({
            type: "result",
            values: [possibleValue],
            cells: [{ row, col }],
            message: t("game.hint.eliminate", {
              values: allUsedNumbers.join(", "),
              value: possibleValue,
            }),
          });

          setHintData({
            row,
            col,
            value: possibleValue,
            steps: hintSteps,
            currentStep: 0,
          });
        }
      } else if (hint.type === "puzzle_complete") {
        // Puzzle is already solved - show message to user
        console.log("Puzzle already complete:", hint.data?.message);
        // Could show a toast notification here if desired
      }
    }
  };

  // Handle next step in hint explanation
  const handleHintNextStep = () => {
    if (!hintData) return;

    const nextStep = hintData.currentStep + 1;

    if (nextStep >= hintData.steps.length) {
      // Final step - fill the cell
      clearNotes(hintData.row, hintData.col);
      const latestState = useGameStore.getState().currentState;
      const newState = latestState.map((r, i) =>
        i === hintData.row
          ? r.map((c, j) => (j === hintData.col ? hintData.value : c))
          : r,
      );
      updateState(newState);
      // Mark this cell as hinted (cannot be erased or undone)
      addHintedCell(hintData.row, hintData.col);
      // Save hint to backend (persisted, undo won't affect it)
      applyHintToBackend(hintData.row, hintData.col, hintData.value);
      setHintData(null);
    } else {
      setHintData({ ...hintData, currentStep: nextStep });
    }
  };

  // Cancel hint
  const handleHintCancel = () => {
    setHintData(null);
  };

  const handleNewGame = async () => {
    try {
      // Clear current game state
      useGameStore.getState().clearGame();

      // Create new game with selected difficulty
      const game = await fetchApi<GameApiResponse>(api.games.create(), {
        method: "POST",
        body: JSON.stringify({ difficulty: selectedDifficulty }),
      });

      setGame(mapGameResponseToState(game));

      // Clear selections
      setSelectedCell(null);
      setHighlightedCells([]);
      setErrorCells([]);
    } catch (error) {
      console.error("Failed to create new game:", error);
    }
  };

  const handleNewGameClick = () => {
    setShowNewGameConfirm(true);
  };

  const handleConfirmNewGame = () => {
    setShowNewGameConfirm(false);
    handleNewGame();
  };

  const handleCancelNewGame = () => {
    setShowNewGameConfirm(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-clean-light dark:bg-clean-dark">
        <div className="text-2xl font-semibold text-slate-800 dark:text-white">
          {t("game.loadingGame")}
        </div>
      </div>
    );
  }

  // Difficulty options
  const difficultyOptions = [
    { value: "easy", label: t("home.difficulty.easy"), color: "#10b981" },
    { value: "normal", label: t("home.difficulty.normal"), color: "#f59e0b" },
    { value: "hard", label: t("home.difficulty.hard"), color: "#ef4444" },
  ];

  const currentDifficulty =
    difficultyOptions.find((d) => d.value === difficulty) ||
    difficultyOptions[0];

  return (
    <main className="min-h-screen bg-clean-light dark:bg-clean-dark">
      {/* New Game Confirmation Dialog */}
      {showNewGameConfirm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            zIndex: 50,
            animation: "fadeIn 0.2s ease-out",
          }}
        >
          {/* Backdrop */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.6)",
              backdropFilter: "blur(4px)",
            }}
            onClick={handleCancelNewGame}
          />

          {/* Modal */}
          <div
            style={{
              position: "relative",
              backgroundColor: "#ffffff",
              borderRadius: "1rem",
              padding: "1.5rem",
              maxWidth: "24rem",
              width: "100%",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              animation: "scaleIn 0.2s ease-out",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div style={{ textAlign: "center", marginBottom: "1rem" }}>
              <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🎮</div>
            </div>

            <h3
              style={{
                fontSize: "1.25rem",
                fontWeight: 700,
                color: "#111827",
                textAlign: "center",
                marginBottom: "0.75rem",
              }}
            >
              {t("game.newGameConfirm.title")}
            </h3>
            <p
              style={{
                color: "#6b7280",
                textAlign: "center",
                marginBottom: "1.5rem",
                lineHeight: 1.6,
              }}
            >
              {t("game.newGameConfirm.message")}
            </p>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={handleCancelNewGame}
                style={{
                  flex: 1,
                  padding: "0.75rem 1.25rem",
                  borderRadius: "0.75rem",
                  backgroundColor: "#f3f4f6",
                  color: "#374151",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {t("common.cancel")}
              </button>
              <button
                onClick={handleConfirmNewGame}
                style={{
                  flex: 1,
                  padding: "0.75rem 1.25rem",
                  borderRadius: "0.75rem",
                  background: "linear-gradient(to right, #4f46e5, #7c3aed)",
                  color: "white",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                }}
              >
                {t("common.start")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-4">
        {/* Top Info Bar - Sudoku.com style */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "24px",
            padding: "12px 20px",
            marginBottom: "20px",
            backgroundColor: "white",
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
            flexWrap: "wrap",
          }}
          className="dark:bg-slate-800"
        >
          {/* Difficulty Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                fontSize: "14px",
                fontWeight: 500,
                color: "#64748b",
              }}
              className="dark:text-slate-400"
            >
              {t("game.difficulty")}
            </span>
            <span
              style={{
                padding: "4px 12px",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: 600,
                backgroundColor: `${currentDifficulty.color}15`,
                color: currentDifficulty.color,
                border: `1px solid ${currentDifficulty.color}40`,
              }}
            >
              {currentDifficulty.label}
            </span>
            {gameMode === "mutating" && (
              <span
                className="mutation-mode-badge ml-2"
                style={{
                  padding: "4px 10px",
                  borderRadius: "6px",
                  fontSize: "13px",
                  fontWeight: 600,
                  backgroundColor: "#fef3c715",
                  color: "#f59e0b",
                  border: "1px solid #f59e0b40",
                }}
              >
                🧬 Mutating
              </span>
            )}
          </div>

          {/* Divider */}
          <div
            style={{
              width: "1px",
              height: "24px",
              backgroundColor: "#e2e8f0",
            }}
            className="dark:bg-slate-600"
          />

          {/* Mistakes Counter */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                fontSize: "14px",
                fontWeight: 500,
                color: "#64748b",
              }}
              className="dark:text-slate-400"
            >
              {t("game.mistakes")}
            </span>
            <span
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color:
                  mistakes >= GAME_CONFIG.MAX_MISTAKES ? "#ef4444" : "#1e293b",
              }}
              className="dark:text-white"
            >
              {mistakes}/{GAME_CONFIG.MAX_MISTAKES}
            </span>
          </div>

          {/* Divider */}
          <div
            style={{
              width: "1px",
              height: "24px",
              backgroundColor: "#e2e8f0",
            }}
            className="dark:bg-slate-600"
          />

          {/* Timer */}
          <Timer mode="classic" gameId={gameId || undefined} />

          {/* Mutation Timer - only show in mutating mode */}
          {gameMode === "mutating" && status === GameStatus.ACTIVE && (
            <>
              {/* Divider before mutation timer */}
              <div
                style={{
                  width: "1px",
                  height: "24px",
                  backgroundColor: "#e2e8f0",
                }}
                className="dark:bg-slate-600"
              />
              <MutationTimer
                nextMutationAt={nextMutationAt}
                mutationCount={mutationCount}
                isPaused={status !== GameStatus.ACTIVE}
              />
            </>
          )}

          {/* Divider */}
          <div
            style={{
              width: "1px",
              height: "24px",
              backgroundColor: "#e2e8f0",
            }}
            className="dark:bg-slate-600"
          />

          {/* New Game Button */}
          <button
            onClick={handleNewGameClick}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              borderRadius: "8px",
              backgroundColor: "#4f46e5",
              color: "white",
              fontSize: "14px",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {t("game.newGame")}
          </button>

          {/* Theme Switcher */}
          <ThemeSwitcher />
        </div>

        {/* Main Game Area - Desktop Horizontal Layout */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            gap: "40px",
            flexWrap: "wrap",
          }}
        >
          {/* Left Side - Sudoku Grid */}
          <div style={{ position: "relative" }}>
            {/* Hint Explanation Message */}
            {hintCell && (
              <div
                style={{
                  position: "absolute",
                  top: "-50px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  backgroundColor:
                    hintCell.phase === "reveal" ? "#d1fae5" : "#fef3c7",
                  color: hintCell.phase === "reveal" ? "#059669" : "#92400e",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: 600,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  whiteSpace: "nowrap",
                  animation: "slideIn 0.3s ease-out",
                  zIndex: 10,
                }}
              >
                {hintCell.phase === "highlight" &&
                  t("game.hint.onlyNumber", { value: hintCell.value ?? "" })}
                {hintCell.phase === "reveal" &&
                  t("game.hint.filled", { value: hintCell.value ?? "" })}
              </div>
            )}

            {/* Hint Step-by-Step Explanation Panel */}
            {hintData && (
              <div
                style={{
                  position: "absolute",
                  top: "-80px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  backgroundColor:
                    hintData.steps[hintData.currentStep].type === "result"
                      ? "#d1fae5"
                      : "#fef3c7",
                  color:
                    hintData.steps[hintData.currentStep].type === "result"
                      ? "#065f46"
                      : "#92400e",
                  padding: "12px 20px",
                  borderRadius: "12px",
                  fontSize: "14px",
                  fontWeight: 600,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  animation: "slideIn 0.3s ease-out",
                  zIndex: 10,
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  minWidth: "280px",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <span style={{ fontSize: "16px" }}>
                    {hintData.steps[hintData.currentStep].type === "row" &&
                      "↔️"}
                    {hintData.steps[hintData.currentStep].type === "col" &&
                      "↕️"}
                    {hintData.steps[hintData.currentStep].type === "box" &&
                      "⬛"}
                    {hintData.steps[hintData.currentStep].type === "result" &&
                      "✅"}
                  </span>
                  <span>{hintData.steps[hintData.currentStep].message}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: "12px", opacity: 0.7 }}>
                    {t("game.hint.step", {
                      current: hintData.currentStep + 1,
                      total: hintData.steps.length,
                    })}
                  </span>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={handleHintCancel}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        border: "none",
                        backgroundColor: "rgba(0,0,0,0.1)",
                        color: "inherit",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {t("common.cancel")}
                    </button>
                    <button
                      onClick={handleHintNextStep}
                      style={{
                        padding: "6px 16px",
                        borderRadius: "6px",
                        border: "none",
                        backgroundColor:
                          hintData.steps[hintData.currentStep].type === "result"
                            ? "#10b981"
                            : "#f59e0b",
                        color: "white",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      {hintData.currentStep === hintData.steps.length - 1
                        ? t("game.hint.fillNumber")
                        : t("game.hint.next")}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <SudokuGrid
              onCellSelect={handleCellSelect}
              selectedCell={selectedCell}
              highlightedCells={highlightedCells}
              errorCells={errorCells}
              hintCell={hintCell}
              hintStepData={
                hintData
                  ? {
                      targetCell: { row: hintData.row, col: hintData.col },
                      highlightCells:
                        hintData.steps[hintData.currentStep].cells,
                      stepType: hintData.steps[hintData.currentStep].type,
                    }
                  : null
              }
              mutatingCell={mutationAnimating ? lastMutatedCell : null}
            />
          </div>

          {/* Right Side - Controls Panel */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "24px",
              padding: "20px",
              backgroundColor: "white",
              borderRadius: "16px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
              minWidth: "200px",
            }}
            className="dark:bg-slate-800"
          >
            {/* Number Pad 3x3 */}
            <NumberPad
              maxNumber={9}
              showCounts={true}
              onNumberSelect={handleNumberSelect}
              disabled={!selectedCell || status !== GameStatus.ACTIVE}
              disabledNumbers={disabledNumbers}
              numberCounts={numberCounts}
            />

            {/* Action Buttons */}
            <GameControls
              onUndo={handleUndo}
              onHint={handleHint}
              onErase={handleErase}
              onNewGame={handleNewGame}
              onToggleNotes={handleToggleNotes}
              notesMode={notesMode}
              canUndo={canUndo}
              canErase={canErase}
              canUseHint={
                hintsUsed < GAME_CONFIG.MAX_HINTS &&
                status === GameStatus.ACTIVE
              }
            />
          </div>
        </div>

        {/* Back to Home Link */}
        <div
          style={{
            textAlign: "center",
            marginTop: "24px",
          }}
        >
          <Link
            href="/"
            className="text-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
          >
            {t("common.backToHome")}
          </Link>
        </div>

        {/* Debug Panel (only in development) */}
        <DebugPanel />
      </div>

      {/* Tutorial Overlay - Outside container for proper fixed positioning */}
      {showTutorial && (
        <Tutorial
          onComplete={() => setShowTutorial(false)}
          onSkip={() => setShowTutorial(false)}
        />
      )}

      {/* Enhanced Game Completion/Failure Modals - Outside container */}
      <EnhancedModal
        isOpen={status === GameStatus.COMPLETED}
        type="success"
        stats={{
          time: useGameStore.getState().timeElapsed,
          hints: hintsUsed,
          mistakes: useGameStore.getState().mistakes,
          difficulty:
            (useGameStore.getState().difficulty || "easy")
              .charAt(0)
              .toUpperCase() +
            (useGameStore.getState().difficulty || "easy").slice(1),
        }}
        onNewGame={handleNewGame}
        onClose={() => (window.location.href = "/")}
      />

      <EnhancedModal
        isOpen={status === GameStatus.FAILED}
        type="failure"
        onNewGame={handleNewGame}
        onClose={() => (window.location.href = "/")}
      />
    </main>
  );
}
