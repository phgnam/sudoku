"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useGameStore } from "@/store/game";
import { useAuthStore } from "@/store/auth";
import { useUIStore } from "@/store/ui";
import { ThemeSwitcher, ToastContainer } from "@/components/ui";
import {
  TripodGrid,
  InputModeToggle,
  TripodNumberPad,
  ValidationFeedback,
  SubModeSelector,
  UndoRedoControls,
  TripodTimer,
  TripodStats,
  CompletionCelebration,
} from "@/components/game/tripod";
import { useTripodValidation } from "@/hooks/useTripodValidation";
import { useTripodGame } from "@/hooks/useTripodGame";
import { useMobileDetect } from "@/hooks/useMobileDetect";
import { TRIPOD_CONFIG } from "@/lib/constants";
import { getRandomTripodPuzzle, TripodPuzzleData } from "@/data/tripod-puzzles";
import type {
  TripodError,
  Region,
  TripodState,
  TripodSubMode,
} from "@/types/tripod";

// Helper to extract given cells from puzzle
function extractGivens(
  cells: number[][],
): Array<{ row: number; col: number; value: number }> {
  const givens: Array<{ row: number; col: number; value: number }> = [];
  cells.forEach((row, r) => {
    row.forEach((value, c) => {
      if (value !== 0) {
        givens.push({ row: r, col: c, value });
      }
    });
  });
  return givens;
}

export default function TripodGamePage() {
  const t = useTranslations();
  const { colorMode } = useUIStore();
  const { _hasHydrated: authHydrated } = useAuthStore();

  // Mobile detection for responsive layout
  const { isMobile, isTouchDevice, getOptimalCellSize } = useMobileDetect();

  const tripod = useGameStore((state) => state.tripod);
  const initTripodState = useGameStore((state) => state.initTripodState);
  const setTripodRegions = useGameStore((state) => state.setTripodRegions);
  const setTripodErrors = useGameStore((state) => state.setTripodErrors);
  const setTripodSubMode = useGameStore((state) => state.setTripodSubMode);
  const setTripodBorders = useGameStore((state) => state.setTripodBorders);
  const undoBorder = useGameStore((state) => state.undoBorder);
  const redoBorder = useGameStore((state) => state.redoBorder);
  const canUndoBorder = useGameStore((state) => state.canUndoBorder);
  const canRedoBorder = useGameStore((state) => state.canRedoBorder);
  const startTripodTimer = useGameStore((state) => state.startTripodTimer);
  const pauseTripodTimer = useGameStore((state) => state.pauseTripodTimer);
  const incrementTripodStat = useGameStore(
    (state) => state.incrementTripodStat,
  );

  const [isInitialized, setIsInitialized] = useState(false);
  // Use lazy initialization to avoid setting state in useEffect
  const [currentPuzzle, setCurrentPuzzle] = useState<TripodPuzzleData | null>(
    () => getRandomTripodPuzzle(),
  );
  const [validationResult, setValidationResult] = useState<{
    errors: TripodError[];
    isComplete: boolean;
  }>({ errors: [], isComplete: false });

  // Calculate responsive cell size
  const gridSize = currentPuzzle?.gridSize ?? TRIPOD_CONFIG.DEFAULT_GRID_SIZE;
  const cellSize = getOptimalCellSize(gridSize, isMobile ? 24 : 32);

  const {
    cells,
    givenCells,
    selectedCell,
    inputMode,
    handleCellSelect,
    handleBorderToggle,
    handleNumberInput,
    handleModeChange,
    initializeGame,
    setCells,
    getBorderToggleability,
  } = useTripodGame({
    gridSize: gridSize,
  });

  // Handle subMode changes
  const handleSubModeChange = useCallback(
    (mode: TripodSubMode) => {
      setTripodSubMode(mode);

      // If switching to sudoku_only and puzzle has pre-defined regions, load them
      if (mode === "sudoku_only" && currentPuzzle?.regions) {
        setTripodBorders(
          currentPuzzle.regions.horizontalBorders,
          currentPuzzle.regions.verticalBorders,
        );
      }
    },
    [currentPuzzle, setTripodSubMode, setTripodBorders],
  );

  // Initialize game - use a ref to track initialization
  useEffect(() => {
    if (!authHydrated || isInitialized || !currentPuzzle) return;

    // Initialize tripod state with puzzle data (default to 'full' mode)
    initTripodState(currentPuzzle.gridSize, currentPuzzle.tripodDots, "full");

    // Start the timer
    startTripodTimer();

    // Initialize cells from puzzle
    setCells(currentPuzzle.cells.map((row) => [...row]));

    // Extract givens from cells
    const givens = extractGivens(currentPuzzle.cells);

    initializeGame({
      cells: currentPuzzle.cells,
      givens,
    });

    // Mark as initialized on next tick to avoid sync setState warning
    requestAnimationFrame(() => setIsInitialized(true));
  }, [
    authHydrated,
    isInitialized,
    currentPuzzle,
    initTripodState,
    initializeGame,
    setCells,
    startTripodTimer,
  ]);

  // Validation hook
  const { regions, validateAll, isVertexSatisfied } = useTripodValidation({
    gridSize: tripod?.gridSize ?? 7,
    cells,
    horizontalBorders: tripod?.horizontalBorders ?? [],
    verticalBorders: tripod?.verticalBorders ?? [],
    tripodDots: tripod?.tripodDots ?? [],
  });

  // Update regions in store when they change - use ref to prevent infinite loop
  const prevRegionsRef = React.useRef<Region[]>([]);
  useEffect(() => {
    if (
      tripod &&
      JSON.stringify(prevRegionsRef.current) !== JSON.stringify(regions)
    ) {
      prevRegionsRef.current = regions;
      setTripodRegions(regions);
    }
  }, [regions, setTripodRegions]);

  const handleValidate = useCallback(() => {
    const result = validateAll();
    setValidationResult({
      errors: result.errors,
      isComplete: result.isComplete,
    });
    setTripodErrors(result.errors);

    // Track validation stat
    incrementTripodStat("validationCount");

    // Pause timer on completion
    if (result.isComplete) {
      pauseTripodTimer();
    }
  }, [validateAll, setTripodErrors, incrementTripodStat, pauseTripodTimer]);

  // Handler for starting a new puzzle
  const handleNewPuzzle = useCallback(() => {
    // Get a different random puzzle
    const puzzle = getRandomTripodPuzzle();
    setCurrentPuzzle(puzzle);

    // Reset validation state
    setValidationResult({ errors: [], isComplete: false });

    // Preserve current subMode
    const currentSubMode = tripod?.subMode ?? "full";

    // Initialize tripod state with new puzzle
    initTripodState(puzzle.gridSize, puzzle.tripodDots, currentSubMode);

    // Start timer for new puzzle
    startTripodTimer();

    // If sudoku_only mode and puzzle has regions, load them
    if (currentSubMode === "sudoku_only" && puzzle.regions) {
      setTripodBorders(
        puzzle.regions.horizontalBorders,
        puzzle.regions.verticalBorders,
      );
    }

    // Initialize cells from puzzle
    setCells(puzzle.cells.map((row) => [...row]));

    // Extract givens from cells
    const givens = extractGivens(puzzle.cells);

    initializeGame({
      cells: puzzle.cells,
      givens,
    });
  }, [
    initTripodState,
    initializeGame,
    setCells,
    tripod?.subMode,
    setTripodBorders,
    startTripodTimer,
  ]);

  const isDark = colorMode === "dark";

  // Show loading state until tripod state is initialized
  if (!isInitialized || !tripod) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-clean-light dark:bg-clean-dark">
        <div className="text-2xl font-semibold text-slate-800 dark:text-white">
          {t("game.loadingGame")}
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-clean-light dark:bg-clean-dark">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
        {/* Top Info Bar - simplified on mobile */}
        <TopInfoBar
          tripod={tripod}
          regions={regions}
          isDark={isDark}
          puzzleName={currentPuzzle?.name}
          puzzleDifficulty={currentPuzzle?.difficulty}
          onNewPuzzle={handleNewPuzzle}
          t={t}
          isMobile={isMobile}
        />

        {/* Sub-Mode Selector - hidden on very small screens */}
        <div className="hidden sm:flex justify-center mb-4 sm:mb-5">
          <div className="px-4 sm:px-6 py-3 sm:py-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
            <SubModeSelector
              currentMode={tripod.subMode}
              onModeSelect={handleSubModeChange}
            />
          </div>
        </div>

        {/* Main Game Area - Stacked on mobile, side-by-side on desktop */}
        <div className="flex flex-col lg:flex-row justify-center items-center lg:items-start gap-4 lg:gap-10">
          {/* Grid Container - Centered */}
          <div className="flex justify-center">
            <TripodGrid
              gridSize={tripod.gridSize}
              cells={cells}
              givenCells={givenCells}
              tripodDots={tripod.tripodDots}
              horizontalBorders={tripod.horizontalBorders}
              verticalBorders={tripod.verticalBorders}
              regions={regions}
              inputMode={inputMode}
              selectedCell={selectedCell}
              errors={validationResult.errors}
              onCellSelect={handleCellSelect}
              onBorderToggle={handleBorderToggle}
              isVertexSatisfied={isVertexSatisfied}
              subMode={tripod.subMode}
              getBorderToggleability={getBorderToggleability}
              cellSize={cellSize}
              isTouchDevice={isTouchDevice}
            />
          </div>

          {/* Controls Panel - Full width on mobile, fixed width on desktop */}
          <div className="w-full lg:w-auto flex flex-col gap-3 sm:gap-5 p-3 sm:p-5 bg-white dark:bg-slate-800 rounded-xl shadow-sm lg:min-w-[220px]">
            {/* Input Mode Toggle - hide in borders_only mode since no number input */}
            {tripod.subMode !== "sudoku_only" && (
              <InputModeToggle
                mode={inputMode}
                onModeChange={handleModeChange}
                showShortcuts={!isMobile}
              />
            )}

            {/* Undo/Redo Controls for borders - hide in sudoku_only mode */}
            {tripod.subMode !== "sudoku_only" && (
              <UndoRedoControls
                onUndo={undoBorder}
                onRedo={redoBorder}
                canUndo={canUndoBorder()}
                canRedo={canRedoBorder()}
              />
            )}

            {/* Number Pad - disabled in borders_only mode */}
            <TripodNumberPad
              maxNumber={tripod.gridSize}
              onNumberSelect={handleNumberInput}
              disabled={
                tripod.subMode === "borders_only" ||
                inputMode === "border" ||
                !selectedCell
              }
              isMobile={isMobile}
            />

            {/* Validation Feedback */}
            <ValidationFeedback
              errors={validationResult.errors}
              isComplete={validationResult.isComplete}
              onValidate={handleValidate}
            />

            {/* Statistics Panel - Hidden on very small screens to save space */}
            <div className="hidden sm:block">
              <TripodStats />
            </div>
          </div>
        </div>

        {/* Instructions - Collapsed on mobile */}
        <div className="hidden sm:block">
          <InstructionsPanel tripod={tripod} isDark={isDark} t={t} />
        </div>

        {/* Back to Home Link */}
        <div className="text-center mt-4 sm:mt-6">
          <Link
            href="/"
            className="text-sm text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
          >
            {t("common.backToHome")}
          </Link>
        </div>
      </div>

      {/* Completion Celebration Modal */}
      <CompletionCelebration
        isVisible={validationResult.isComplete}
        timeTaken={tripod.elapsedTime}
        onPlayAgain={handleNewPuzzle}
      />

      {/* Toast notifications */}
      <ToastContainer />
    </main>
  );
}

// Top Info Bar Component
interface TopInfoBarProps {
  tripod: TripodState;
  regions: Region[];
  isDark: boolean;
  puzzleName?: string;
  puzzleDifficulty?: "easy" | "medium" | "hard";
  onNewPuzzle?: () => void;
  t: ReturnType<typeof useTranslations>;
  isMobile?: boolean;
}

const difficultyColors = {
  easy: { bg: "#10b98115", text: "#10b981", border: "#10b98140" },
  medium: { bg: "#f59e0b15", text: "#f59e0b", border: "#f59e0b40" },
  hard: { bg: "#ef444415", text: "#ef4444", border: "#ef444440" },
};

function TopInfoBar({
  tripod,
  regions,
  isDark,
  puzzleName,
  puzzleDifficulty,
  onNewPuzzle,
  t,
  isMobile = false,
}: TopInfoBarProps) {
  const diffColor = puzzleDifficulty
    ? difficultyColors[puzzleDifficulty]
    : difficultyColors.easy;

  // Simplified mobile layout
  if (isMobile) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-2 px-3 py-2 mb-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
        {/* Game Mode Badge */}
        <span className="px-2 py-1 text-xs font-semibold bg-teal-50 text-teal-600 border border-teal-200 rounded">
          🔺 {tripod.gridSize}×{tripod.gridSize}
        </span>

        {/* Difficulty Badge */}
        {puzzleDifficulty && (
          <span
            className="px-2 py-0.5 text-xs font-semibold rounded capitalize"
            style={{
              backgroundColor: diffColor.bg,
              color: diffColor.text,
              border: `1px solid ${diffColor.border}`,
            }}
          >
            {t(`tripod.difficulty.${puzzleDifficulty}`)}
          </span>
        )}

        {/* Region Count */}
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {regions.length}/{tripod.gridSize}
        </span>

        {/* Timer */}
        <TripodTimer isPaused={tripod.isTimerPaused} />

        {/* New Puzzle Button */}
        {onNewPuzzle && (
          <button
            onClick={onNewPuzzle}
            className="flex items-center gap-1 px-2 py-1.5 bg-teal-500 text-white text-xs font-semibold rounded-lg min-h-[32px] active:scale-95 transition-transform"
            title={t('game.newGame') || 'New Puzzle'}
          >
            <svg
              width="12"
              height="12"
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
            {isMobile ? t('game.newGame') || 'New' : t('game.newGame') || 'New Puzzle'}
          </button>
        )}

        {/* Theme Switcher */}
        <ThemeSwitcher />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 px-3 sm:px-5 py-2 sm:py-3 mb-4 sm:mb-5 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
      {/* Game Mode Badge */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span
          style={{
            padding: "4px 12px",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: 600,
            backgroundColor: "#14b8a615",
            color: "#14b8a6",
            border: "1px solid #14b8a640",
          }}
        >
          🔺 {t("tripod.title")}
        </span>
        <span
          style={{
            padding: "4px 8px",
            borderRadius: "4px",
            fontSize: "12px",
            backgroundColor: isDark ? "#334155" : "#f1f5f9",
            color: isDark ? "#94a3b8" : "#64748b",
          }}
        >
          {tripod.gridSize}×{tripod.gridSize}
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

      {/* Puzzle Name & Difficulty */}
      {puzzleName && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{ fontSize: "14px", fontWeight: 600 }}
              className="dark:text-white"
            >
              {puzzleName}
            </span>
            {puzzleDifficulty && (
              <span
                style={{
                  padding: "2px 8px",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontWeight: 600,
                  backgroundColor: diffColor.bg,
                  color: diffColor.text,
                  border: `1px solid ${diffColor.border}`,
                  textTransform: "capitalize",
                }}
              >
                {t(`tripod.difficulty.${puzzleDifficulty}`)}
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
        </>
      )}

      {/* Region Count */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span
          style={{ fontSize: "14px", color: "#64748b" }}
          className="dark:text-slate-400"
        >
          {t("tripod.regions")}:
        </span>
        <span
          style={{ fontSize: "14px", fontWeight: 600 }}
          className="dark:text-white"
        >
          {regions.length}/{tripod.gridSize}
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

      {/* New Puzzle Button */}
      {onNewPuzzle && (
        <>
          <button
            onClick={onNewPuzzle}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 14px",
              borderRadius: "8px",
              backgroundColor: "#14b8a6",
              color: "white",
              fontSize: "13px",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
            }}
          >
            <svg
              width="14"
              height="14"
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
            {t("tripod.newPuzzle")}
          </button>

          {/* Divider */}
          <div
            style={{
              width: "1px",
              height: "24px",
              backgroundColor: "#e2e8f0",
            }}
            className="dark:bg-slate-600"
          />
        </>
      )}

      {/* Timer */}
      <TripodTimer isPaused={tripod.isTimerPaused} />

      {/* Divider */}
      <div
        style={{
          width: "1px",
          height: "24px",
          backgroundColor: "#e2e8f0",
        }}
        className="dark:bg-slate-600"
      />

      {/* Theme Switcher */}
      <ThemeSwitcher />
    </div>
  );
}

// Instructions Panel Component
function InstructionsPanel({
  tripod,
  isDark,
  t,
}: {
  tripod: { gridSize: number };
  isDark: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div
      className="mt-4 sm:mt-6 p-3 sm:p-4 rounded-xl text-sm"
      style={{
        backgroundColor: isDark ? "#1e293b" : "#f8fafc",
        color: isDark ? "#94a3b8" : "#64748b",
      }}
    >
      <h4
        className="font-semibold mb-2 text-sm sm:text-base"
        style={{
          color: isDark ? "#e2e8f0" : "#334155",
        }}
      >
        {t("tripod.instructions.title")}
      </h4>
      <ul className="list-disc pl-4 sm:pl-5 leading-relaxed text-xs sm:text-sm">
        <li>{t("tripod.instructions.rule1", { gridSize: tripod.gridSize })}</li>
        <li>{t("tripod.instructions.rule2")}</li>
        <li>{t("tripod.instructions.rule3", { gridSize: tripod.gridSize })}</li>
        <li>{t("tripod.instructions.rule4")}</li>
        <li>{t("tripod.instructions.rule5")}</li>
      </ul>
    </div>
  );
}
