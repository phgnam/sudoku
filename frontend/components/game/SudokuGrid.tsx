"use client";

import { useRef, useEffect } from "react";
import { useGameStore } from "@/store/game";
import { GAME_CONFIG } from "@/lib/constants";

interface HintCell {
  row: number;
  col: number;
  value?: number;
  phase: "highlight" | "reveal";
}

interface HintStepData {
  targetCell: { row: number; col: number };
  highlightCells: Array<{ row: number; col: number }>;
  stepType: "row" | "col" | "box" | "result";
}

interface SudokuGridProps {
  onCellSelect: (row: number, col: number) => void;
  selectedCell: { row: number; col: number } | null;
  highlightedCells?: Array<{ row: number; col: number }>;
  errorCells?: Array<{ row: number; col: number }>;
  hintCell?: HintCell | null;
  hintStepData?: HintStepData | null;
  // Competitive mode props
  competitive?: boolean;
  opponentCells?: Set<string>; // "row,col" format
  mutatingCell?: { row: number; col: number; previousValue?: number } | null;
}

export function SudokuGrid({
  onCellSelect,
  selectedCell,
  highlightedCells = [],
  errorCells = [],
  hintCell = null,
  hintStepData = null,
  competitive = false,
  opponentCells,
  mutatingCell = null,
}: SudokuGridProps) {
  const { currentState, initialState, notes, wrongCells } = useGameStore();
  const gridRef = useRef<HTMLDivElement>(null);

  // Mobile keyboard scroll-into-view effect
  useEffect(() => {
    if (selectedCell && gridRef.current) {
      const isMobile = window.innerWidth < 768;
      if (!isMobile) return;

      const cellElement = gridRef.current.querySelector(
        `[data-cell="${selectedCell.row}-${selectedCell.col}"]`
      ) as HTMLElement;

      if (cellElement) {
        const rect = cellElement.getBoundingClientRect();
        const viewportHeight = window.innerHeight * 0.6; // Account for keyboard

        if (rect.bottom > viewportHeight) {
          cellElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [selectedCell]);

  const isCellInitial = (row: number, col: number) => initialState[row][col] !== 0;
  const isCellSelected = (row: number, col: number) =>
    selectedCell?.row === row && selectedCell?.col === col;
  const isCellHighlighted = (row: number, col: number) =>
    highlightedCells.some((c) => c.row === row && c.col === col);
  const isCellError = (row: number, col: number) =>
    errorCells.some((c) => c.row === row && c.col === col);
  const isCellWrong = (row: number, col: number) =>
    wrongCells.some((c) => c.row === row && c.col === col);
  const isCellHint = (row: number, col: number) =>
    hintCell?.row === row && hintCell?.col === col;
  const isCellMutating = (row: number, col: number) =>
    mutatingCell?.row === row && mutatingCell?.col === col;

  // Check if opponent has filled this cell (competitive mode)
  const isOpponentCell = (row: number, col: number) =>
    competitive && opponentCells?.has(`${row},${col}`);

  // Check if cell is the target cell in hint step
  const isHintTarget = (row: number, col: number) =>
    hintStepData?.targetCell.row === row && hintStepData?.targetCell.col === col;

  // Check if cell is highlighted in current hint step
  const isHintStepHighlight = (row: number, col: number) =>
    hintStepData?.highlightCells.some((c) => c.row === row && c.col === col) ?? false;

  const isSameRow = (row: number) => selectedCell?.row === row;
  const isSameCol = (col: number) => selectedCell?.col === col;
  const isSameBox = (row: number, col: number) => {
    if (!selectedCell) return false;
    return (
      Math.floor(row / 3) === Math.floor(selectedCell.row / 3) &&
      Math.floor(col / 3) === Math.floor(selectedCell.col / 3)
    );
  };

  const CELL_SIZE = 48;

  const getCellStyle = (row: number, col: number, value: number) => {
    const isInitial = isCellInitial(row, col);
    const isSelected = isCellSelected(row, col);
    const isHighlighted = isCellHighlighted(row, col);
    const isError = isCellError(row, col);
    const isWrong = isCellWrong(row, col);
    const isHint = isCellHint(row, col);
    const isTarget = isHintTarget(row, col);
    const isStepHighlight = isHintStepHighlight(row, col);
    const inSameGroup = isSameRow(row) || isSameCol(col) || isSameBox(row, col);

    let backgroundColor = "white";
    let textColor = "#4338ca";
    let animation = "";
    let boxShadow = "";

    if (isInitial) {
      backgroundColor = "#e0e7ff";
      textColor = "#1e1b4b";
    }
    if (inSameGroup && !isSelected && !isError && !isWrong && !isHighlighted && !isHint && !isTarget && !isStepHighlight) {
      backgroundColor = "#eef2ff";
    }
    if (isHighlighted) {
      backgroundColor = "#fed7aa";
    }
    if (isSelected && !isTarget && !isStepHighlight) {
      backgroundColor = "#ffedd5";
      textColor = "#c2410c";
    }

    // Wrong cell - show red text (but not red background unless also selected)
    if (isWrong && !isInitial) {
      textColor = "#dc2626"; // Red text for wrong numbers
      if (!isSelected) {
        backgroundColor = "#fef2f2"; // Light red background
      }
    }

    if (isError) {
      backgroundColor = "#fecaca";
      textColor = "#b91c1c";
    }

    // Hint step highlighting
    if (isStepHighlight) {
      backgroundColor = "#fef3c7"; // Yellow for highlighted cells
      boxShadow = "inset 0 0 0 2px #f59e0b";
      animation = "fadeIn 0.3s ease-out";
    }

    // Target cell in hint step
    if (isTarget) {
      if (hintStepData?.stepType === "result") {
        backgroundColor = "#d1fae5"; // Green for result
        boxShadow = "inset 0 0 0 3px #10b981";
        animation = "pulse 0.5s ease-in-out infinite";
      } else {
        backgroundColor = "#dbeafe"; // Blue for target
        boxShadow = "inset 0 0 0 3px #3b82f6";
        animation = "pulse 0.8s ease-in-out infinite";
      }
    }

    // Legacy hint cell styling
    let forceShowText = false;
    if (isHint) {
      if (hintCell?.phase === "highlight") {
        backgroundColor = "#fef3c7";
        textColor = "#d97706";
        boxShadow = "inset 0 0 0 3px #f59e0b";
        animation = "pulse 0.5s ease-in-out infinite";
        forceShowText = true;
      } else if (hintCell?.phase === "reveal") {
        backgroundColor = "#d1fae5";
        textColor = "#059669";
        boxShadow = "inset 0 0 0 3px #10b981";
        animation = "popIn 0.3s ease-out";
        forceShowText = true;
      }
    }

    // Mutation animation - dramatic colorful effect
    const isMutating = isCellMutating(row, col);
    if (isMutating) {
      backgroundColor = "linear-gradient(135deg, rgba(239, 68, 68, 0.6), rgba(251, 146, 60, 0.6))";
      textColor = "#ffffff";
      animation = "mutationPulse 1s ease-out, mutationShake 0.5s ease-in-out";
      boxShadow = "0 0 40px rgba(239, 68, 68, 0.8), 0 0 80px rgba(251, 146, 60, 0.5), inset 0 0 15px rgba(255, 255, 255, 0.4)";
    }

    return {
      width: `${CELL_SIZE}px`,
      height: `${CELL_SIZE}px`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "20px",
      fontWeight: 700,
      background: isMutating ? backgroundColor : undefined,
      backgroundColor: isMutating ? undefined : backgroundColor,
      color: value === 0 && !forceShowText ? "transparent" : textColor,
      cursor: isInitial ? "not-allowed" : "pointer",
      borderRight: (col + 1) % 3 === 0 && col !== 8 ? "2px solid #4f46e5" : "1px solid #c7d2fe",
      borderBottom: (row + 1) % 3 === 0 && row !== 8 ? "2px solid #4f46e5" : "1px solid #c7d2fe",
      outline: isSelected ? "2px solid #f97316" : "none",
      outlineOffset: "-2px",
      position: "relative" as const,
      boxShadow,
      animation,
      transition: "background-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease",
      zIndex: isMutating ? 10 : undefined,
    };
  };

  // Render notes in a 3x3 mini-grid
  const renderNotes = (row: number, col: number) => {
    const cellNotes = notes[row]?.[col] || [];
    if (cellNotes.length === 0) return null;

    return (
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gridTemplateRows: "repeat(3, 1fr)",
          padding: "2px",
        }}
      >
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <span
            key={num}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "10px",
              fontWeight: 500,
              color: cellNotes.includes(num) ? "#6366f1" : "transparent",
            }}
          >
            {num}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div
      style={{
        display: "inline-block",
        padding: "12px",
        paddingBottom: 'env(safe-area-inset-bottom, 20px)',
        backgroundColor: "white",
        borderRadius: "16px",
        boxShadow: "0 10px 25px rgba(79, 70, 229, 0.15)",
        border: "2px solid #c7d2fe",
      }}
    >
      <div
        ref={gridRef}
        data-testid="sudoku-grid"
        role="grid"
        aria-label="Sudoku puzzle grid"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(9, ${CELL_SIZE}px)`,
          border: "2px solid #4f46e5",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        {Array.from({ length: GAME_CONFIG.GRID_SIZE }).map((_, row) =>
          Array.from({ length: GAME_CONFIG.GRID_SIZE }).map((_, col) => {
            const value = currentState[row][col];
            const isInitial = isCellInitial(row, col);
            const hasNotes = notes[row]?.[col]?.length > 0;
            const isHintingThisCell = isCellHint(row, col);
            const hintValue = isHintingThisCell && hintCell?.phase === "highlight" ? hintCell?.value : null;
            const isMutating = isCellMutating(row, col);

            // Determine what to display
            let displayContent: React.ReactNode = "";

            // Special handling for mutating cell - show previous value with fade-out animation
            if (isMutating && mutatingCell?.previousValue) {
              displayContent = (
                <span
                  style={{
                    animation: "mutationValueFade 0.6s ease-out forwards",
                    display: "inline-block",
                  }}
                >
                  {mutatingCell.previousValue}
                </span>
              );
            } else if (value !== 0) {
              displayContent = value;
            } else if (isHintingThisCell && hintCell?.phase === "highlight" && hintValue) {
              // Show hint value with special styling during highlight phase
              displayContent = (
                <span
                  style={{
                    opacity: 0.6,
                    fontSize: "20px",
                    fontWeight: 700,
                  }}
                >
                  {hintValue}
                </span>
              );
            } else if (hasNotes) {
              displayContent = renderNotes(row, col);
            }

            const isSelected = isCellSelected(row, col);
            const isError = isCellError(row, col) || isCellWrong(row, col);

            return (
              <button
                key={`${row}-${col}`}
                data-testid={`cell-${row}-${col}`}
                data-cell={`${row}-${col}`}
                onClick={() => !isInitial && onCellSelect(row, col)}
                style={getCellStyle(row, col, value)}
                aria-label={`Row ${row + 1}, Column ${col + 1}${value ? `, value ${value}` : ', empty'}${isInitial ? ', given' : ''}${isSelected ? ', selected' : ''}${isError ? ', error' : ''}`}
                aria-disabled={isInitial}
              >
                {displayContent}
                {/* Opponent filled cell overlay (competitive mode) */}
                {isOpponentCell(row, col) && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      backgroundColor: "rgba(251, 146, 60, 0.35)",
                      pointerEvents: "none",
                      borderRadius: "2px",
                    }}
                  />
                )}
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}
