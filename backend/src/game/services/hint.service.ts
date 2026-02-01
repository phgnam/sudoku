import { Injectable } from '@nestjs/common';
import { SudokuValidatorService } from './sudoku-validator.service';

export enum HintType {
  REVEAL_CELL = 'reveal_cell',
  SHOW_CONFLICTS = 'show_conflicts',
  HIGHLIGHT_SUGGESTION = 'highlight_suggestion',
}

export interface HintResult {
  type: HintType;
  data: any;
}

@Injectable()
export class HintService {
  constructor(private validator: SudokuValidatorService) {}

  // Type 1: Reveal Cell - Fill a random empty cell with correct value
  generateRevealCellHint(
    currentGrid: number[][],
    solution: number[][],
  ): HintResult | null {
    const emptyCells: Array<{ row: number; col: number }> = [];

    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (currentGrid[row][col] === 0) {
          emptyCells.push({ row, col });
        }
      }
    }

    if (emptyCells.length === 0) {
      return null; // No empty cells
    }

    // Pick random empty cell
    const randomIndex = Math.floor(Math.random() * emptyCells.length);
    const { row, col } = emptyCells[randomIndex];

    return {
      type: HintType.REVEAL_CELL,
      data: {
        row,
        col,
        value: solution[row][col],
      },
    };
  }

  // Type 2: Show Conflicts - Highlight cells with duplicate values
  generateShowConflictsHint(currentGrid: number[][]): HintResult | null {
    const conflicts = this.validator.findConflicts(currentGrid);

    if (conflicts.length === 0) {
      return null; // No conflicts
    }

    return {
      type: HintType.SHOW_CONFLICTS,
      data: {
        conflicts,
      },
    };
  }

  // Get numbers already present in a row (with their positions)
  private getRowNumbers(
    grid: number[][],
    row: number,
    excludeCol: number,
  ): Array<{ col: number; value: number }> {
    const numbers: Array<{ col: number; value: number }> = [];
    for (let col = 0; col < 9; col++) {
      if (col !== excludeCol && grid[row][col] !== 0) {
        numbers.push({ col, value: grid[row][col] });
      }
    }
    return numbers;
  }

  // Get numbers already present in a column (with their positions)
  private getColNumbers(
    grid: number[][],
    col: number,
    excludeRow: number,
  ): Array<{ row: number; value: number }> {
    const numbers: Array<{ row: number; value: number }> = [];
    for (let row = 0; row < 9; row++) {
      if (row !== excludeRow && grid[row][col] !== 0) {
        numbers.push({ row, value: grid[row][col] });
      }
    }
    return numbers;
  }

  // Get numbers already present in a 3x3 box (with their positions)
  private getBoxNumbers(
    grid: number[][],
    targetRow: number,
    targetCol: number,
  ): Array<{ row: number; col: number; value: number }> {
    const numbers: Array<{ row: number; col: number; value: number }> = [];
    const boxStartRow = Math.floor(targetRow / 3) * 3;
    const boxStartCol = Math.floor(targetCol / 3) * 3;

    for (let row = boxStartRow; row < boxStartRow + 3; row++) {
      for (let col = boxStartCol; col < boxStartCol + 3; col++) {
        if ((row !== targetRow || col !== targetCol) && grid[row][col] !== 0) {
          numbers.push({ row, col, value: grid[row][col] });
        }
      }
    }
    return numbers;
  }

  // Type 3: Highlight Suggestion with step-by-step explanation
  generateHighlightSuggestionHint(currentGrid: number[][]): HintResult | null {
    const singlePossibilityCells: Array<{
      row: number;
      col: number;
      value: number;
    }> = [];

    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (currentGrid[row][col] === 0) {
          const possibleValues = this.getPossibleValues(currentGrid, row, col);

          if (possibleValues.length === 1) {
            singlePossibilityCells.push({
              row,
              col,
              value: possibleValues[0],
            });
          }
        }
      }
    }

    if (singlePossibilityCells.length === 0) {
      return null;
    }

    // Pick a random cell
    const randomIndex = Math.floor(
      Math.random() * singlePossibilityCells.length,
    );
    const { row, col, value } = singlePossibilityCells[randomIndex];

    // Get step-by-step explanation data
    const rowNumbers = this.getRowNumbers(currentGrid, row, col);
    const colNumbers = this.getColNumbers(currentGrid, col, row);
    const boxNumbers = this.getBoxNumbers(currentGrid, row, col);

    // Extract just the values for display
    const rowValues = [...new Set(rowNumbers.map((n) => n.value))].sort(
      (a, b) => a - b,
    );
    const colValues = [...new Set(colNumbers.map((n) => n.value))].sort(
      (a, b) => a - b,
    );
    const boxValues = [...new Set(boxNumbers.map((n) => n.value))].sort(
      (a, b) => a - b,
    );

    // Get cells to highlight for each step
    const rowCells = rowNumbers.map((n) => ({ row, col: n.col }));
    const colCells = colNumbers.map((n) => ({ row: n.row, col }));
    const boxCells = boxNumbers.map((n) => ({ row: n.row, col: n.col }));

    return {
      type: HintType.HIGHLIGHT_SUGGESTION,
      data: {
        row,
        col,
        possibleValue: value,
        // Step-by-step explanation
        steps: {
          row: {
            values: rowValues,
            cells: rowCells,
          },
          col: {
            values: colValues,
            cells: colCells,
          },
          box: {
            values: boxValues,
            cells: boxCells,
          },
        },
      },
    };
  }

  // Get all possible values for a cell
  private getPossibleValues(
    grid: number[][],
    row: number,
    col: number,
  ): number[] {
    const possible: number[] = [];

    for (let num = 1; num <= 9; num++) {
      if (this.validator.isValidMove(grid, row, col, num)) {
        possible.push(num);
      }
    }

    return possible;
  }

  // Generate hint based on priority
  generateHint(currentGrid: number[][], solution: number[][]): HintResult {
    const conflictsHint = this.generateShowConflictsHint(currentGrid);
    if (conflictsHint) {
      return conflictsHint;
    }

    const suggestionHint = this.generateHighlightSuggestionHint(currentGrid);
    if (suggestionHint) {
      return suggestionHint;
    }

    const revealHint = this.generateRevealCellHint(currentGrid, solution);
    if (!revealHint) {
      // Puzzle is already complete - return no-op hint
      return {
        type: HintType.REVEAL_CELL,
        data: {
          type: 'complete' as const,
          message: 'Puzzle already solved!',
          cell: null,
          value: null,
        },
      };
    }
    return revealHint;
  }
}
