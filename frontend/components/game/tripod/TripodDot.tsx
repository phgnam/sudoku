"use client";

import { useState, useEffect, useRef } from "react";

// CSS keyframes for dot animations
// CSS keyframes for dot animations are defined in globals.css

interface TripodDotProps {
  row: number;
  col: number;
  cellSize: number;
  isError?: boolean;
  isSatisfied?: boolean;
}

export function TripodDot({
  row,
  col,
  cellSize,
  isError = false,
  isSatisfied = false,
}: TripodDotProps) {
  // Scale dot size based on cell size (roughly 30% of cell size, clamped)
  const DOT_SIZE = Math.max(10, Math.min(16, Math.floor(cellSize * 0.3)));
  const [isPopping, setIsPopping] = useState(false);
  const prevSatisfiedRef = useRef(isSatisfied);

  // Detect when dot becomes satisfied
  useEffect(() => {
    if (isSatisfied && !prevSatisfiedRef.current) {
      requestAnimationFrame(() => setIsPopping(true));
      const timer = setTimeout(() => setIsPopping(false), 400);
      return () => clearTimeout(timer);
    }
    prevSatisfiedRef.current = isSatisfied;
  }, [isSatisfied]);

  let bgClass = "bg-gray-900";
  if (isError) {
    bgClass = "bg-red-500 ring-2 ring-red-300 animate-pulse";
  } else if (isSatisfied) {
    bgClass = "bg-green-600 ring-2 ring-green-300";
  }

  return (
    <div
      className={`absolute rounded-full z-20 pointer-events-none transition-all duration-300 ${bgClass}`}
      style={{
        left: col * cellSize - DOT_SIZE / 2,
        top: row * cellSize - DOT_SIZE / 2,
        width: DOT_SIZE,
        height: DOT_SIZE,
        animation: isPopping
          ? "dotPop 400ms ease-out"
          : isSatisfied
            ? "dotPulse 2s ease-in-out infinite"
            : undefined,
      }}
      title={
        isError ? "Tripod violation" : isSatisfied ? "Satisfied" : "Tripod dot"
      }
    />
  );
}
