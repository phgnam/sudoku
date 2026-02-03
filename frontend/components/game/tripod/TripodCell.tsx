"use client";

import React, { useState, useEffect, useRef, useCallback, memo } from "react";

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

/**
 * TripodCell component - Memoized for performance
 * Only re-renders when props actually change
 */
const TripodCellComponent = ({
  value,
  isGiven,
  isSelected,
  isHighlighted,
  hasError,
  regionColor,
  onClick,
  inputMode,
  hideNumber = false,
}: TripodCellProps) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isTouching, setIsTouching] = useState(false);
  const prevValueRef = useRef(value);
  const touchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Detect when a new number is entered
  useEffect(() => {
    let animFrame: number | null = null;

    if (value !== 0 && prevValueRef.current !== value && !isGiven) {
      animFrame = requestAnimationFrame(() => {
        setIsAnimating(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setIsAnimating(false), 250);
      });
    }

    // Cleanup function
    return () => {
      if (animFrame !== null) {
        cancelAnimationFrame(animFrame);
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [value, isGiven]);

  // Update prevValueRef after the effect has run and potentially used the old value
  useEffect(() => {
    prevValueRef.current = value;
  }, [value]);

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
};

/**
 * Memoized TripodCell with custom comparison
 * Prevents unnecessary re-renders when props haven't changed
 */
export const TripodCell = memo<TripodCellProps>(
  TripodCellComponent,
  (prev, next) => {
    // Custom comparison for performance
    // Only re-render if these specific props change
    return (
      prev.value === next.value &&
      prev.isSelected === next.isSelected &&
      prev.isHighlighted === next.isHighlighted &&
      prev.hasError === next.hasError &&
      prev.isGiven === next.isGiven &&
      prev.regionColor === next.regionColor &&
      prev.inputMode === next.inputMode &&
      prev.hideNumber === next.hideNumber
      // onClick is excluded - function reference changes don't matter
    );
  }
);

TripodCell.displayName = 'TripodCell';
