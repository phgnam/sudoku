'use client';

import { useState, useEffect, useRef } from 'react';

// CSS keyframes for dot animations
const dotAnimationKeyframes = `
@keyframes dotPop {
  0% { transform: scale(1); }
  50% { transform: scale(1.4); }
  100% { transform: scale(1); }
}

@keyframes dotPulse {
  0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5); }
  70% { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
  100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
}
`;

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
      setIsPopping(true);
      const timer = setTimeout(() => setIsPopping(false), 400);
      return () => clearTimeout(timer);
    }
    prevSatisfiedRef.current = isSatisfied;
  }, [isSatisfied]);

  let bgClass = 'bg-gray-900';
  if (isError) {
    bgClass = 'bg-red-500 ring-2 ring-red-300 animate-pulse';
  } else if (isSatisfied) {
    bgClass = 'bg-green-600 ring-2 ring-green-300';
  }

  return (
    <>
      <style>{dotAnimationKeyframes}</style>
      <div
        className={`absolute rounded-full z-20 pointer-events-none transition-all duration-300 ${bgClass}`}
        style={{
          left: col * cellSize - DOT_SIZE / 2,
          top: row * cellSize - DOT_SIZE / 2,
          width: DOT_SIZE,
          height: DOT_SIZE,
          animation: isPopping
            ? 'dotPop 400ms ease-out'
            : isSatisfied
              ? 'dotPulse 2s ease-in-out infinite'
              : undefined,
        }}
        title={isError ? 'Tripod violation' : isSatisfied ? 'Satisfied' : 'Tripod dot'}
      />
    </>
  );
}

