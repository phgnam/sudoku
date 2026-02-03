"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useGameStore } from "@/store/game";
import { useTripodStore } from "@/store/tripod";
import { useUIStore } from "@/store/ui";
import { ThemeSwitcher, ToastContainer } from "@/components/ui";
import { NumberPad, Timer } from "@/components/shared";
import {
  TripodGrid,
  InputModeToggle,
  ValidationFeedback,
  SubModeSelector,
  UndoRedoControls,
  TripodStats,
  CompletionCelebration,
} from "@/components/game/tripod";
import { useTripodValidation } from "@/hooks/useTripodValidation";
import { useTripodGame } from "@/hooks/useTripodGame";
import { useTripodSocket } from "@/hooks/useTripodSocket";
import { useTripodGameInit } from "@/hooks/useTripodGameInit";
import { useMobileDetect } from "@/hooks/useMobileDetect";
import { TRIPOD_CONFIG } from "@/lib/constants";
import type {
  TripodError,
  Region,
  TripodState,
  TripodSubMode,
} from "@/types/tripod";
import { toast } from "@/components/ui/Toast";

export default function TripodGamePage() {
  const t = useTranslations();
  const { colorMode } = useUIStore();

  // Mobile detection for responsive layout
  const { isMobile, isTouchDevice, getOptimalCellSize } = useMobileDetect();

  // Game initialization hook
  const { loading: initLoading, isInitialized, createGame } = useTripodGameInit();

  // Tripod state from tripod store
  const tripod = useTripodStore((state) => state.tripod);
  const tripodHydrated = useTripodStore((state) => state._hasHydrated);
  const setRegions = useTripodStore((state) => state.setRegions);
  const setSubMode = useTripodStore((state) => state.setSubMode);
  const undoBorder = useTripodStore((state) => state.undoBorder);
  const redoBorder = useTripodStore((state) => state.redoBorder);
  const canUndo = useTripodStore((state) => state.canUndo);
  const canRedo = useTripodStore((state) => state.canRedo);

  // Game state from game store
  const gameId = useGameStore((state) => state.id);
  const currentState = useGameStore((state) => state.currentState);
  const [validationResult, setValidationResult] = useState<{
    errors: TripodError[];
    isComplete: boolean;
  }>({ errors: [], isComplete: false });

  // Determine grid size (default 7)
  const gridSize = tripod?.gridSize || TRIPOD_CONFIG.DEFAULT_GRID_SIZE;
  const cellSize = getOptimalCellSize(gridSize, isMobile ? 24 : 32);

  // Socket Hook
  const { toggleBorder: socketToggleBorder, validate: socketValidate } =
    useTripodSocket(gameId);

  // Game Logic Hook
  const {
    cells,
    givenCells,
    selectedCell,
    inputMode,
    handleCellSelect,
    handleBorderToggle,
    handleNumberInput,
    handleModeChange,
    setCells,
    initializeGame,
    getBorderToggleability,
  } = useTripodGame({
    gridSize,
    onBorderToggle: socketToggleBorder,
  });

  // Sync store currentState with local cells and update givenCells
  useEffect(() => {
    if (currentState && currentState.length > 0) {
      // Initialize game with current state and extract givens
      const givens: Array<{ row: number; col: number; value: number }> = [];
      currentState.forEach((row, rowIndex) => {
        row.forEach((value, colIndex) => {
          if (value !== 0) {
            givens.push({ row: rowIndex, col: colIndex, value });
          }
        });
      });

      initializeGame({
        cells: currentState.map((row) => [...row]),
        givens,
      });
    }
  }, [currentState, initializeGame]);

  // Handle localStorage quota exceeded
  useEffect(() => {
    const handleQuotaExceeded = () => {
      toast.error('Storage limit reached. Old game data cleared.', 5000);
    };
    window.addEventListener('storage:quota-exceeded', handleQuotaExceeded);
    return () => window.removeEventListener('storage:quota-exceeded', handleQuotaExceeded);
  }, []);

  // Handle subMode changes
  const handleSubModeChange = useCallback(
    (mode: TripodSubMode) => {
      setSubMode(mode);
    },
    [setSubMode],
  );

  // Initialize local game state when tripod data is loaded from socket
  const prevTripodRef = useRef<string>("");
  useEffect(() => {
    const tripodStr = JSON.stringify(tripod);
    if (
      tripod &&
      tripod.tripodDots?.length > 0 &&
      tripodStr !== prevTripodRef.current
    ) {
      prevTripodRef.current = tripodStr;

      if (currentState && currentState.length > 0) {
        // This might assume non-zero are givens, which is not always true for resumed games.
        // Ideally backend sends 'initialState' or 'givens'.
        // For now we assume this is only for new games or basic resume.
        // Only re-initialize if empty? Or always?
        // initializeGame resets cells. We should avoid resetting if user has made moves.
        // But setCells in the other useEffect handles updates.
        // We just need to set givens.
        // Re-calculating givens from current state is wrong if user made moves.
        // But we don't have separate 'givens' from backend yet in 'tripod:state'.
        // The backend 'tripod:state' has 'currentState'.
        // We'll trust the component to handle logic.
      }
    }
  }, [tripod, currentState]);

  // Validation hook
  const { regions, validateAll, isVertexSatisfied } = useTripodValidation({
    gridSize: tripod?.gridSize ?? 7,
    cells,
    horizontalBorders: tripod?.horizontalBorders ?? [],
    verticalBorders: tripod?.verticalBorders ?? [],
    tripodDots: tripod?.tripodDots ?? [],
  });

  // Update regions in store when they change
  const prevRegionsRef = React.useRef<Region[]>([]);
  useEffect(() => {
    if (
      tripod &&
      JSON.stringify(prevRegionsRef.current) !== JSON.stringify(regions)
    ) {
      prevRegionsRef.current = regions;
      setRegions(regions);
    }
  }, [regions, setRegions, tripod]);

  const handleValidate = useCallback(() => {
    // Local validation
    const result = validateAll();
    setValidationResult({
      errors: result.errors,
      isComplete: result.isComplete,
    });

    // Remote validation
    socketValidate();

    // Local UI updates
    // (Socket will return result too, but local is instant)
  }, [validateAll, socketValidate]);

  const isDark = colorMode === "dark";

  // Show loading state - wait for tripod store hydration
  if (initLoading || !tripodHydrated || (!tripod && !isInitialized)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-clean-light dark:bg-clean-dark">
        <div className="text-2xl font-semibold text-slate-800 dark:text-white">
          {t("game.loadingGame")}
        </div>
      </div>
    );
  }

  // If we have gameId but no tripod/currentState yet (socket connecting)
  if (!tripod) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-clean-light dark:bg-clean-dark">
        <div className="text-2xl font-semibold text-slate-800 dark:text-white">
          Connecting to game...
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-clean-light dark:bg-clean-dark">
      <div className="max-w-5xl mx-auto px-4 py-4">
        {/* Top Info Bar - unified with Classic mode */}
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

          {/* Region Progress */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{ fontSize: "12px" }}
              className="text-slate-600 dark:text-slate-400"
            >
              Regions:
            </span>
            <span
              style={{ fontSize: "14px", fontWeight: 600 }}
              className="dark:text-white"
            >
              {regions.filter((r) => r.isValid).length}/{regions.length}
            </span>
            <div
              style={{
                width: "60px",
                height: "6px",
                backgroundColor: isDark ? "#334155" : "#e2e8f0",
                borderRadius: "3px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${regions.length > 0 ? (regions.filter((r) => r.isValid).length / regions.length) * 100 : 0}%`,
                  height: "100%",
                  backgroundColor: "#14b8a6",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
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
          <Timer mode="tripod" elapsedTime={tripod.elapsedTime || 0} />

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
            onClick={createGame}
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

        {/* Sub-Mode Selector */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              padding: "16px 24px",
              borderRadius: "12px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
            }}
            className="bg-white dark:bg-slate-800"
          >
            <SubModeSelector
              currentMode={tripod.subMode}
              onModeSelect={handleSubModeChange}
            />
          </div>
        </div>

        {/* Main Game Area */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            gap: "40px",
            flexWrap: "wrap",
          }}
        >
          {/* Grid Container */}
          <div style={{ position: "relative" }}>
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

          {/* Controls Panel */}
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
            {/* Input Mode Toggle */}
            {tripod.subMode !== "sudoku_only" && (
              <InputModeToggle
                mode={inputMode}
                onModeChange={handleModeChange}
                showShortcuts={!isMobile}
              />
            )}

            {/* Undo/Redo Controls */}
            {tripod.subMode !== "sudoku_only" && (
              <UndoRedoControls
                onUndo={undoBorder}
                onRedo={redoBorder}
                canUndo={canUndo()}
                canRedo={canRedo()}
              />
            )}

            {/* Number Pad */}
            <NumberPad
              maxNumber={tripod.gridSize}
              showCounts={false}
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

            {/* Statistics Panel */}
            <div>
              <TripodStats />
            </div>
          </div>
        </div>

        {/* Instructions Panel */}
        <div>
          <InstructionsPanel tripod={tripod} isDark={isDark} t={t} />
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
      </div>

      {/* Completion Celebration Modal */}
      <CompletionCelebration
        isVisible={validationResult.isComplete}
        timeTaken={tripod.elapsedTime}
        onPlayAgain={createGame}
      />

      {/* Toast notifications */}
      <ToastContainer />
    </main>
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
      style={{
        marginTop: "24px",
        padding: "16px",
        borderRadius: "12px",
        fontSize: "14px",
        backgroundColor: isDark ? "#1e293b" : "#f8fafc",
        color: isDark ? "#94a3b8" : "#64748b",
      }}
    >
      <h4
        style={{
          fontWeight: 600,
          marginBottom: "8px",
          fontSize: "16px",
          color: isDark ? "#e2e8f0" : "#334155",
        }}
      >
        {t("tripod.instructions.title")}
      </h4>
      <ul
        style={{
          listStyleType: "disc",
          paddingLeft: "20px",
          lineHeight: 1.6,
        }}
      >
        <li>{t("tripod.instructions.rule1", { gridSize: tripod.gridSize })}</li>
        <li>{t("tripod.instructions.rule2")}</li>
        <li>{t("tripod.instructions.rule3", { gridSize: tripod.gridSize })}</li>
        <li>{t("tripod.instructions.rule4")}</li>
        <li>{t("tripod.instructions.rule5")}</li>
      </ul>
    </div>
  );
}
