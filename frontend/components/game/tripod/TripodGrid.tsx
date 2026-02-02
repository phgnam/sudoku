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
        backgroundColor: "white",
        borderRadius: "16px",
        boxShadow: "0 10px 25px rgba(79, 70, 229, 0.15)",
        border: "2px solid #c7d2fe",
        padding: "12px",
        width: gridSize * CELL_SIZE + 28, // 24px padding + 4px border
        height: gridSize * CELL_SIZE + 28,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 14,
          top: 14,
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
