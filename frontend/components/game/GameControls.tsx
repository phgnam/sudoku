"use client";

import { useTranslations } from "next-intl";
import { useGameStore } from "@/store/game";
import { GAME_CONFIG } from "@/lib/constants";

interface GameControlsProps {
  onUndo: () => void;
  onHint: () => void;
  onErase: () => void;
  onNewGame: () => void;
  onToggleNotes?: () => void;
  canUndo: boolean;
  canUseHint: boolean;
  canErase: boolean;
  notesMode?: boolean;
}

export function GameControls({
  onUndo,
  onHint,
  onErase,
  onNewGame,
  onToggleNotes,
  canUndo,
  canUseHint,
  canErase,
  notesMode = false,
}: GameControlsProps) {
  const { hintsUsed } = useGameStore();
  const t = useTranslations();

  // Action button style - vertical layout for desktop sidebar
  const actionButtonStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: "12px",
    padding: "12px 16px",
    borderRadius: "10px",
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    cursor: "pointer",
    width: "100%",
    transition: "all 0.15s ease",
    fontSize: "14px",
    fontWeight: 500,
    color: "#475569",
  };

  const iconStyle = {
    width: "20px",
    height: "20px",
    flexShrink: 0,
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        width: "100%",
      }}
    >
      {/* Undo */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        style={{
          ...actionButtonStyle,
          opacity: canUndo ? 1 : 0.5,
          cursor: canUndo ? "pointer" : "not-allowed",
        }}
        className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          style={iconStyle}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
          />
        </svg>
        <span>{t('game.controls.undo')}</span>
      </button>

      {/* Erase */}
      <button
        onClick={onErase}
        disabled={!canErase}
        style={{
          ...actionButtonStyle,
          opacity: canErase ? 1 : 0.5,
          cursor: canErase ? "pointer" : "not-allowed",
        }}
        className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          style={iconStyle}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414-6.414a2 2 0 011.414-.586H19a2 2 0 012 2v10a2 2 0 01-2 2h-8.172a2 2 0 01-1.414-.586L3 12z"
          />
        </svg>
        <span>{t('game.controls.erase')}</span>
      </button>

      {/* Notes */}
      <button
        onClick={onToggleNotes}
        style={{
          ...actionButtonStyle,
          backgroundColor: notesMode ? "#4f46e5" : "#f8fafc",
          borderColor: notesMode ? "#4f46e5" : "#e2e8f0",
          color: notesMode ? "white" : "#475569",
        }}
        className={
          notesMode
            ? ""
            : "dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600"
        }
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          style={iconStyle}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
          />
        </svg>
        <span>{t('game.controls.notes')}</span>
      </button>

      {/* Hint */}
      <button
        onClick={onHint}
        disabled={!canUseHint}
        style={{
          ...actionButtonStyle,
          opacity: canUseHint ? 1 : 0.5,
          cursor: canUseHint ? "pointer" : "not-allowed",
        }}
        className="dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          style={iconStyle}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
        <span>
          {t('game.controls.hint')} ({hintsUsed}/{GAME_CONFIG.MAX_HINTS})
        </span>
      </button>
    </div>
  );
}
