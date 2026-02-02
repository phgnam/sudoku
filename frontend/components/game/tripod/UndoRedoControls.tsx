"use client";

import React, { useEffect } from "react";

export interface UndoRedoControlsProps {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function UndoRedoControls({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: UndoRedoControlsProps) {
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        // Allow default undo/redo in inputs
        if (
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          (e.target as HTMLElement).isContentEditable
        ) {
          return;
        }

        if (e.key === "z" && !e.shiftKey) {
          e.preventDefault();
          if (canUndo) onUndo();
        } else if ((e.key === "z" && e.shiftKey) || e.key === "y") {
          e.preventDefault();
          if (canRedo) onRedo();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onUndo, onRedo, canUndo, canRedo]);

  return (
    <div className="flex gap-2 items-center p-2 sm:p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-1 hidden sm:inline">
        Borders:
      </span>

      {/* Undo Button */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className={`
          flex items-center justify-center w-10 h-10 sm:w-10 sm:h-10 min-h-[44px] min-w-[44px]
          rounded-lg border-none touch-none select-none
          transition-all duration-150 active:scale-90
          ${
            canUndo
              ? "bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-500 cursor-pointer"
              : "bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed"
          }
        `}
        title="Undo (Ctrl+Z)"
        aria-label="Undo border action"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4"
          />
        </svg>
      </button>

      {/* Redo Button */}
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className={`
          flex items-center justify-center w-10 h-10 sm:w-10 sm:h-10 min-h-[44px] min-w-[44px]
          rounded-lg border-none touch-none select-none
          transition-all duration-150 active:scale-90
          ${
            canRedo
              ? "bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-500 cursor-pointer"
              : "bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed"
          }
        `}
        title="Redo (Ctrl+Shift+Z or Ctrl+Y)"
        aria-label="Redo border action"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 10H11a5 5 0 00-5 5v2M21 10l-4-4M21 10l-4 4"
          />
        </svg>
      </button>
    </div>
  );
}
