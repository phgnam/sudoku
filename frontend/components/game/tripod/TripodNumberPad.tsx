'use client';

interface TripodNumberPadProps {
  maxNumber: number; // 7 for 7x7, 9 for 9x9
  onNumberSelect: (num: number) => void;
  disabled?: boolean;
  /** Whether device is mobile (uses larger buttons) */
  isMobile?: boolean;
}

export function TripodNumberPad({
  maxNumber,
  onNumberSelect,
  disabled,
  isMobile = false,
}: TripodNumberPadProps) {
  const numbers = Array.from({ length: maxNumber }, (_, i) => i + 1);

  // Use 3 columns on very small screens, otherwise up to 5
  const getGridColumns = () => {
    if (isMobile && maxNumber > 6) {
      return 3; // 3 columns for small screens with many numbers
    }
    return Math.min(maxNumber, 5);
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        className="grid gap-1.5 sm:gap-2"
        style={{
          gridTemplateColumns: `repeat(${getGridColumns()}, 1fr)`,
        }}
      >
        {numbers.map((num) => (
          <button
            key={num}
            className={`
              w-full aspect-square min-w-[40px] min-h-[44px] sm:w-12 sm:h-12
              rounded-lg font-bold text-lg sm:text-xl
              transition-all duration-100
              touch-none select-none
              active:scale-90
              ${disabled
                ? 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed'
                : 'bg-white dark:bg-slate-700 border-2 border-gray-200 dark:border-slate-600 text-gray-800 dark:text-white hover:bg-indigo-50 dark:hover:bg-slate-600 hover:border-indigo-300 dark:hover:border-indigo-400 active:bg-indigo-100 dark:active:bg-indigo-900'
              }
            `}
            onClick={() => !disabled && onNumberSelect(num)}
            disabled={disabled}
          >
            {num}
          </button>
        ))}
      </div>
      <button
        className={`
          w-full py-3 sm:py-2 rounded-lg font-medium min-h-[44px]
          transition-all duration-100
          touch-none select-none
          active:scale-95
          ${disabled
            ? 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed'
            : 'bg-gray-200 dark:bg-slate-600 text-gray-600 dark:text-gray-300 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400'
          }
        `}
        onClick={() => !disabled && onNumberSelect(0)}
        disabled={disabled}
      >
        ✕ Clear
      </button>
    </div>
  );
}

