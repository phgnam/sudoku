"use client";

import { TripodCell } from "./TripodCell";
import { BorderEdge, BorderToggleState } from "./BorderEdge";
import { TripodDot } from "./TripodDot";
import type { Region, TripodError, TripodSubMode } from "@/types/tripod";

interface TripodGridProps {
  gridSize: number;
  cells: number[][];
  givenCells: boolean[][];
  tripodDots: boolean[][];
  horizontalBorders: boolean[][];
  verticalBorders: boolean[][];
  regions: Region[];
  inputMode: "number" | "border";
  selectedCell: { row: number; col: number } | null;
  errors: TripodError[];
  onCellSelect: (row: number, col: number) => void;
  onBorderToggle: (type: "h" | "v", row: number, col: number) => void;
  isVertexSatisfied?: (row: number, col: number) => boolean;
  getVertexErrors?: (row: number, col: number) => TripodError[];
  subMode?: TripodSubMode;
  /** Function to get border toggleability state */
  getBorderToggleability?: (
    type: "h" | "v",
    row: number,
    col: number,
  ) => BorderToggleState;
  /** Cell size in pixels (responsive) */
  cellSize?: number;
  /** Whether device supports touch input */
  isTouchDevice?: boolean;
}

// Default cell size for desktop
const DEFAULT_CELL_SIZE = 56;

export function TripodGrid({
  gridSize,
  cells,
  givenCells,
  tripodDots,
  horizontalBorders,
  verticalBorders,
  regions,
  inputMode,
  selectedCell,
  errors,
  onCellSelect,
  onBorderToggle,
  isVertexSatisfied,
  getVertexErrors,
  subMode = "full",
  getBorderToggleability,
  cellSize = DEFAULT_CELL_SIZE,
  isTouchDevice = false,
}: TripodGridProps) {
  const CELL_SIZE = cellSize;

  // SubMode restrictions
  const hideNumbers = subMode === "borders_only";
  const bordersFixed = subMode === "sudoku_only";

  const getCellRegionColor = (row: number, col: number): string | undefined => {
    const region = regions.find((r) =>
      r.cells.some((c) => c.row === row && c.col === col),
    );
    return region?.color;
  };

  const hasCellError = (row: number, col: number): boolean => {
    return errors.some(
      (e) =>
        "row" in e.location && e.location.row === row && e.location.col === col,
    );
  };

  const isHighlighted = (row: number, col: number): boolean => {
    if (!selectedCell) return false;
    return row === selectedCell.row || col === selectedCell.col;
  };

  return (
    <div
      style={{
        position: "relative",
        background:
          "linear-gradient(135deg, rgba(15, 15, 35, 0.9) 0%, rgba(76, 29, 149, 0.8) 100%)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)", // Safari support
        borderRadius: "20px",
        boxShadow:
          "0 10px 30px rgba(124, 58, 237, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
        border: "1px solid rgba(167, 139, 250, 0.2)",
        padding: "20px",
        width: gridSize * CELL_SIZE + 44, // Increased padding
        height: gridSize * CELL_SIZE + 44,
      }}
    >
      {/* Inner grid border - vibrant purple */}
      <div
        style={{
          position: "absolute",
          left: 20,
          top: 20,
          width: gridSize * CELL_SIZE + 4,
          height: gridSize * CELL_SIZE + 4,
          border: "2px solid #7C3AED",
          borderRadius: "12px",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 22,
          top: 22,
          width: gridSize * CELL_SIZE,
          height: gridSize * CELL_SIZE,
        }}
      >
        {/* Layer 1: Cell grid */}
        <div
          className="grid absolute"
          style={{
            gridTemplateColumns: `repeat(${gridSize}, ${CELL_SIZE}px)`,
            gridTemplateRows: `repeat(${gridSize}, ${CELL_SIZE}px)`,
            left: 0,
            top: 0,
            contain: "layout style paint", // CSS containment for performance
          }}
        >
          {cells.map((row, r) =>
            row.map((value, c) => (
              <TripodCell
                key={`cell-${r}-${c}`}
                row={r}
                col={c}
                value={hideNumbers ? 0 : value}
                isGiven={givenCells[r]?.[c] ?? false}
                isSelected={selectedCell?.row === r && selectedCell?.col === c}
                isHighlighted={isHighlighted(r, c)}
                hasError={hasCellError(r, c)}
                regionColor={getCellRegionColor(r, c)}
                onClick={() => onCellSelect(r, c)}
                inputMode={inputMode}
                hideNumber={hideNumbers}
              />
            )),
          )}
        </div>

        {/* Layer 2: Horizontal borders */}
        {horizontalBorders.map((row, r) =>
          row.map((active, c) => (
            <BorderEdge
              key={`h-${r}-${c}`}
              type="horizontal"
              row={r}
              col={c}
              active={active}
              cellSize={CELL_SIZE}
              onClick={() => onBorderToggle("h", r, c)}
              clickable={inputMode === "border" && !bordersFixed}
              isFixed={bordersFixed && active}
              toggleState={getBorderToggleability?.("h", r, c)}
              isTouchDevice={isTouchDevice}
            />
          )),
        )}

        {/* Layer 3: Vertical borders */}
        {verticalBorders.map((row, r) =>
          row.map((active, c) => (
            <BorderEdge
              key={`v-${r}-${c}`}
              type="vertical"
              row={r}
              col={c}
              active={active}
              cellSize={CELL_SIZE}
              onClick={() => onBorderToggle("v", r, c)}
              clickable={inputMode === "border" && !bordersFixed}
              isFixed={bordersFixed && active}
              toggleState={getBorderToggleability?.("v", r, c)}
              isTouchDevice={isTouchDevice}
            />
          )),
        )}

        {/* Layer 4: Tripod dots */}
        {tripodDots.map((row, r) =>
          row.map(
            (hasDot, c) =>
              hasDot && (
                <TripodDot
                  key={`dot-${r}-${c}`}
                  row={r}
                  col={c}
                  cellSize={CELL_SIZE}
                  isSatisfied={isVertexSatisfied?.(r, c) ?? false}
                  isError={(getVertexErrors?.(r, c)?.length ?? 0) > 0}
                />
              ),
          ),
        )}
      </div>
    </div>
  );
}
