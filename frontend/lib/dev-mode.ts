/**
 * Dev Mode Utility
 * 
 * This module provides developer tools for debugging the Sudoku game.
 * In the browser console, you can use the following commands:
 * 
 * - devMode.showSolution() - Display the complete solution grid
 * - devMode.showCurrentState() - Display the current game state
 * - devMode.showAnswers() - Show remaining answers (cells to fill)
 * - devMode.fillAll() - Auto-fill all remaining cells with correct answers
 * - devMode.help() - Show available commands
 * 
 * To enable, type in console: SUDOKU_DEV
 */

import { useGameStore } from "@/store/game";

interface DevModeAPI {
  showSolution: () => void;
  showCurrentState: () => void;
  showAnswers: () => void;
  showDiff: () => void;
  fillAll: () => void;
  help: () => void;
}

const formatGrid = (grid: number[][]): string => {
  let result = "\n";
  for (let i = 0; i < 9; i++) {
    if (i % 3 === 0 && i !== 0) {
      result += "------+-------+------\n";
    }
    let row = "";
    for (let j = 0; j < 9; j++) {
      if (j % 3 === 0 && j !== 0) {
        row += "| ";
      }
      row += (grid[i][j] === 0 ? "." : grid[i][j].toString()) + " ";
    }
    result += row + "\n";
  }
  return result;
};

const createDevModeAPI = (): DevModeAPI => ({
  showSolution: () => {
    const state = useGameStore.getState();
    if (!state.solution) {
      console.log("❌ No solution available. Start a game first.");
      return;
    }
    console.log("%c📋 SOLUTION:", "color: #4CAF50; font-weight: bold; font-size: 14px;");
    console.log(formatGrid(state.solution));
    console.table(state.solution);
  },

  showCurrentState: () => {
    const state = useGameStore.getState();
    console.log("%c🎮 CURRENT STATE:", "color: #2196F3; font-weight: bold; font-size: 14px;");
    console.log(formatGrid(state.currentState));
    console.table(state.currentState);
  },

  showAnswers: () => {
    const state = useGameStore.getState();
    if (!state.solution) {
      console.log("❌ No solution available. Start a game first.");
      return;
    }
    
    console.log("%c🔍 REMAINING ANSWERS:", "color: #FF9800; font-weight: bold; font-size: 14px;");
    const remaining: Array<{ row: number; col: number; answer: number }> = [];
    
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (state.currentState[row][col] === 0) {
          remaining.push({ row: row + 1, col: col + 1, answer: state.solution[row][col] });
        }
      }
    }
    
    if (remaining.length === 0) {
      console.log("✅ All cells are filled!");
    } else {
      console.log(`📊 ${remaining.length} cells remaining:`);
      console.table(remaining);
    }
  },

  showDiff: () => {
    const state = useGameStore.getState();
    if (!state.solution) {
      console.log("❌ No solution available. Start a game first.");
      return;
    }
    
    console.log("%c🔄 DIFF (Current vs Solution):", "color: #9C27B0; font-weight: bold; font-size: 14px;");
    const diff: Array<{ row: number; col: number; current: number | string; solution: number }> = [];
    
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (state.currentState[row][col] !== state.solution[row][col]) {
          diff.push({
            row: row + 1,
            col: col + 1,
            current: state.currentState[row][col] === 0 ? "empty" : state.currentState[row][col],
            solution: state.solution[row][col],
          });
        }
      }
    }
    
    if (diff.length === 0) {
      console.log("✅ Perfect! Current state matches solution!");
    } else {
      console.log(`📊 ${diff.length} differences found:`);
      console.table(diff);
    }
  },

  fillAll: () => {
    const state = useGameStore.getState();
    if (!state.solution) {
      console.log("❌ No solution available. Start a game first.");
      return;
    }
    
    // Create a copy of the solution
    const newState = state.solution.map(row => [...row]);
    useGameStore.getState().updateState(newState);
    console.log("%c✨ All cells filled with correct answers!", "color: #4CAF50; font-weight: bold;");
  },

  help: () => {
    console.log(`
%c🎮 SUDOKU DEV MODE - Available Commands:
%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

%cdevMode.showSolution()%c   - Display the complete solution grid
%cdevMode.showCurrentState()%c - Display the current game state
%cdevMode.showAnswers()%c    - Show remaining cells to fill with answers
%cdevMode.showDiff()%c       - Compare current state with solution
%cdevMode.fillAll()%c        - Auto-fill all cells with correct answers
%cdevMode.help()%c           - Show this help message

%c💡 Tip: Use console.table(devMode.showSolution()) for grid view
`,
      "color: #FF5722; font-weight: bold; font-size: 16px;",
      "color: #666;",
      "color: #2196F3; font-weight: bold;", "color: #666;",
      "color: #2196F3; font-weight: bold;", "color: #666;",
      "color: #2196F3; font-weight: bold;", "color: #666;",
      "color: #2196F3; font-weight: bold;", "color: #666;",
      "color: #2196F3; font-weight: bold;", "color: #666;",
      "color: #2196F3; font-weight: bold;", "color: #666;",
      "color: #888; font-style: italic;"
    );
  },
});

// Track if dev mode has been initialized
let devModeInitialized = false;

// Initialize dev mode - expose to window object
export const initDevMode = () => {
  if (typeof window === "undefined" || devModeInitialized) {
    return;
  }

  devModeInitialized = true;
  const devModeAPI = createDevModeAPI();

  // Expose devMode object globally
  (window as any).devMode = devModeAPI;

  // Create a magic signal - typing "SUDOKU_DEV" in console activates dev mode with banner
  Object.defineProperty(window, "SUDOKU_DEV", {
    get: () => {
      console.log(`
%c🎮 SUDOKU DEV MODE ACTIVATED! 🎮
%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
%cType %cdevMode.help()%c for available commands
`,
        "color: #FF5722; font-weight: bold; font-size: 20px; text-shadow: 2px 2px #000;",
        "color: #FF5722;",
        "color: #666;", "color: #2196F3; font-weight: bold;", "color: #666;"
      );
      devModeAPI.help();
      return devModeAPI;
    },
    configurable: true, // Allow redefinition if needed
  });

  // Log initial message
  console.log("%c🎮 Sudoku Dev Mode available! Type SUDOKU_DEV in console to activate.",
    "color: #888; font-style: italic;");
};

