"use client";

interface NumberPadProps {
  onNumberSelect: (number: number) => void;
  onErase: () => void;
  disabled?: boolean;
  disabledNumbers?: number[]; // Numbers that are fully placed (9 times)
  numberCounts?: Record<number, number>; // Count of each number on the grid
}

export function NumberPad({
  onNumberSelect,
  onErase,
  disabled = false,
  disabledNumbers = [],
  numberCounts = {},
}: NumberPadProps) {
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  const isNumberDisabled = (num: number) => {
    return disabled || disabledNumbers.includes(num);
  };

  const getNumberCount = (num: number) => {
    return numberCounts[num] || 0;
  };

  return (
    <div
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
        const isComplete = count >= 9;

        return (
          <button
            key={num}
            onClick={() => onNumberSelect(num)}
            disabled={isDisabled}
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
              border: isComplete
                ? "2px solid #10b981"
                : "2px solid #c7d2fe",
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
              className={isComplete ? "dark:text-emerald-400" : "dark:text-gray-500"}
            >
              {count}/9
            </span>
          </button>
        );
      })}
    </div>
  );
}
