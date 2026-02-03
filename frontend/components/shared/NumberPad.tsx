"use client";

interface NumberPadProps {
  /** Maximum number to display (9 for classic, 7 or 9 for tripod) */
  maxNumber?: number;
  /** Callback when a number is selected */
  onNumberSelect: (number: number) => void;
  /** Optional erase handler (for classic mode) */
  onErase?: () => void;
  /** Disable all buttons */
  disabled?: boolean;
  /** Numbers that should be disabled (classic mode - when count reaches 9) */
  disabledNumbers?: number[];
  /** Count of each number on the grid (classic mode only) */
  numberCounts?: Record<number, number>;
  /** Show count indicators like "x/9" (classic mode only) */
  showCounts?: boolean;
  /** Mobile responsive sizing */
  isMobile?: boolean;
}

export function NumberPad({
  maxNumber = 9,
  onNumberSelect,
  onErase,
  disabled = false,
  disabledNumbers = [],
  numberCounts = {},
  showCounts = false,
  isMobile = false,
}: NumberPadProps) {
  const numbers = Array.from({ length: maxNumber }, (_, i) => i + 1);

  const isNumberDisabled = (num: number) => {
    return disabled || disabledNumbers.includes(num);
  };

  const getNumberCount = (num: number) => {
    return numberCounts[num] || 0;
  };

  // For tripod mode: dynamic grid columns
  const getGridColumns = () => {
    if (isMobile && maxNumber > 6) {
      return 3; // 3 columns for small screens with many numbers
    }
    return Math.min(maxNumber, 5);
  };

  // Classic mode (showCounts = true) - use 3x3 grid layout
  if (showCounts) {
    return (
      <div
        role="group"
        aria-label="Number pad - select a number to place in the grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "10px",
          width: "100%",
        }}
      >
        {numbers.map((num) => {
          const isDisabled = isNumberDisabled(num);
          const count = getNumberCount(num);
          const isComplete = count >= maxNumber;

          return (
            <button
              type="button"
              key={num}
              onClick={() => onNumberSelect(num)}
              disabled={isDisabled}
              aria-label={`Enter number ${num}, ${count} of ${maxNumber} placed${isComplete ? ", complete" : ""}`}
              style={{
                width: "56px",
                height: "56px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                fontWeight: 700,
                borderRadius: "12px",
                border: isComplete ? "2px solid #10b981" : "2px solid #c7d2fe",
                backgroundColor: isComplete ? "#d1fae5" : "white",
                color: isComplete ? "#059669" : "#4338ca",
                cursor: isDisabled ? "not-allowed" : "pointer",
                opacity: isDisabled ? 0.4 : 1,
                transition: "all 0.15s ease",
                position: "relative",
              }}
              className={`${
                isComplete
                  ? "dark:bg-emerald-900/30 dark:border-emerald-600 dark:text-emerald-400"
                  : "dark:bg-slate-700 dark:border-slate-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-slate-600"
              }`}
            >
              <span>{num}</span>
              {/* Show count indicator */}
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 500,
                  color: isComplete ? "#059669" : "#9ca3af",
                  marginTop: "-2px",
                }}
                className={
                  isComplete ? "dark:text-emerald-400" : "dark:text-gray-500"
                }
              >
                {count}/{maxNumber}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  // Tripod mode (showCounts = false) - dynamic layout with clear button
  return (
    <div className="flex flex-col gap-2">
      <div
        className="grid gap-1.5 sm:gap-2"
        style={{
          gridTemplateColumns: `repeat(${getGridColumns()}, 1fr)`,
        }}
      >
        {numbers.map((num) => {
          const isDisabled = isNumberDisabled(num);

          return (
            <button
              type="button"
              key={num}
              className={`
                w-full aspect-square min-w-[40px] min-h-[44px] sm:w-12 sm:h-12
                rounded-lg font-bold text-lg sm:text-xl
                transition-all duration-100
                touch-none select-none
                active:scale-90
                ${
                  isDisabled
                    ? "bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed"
                    : "bg-white dark:bg-slate-700 border-2 border-gray-200 dark:border-slate-600 text-gray-800 dark:text-white hover:bg-indigo-50 dark:hover:bg-slate-600 hover:border-indigo-300 dark:hover:border-indigo-400 active:bg-indigo-100 dark:active:bg-indigo-900"
                }
              `}
              onClick={() => !isDisabled && onNumberSelect(num)}
              disabled={isDisabled}
              aria-label={`Enter number ${num}`}
            >
              {num}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className={`
          w-full py-3 sm:py-2 rounded-lg font-medium min-h-[44px]
          transition-all duration-100
          touch-none select-none
          active:scale-95
          ${
            disabled
              ? "bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed"
              : "bg-gray-200 dark:bg-slate-600 text-gray-600 dark:text-gray-300 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400"
          }
        `}
        onClick={() => !disabled && onNumberSelect(0)}
        disabled={disabled}
        aria-label="Clear cell"
      >
        ✕ Clear
      </button>
    </div>
  );
}
