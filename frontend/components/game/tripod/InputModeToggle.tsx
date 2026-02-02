'use client';

type InputMode = 'number' | 'border';

interface InputModeToggleProps {
  mode: InputMode;
  onModeChange: (mode: InputMode) => void;
  /** Whether to show keyboard shortcuts (hidden on mobile) */
  showShortcuts?: boolean;
}

export function InputModeToggle({ mode, onModeChange, showShortcuts = true }: InputModeToggleProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-1 gap-1">
        <button
          className={`
            flex-1 px-3 sm:px-4 py-3 sm:py-2 rounded-md font-medium transition-colors
            min-h-[44px] touch-none select-none
            active:scale-95 transition-transform duration-100
            ${mode === 'number'
              ? 'bg-white dark:bg-slate-600 shadow text-indigo-600 dark:text-indigo-400'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
            }
          `}
          onClick={() => onModeChange('number')}
        >
          <span className="mr-1 sm:mr-2">🔢</span>
          <span className="text-sm sm:text-base">Number</span>
        </button>
        <button
          className={`
            flex-1 px-3 sm:px-4 py-3 sm:py-2 rounded-md font-medium transition-colors
            min-h-[44px] touch-none select-none
            active:scale-95 transition-transform duration-100
            ${mode === 'border'
              ? 'bg-white dark:bg-slate-600 shadow text-indigo-600 dark:text-indigo-400'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white'
            }
          `}
          onClick={() => onModeChange('border')}
        >
          <span className="mr-1 sm:mr-2">✏️</span>
          <span className="text-sm sm:text-base">Border</span>
        </button>
      </div>
      {/* Keyboard shortcuts - hidden on small screens */}
      {showShortcuts && (
        <div className="hidden sm:block text-xs text-gray-500 dark:text-gray-400 text-center">
          Press <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-slate-600 rounded text-xs">Space</kbd> to toggle,
          <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-slate-600 rounded text-xs ml-1">N</kbd> for Number,
          <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-slate-600 rounded text-xs ml-1">B</kbd> for Border
        </div>
      )}
    </div>
  );
}

