'use client';

import type { TripodSubMode } from '@/types/tripod';

interface SubModeSelectorProps {
  currentMode: TripodSubMode;
  onModeSelect: (mode: TripodSubMode) => void;
  disabled?: boolean;
}

interface ModeOption {
  mode: TripodSubMode;
  icon: string;
  label: string;
  description: string;
}

const MODE_OPTIONS: ModeOption[] = [
  {
    mode: 'borders_only',
    icon: '🔳',
    label: 'Borders Only',
    description: 'Draw regions without numbers',
  },
  {
    mode: 'sudoku_only',
    icon: '🔢',
    label: 'Sudoku Only',
    description: 'Solve with pre-drawn regions',
  },
  {
    mode: 'full',
    icon: '🎯',
    label: 'Full Tripod',
    description: 'Complete experience',
  },
];

export function SubModeSelector({
  currentMode,
  onModeSelect,
  disabled = false,
}: SubModeSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
        Game Mode
      </span>
      <div className="flex gap-2 flex-wrap">
        {MODE_OPTIONS.map((option) => {
          const isActive = currentMode === option.mode;
          return (
            <button
              key={option.mode}
              onClick={() => onModeSelect(option.mode)}
              disabled={disabled}
              title={option.description}
              className={`
                flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2 rounded-full
                text-xs sm:text-sm font-medium transition-all duration-200
                min-h-[44px] touch-none select-none active:scale-95
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${isActive
                  ? 'bg-teal-500 text-white shadow-md'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }
              `}
            >
              <span className="text-base sm:text-lg">{option.icon}</span>
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        {MODE_OPTIONS.find((o) => o.mode === currentMode)?.description}
      </p>
    </div>
  );
}

