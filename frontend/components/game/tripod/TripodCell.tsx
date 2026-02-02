"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// CSS keyframes for number entry animation
const numberEntryKeyframes = `
@keyframes numberEntry {
  0% { transform: scale(0.5); opacity: 0; }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}
`;

interface TripodCellProps {
  row: number;
  col: number;
  value: number;
  isGiven: boolean;
  isSelected: boolean;
  isHighlighted: boolean;
  hasError: boolean;
  regionColor?: string;
  onClick: () => void;
  inputMode: "number" | "border";
  hideNumber?: boolean;
}

export function TripodCell({
  value,
  isGiven,
  isSelected,
  isHighlighted,
  hasError,
  regionColor,
  onClick,
  inputMode,
  hideNumber = false,
}: TripodCellProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isTouching, setIsTouching] = useState(false);
  const prevValueRef = useRef(value);
  const touchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Detect when a new number is entered
  useEffect(() => {
    if (value !== 0 && prevValueRef.current !== value && !isGiven) {
      // Use requestAnimationFrame to avoid synchronous setState in useEffect
      const animFrame = requestAnimationFrame(() => {
        setIsAnimating(true);
        const timer = setTimeout(() => setIsAnimating(false), 250);

        // Cleanup timeout if effect re-runs or unmounts
        return () => clearTimeout(timer);
      });

      // Cleanup animation frame
      return () => cancelAnimationFrame(animFrame);
    }
    prevValueRef.current = value;
  }, [value, isGiven]);

  // Clean up touch timeout on unmount
  useEffect(() => {
    return () => {
      if (touchTimeoutRef.current) {
        clearTimeout(touchTimeoutRef.current);
      }
    };
  }, []);

  // Touch handlers for mobile feedback
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Prevent double-tap zoom
    e.preventDefault();
    setIsTouching(true);
    // Clear any existing timeout
    if (touchTimeoutRef.current) {
      clearTimeout(touchTimeoutRef.current);
    }
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      // Delay removing touch state for visual feedback
      touchTimeoutRef.current = setTimeout(() => {
        setIsTouching(false);
      }, 100);
      onClick();
    },
    [onClick],
  );

  const handleTouchCancel = useCallback(() => {
    setIsTouching(false);
  }, []);

  return (
    <>
      <style>{numberEntryKeyframes}</style>
      <div
        className="relative flex items-center justify-center w-full h-full select-none touch-none"
        style={{
          backgroundColor: (() => {
            if (hasError) return "#fecaca"; // Red for errors
            if (isSelected) return "#ffedd5"; // Orange for selected
            if (isHighlighted && !isSelected) return "#eef2ff"; // Light indigo for highlighted
            if (isGiven) return "#e0e7ff"; // Light indigo for given cells
            if (regionColor) return regionColor; // Region color
            return "white"; // Default white
          })(),
          border: "1px solid #c7d2fe",
          cursor: inputMode === "border" ? "crosshair" : "pointer",
          outline: isSelected ? "2px solid #f97316" : "none",
          outlineOffset: "-2px",
          transition:
            "background-color 0.15s ease, outline 0.15s ease, transform 0.1s ease-out",
          transform: isTouching ? "scale(0.95)" : "scale(1)",
        }}
        onClick={onClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
      >
        {value !== 0 && !hideNumber && (
          <span
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: isGiven ? "#1e1b4b" : "#4338ca",
              animation: isAnimating ? "numberEntry 250ms ease-out" : undefined,
            }}
          >
            {value}
          </span>
        )}
      </div>
    </>
  );
}
