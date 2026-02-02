'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

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
  inputMode: 'number' | 'border';
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
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 250);
      return () => clearTimeout(timer);
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

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    // Delay removing touch state for visual feedback
    touchTimeoutRef.current = setTimeout(() => {
      setIsTouching(false);
    }, 100);
    onClick();
  }, [onClick]);

  const handleTouchCancel = useCallback(() => {
    setIsTouching(false);
  }, []);

  return (
    <>
      <style>{numberEntryKeyframes}</style>
      <div
        className={`
          relative flex items-center justify-center
          w-full h-full
          border border-gray-300
          select-none touch-none
          ${isSelected ? 'ring-2 ring-indigo-500 z-10' : ''}
          ${isHighlighted ? 'bg-indigo-50' : ''}
          ${hasError ? 'bg-red-100' : ''}
          ${inputMode === 'border' ? 'cursor-crosshair' : 'cursor-pointer'}
          ${isTouching ? 'scale-95' : ''}
          active:scale-95
          transition-transform duration-100
        `}
        style={{
          backgroundColor: regionColor && !hasError && !isHighlighted ? regionColor : undefined,
          transition: 'background-color 300ms ease-in-out, transform 100ms ease-out',
        }}
        onClick={onClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
      >
        {value !== 0 && !hideNumber && (
          <span
            className={`
              text-xl sm:text-2xl font-semibold
              ${isGiven ? 'text-gray-800' : 'text-indigo-600'}
            `}
            style={{
              animation: isAnimating ? 'numberEntry 250ms ease-out' : undefined,
            }}
          >
            {value}
          </span>
        )}
      </div>
    </>
  );
}

