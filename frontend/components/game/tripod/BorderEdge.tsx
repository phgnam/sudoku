'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export type BorderToggleState = 'can_toggle_on' | 'can_toggle_off' | 'blocked';

interface BorderEdgeProps {
  type: 'horizontal' | 'vertical';
  row: number;
  col: number;
  active: boolean;
  cellSize: number;
  onClick: () => void;
  clickable: boolean;
  isError?: boolean;
  isFixed?: boolean;
  /** Toggle state for visual feedback */
  toggleState?: BorderToggleState;
  /** Whether device is touch-enabled (increases hit area) */
  isTouchDevice?: boolean;
}

// CSS keyframes for border pulse animation
const borderPulseKeyframes = `
@keyframes borderPulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.15); opacity: 0.85; }
  100% { transform: scale(1); opacity: 1; }
}
`;

// Hit area sizes for different device types
const HIT_AREA_DESKTOP = 16;
const HIT_AREA_TOUCH = 28; // Larger for fat-finger friendly touch targets

export function BorderEdge({
  type,
  row,
  col,
  active,
  cellSize,
  onClick,
  clickable,
  isError,
  isFixed = false,
  toggleState = 'can_toggle_on',
  isTouchDevice = false,
}: BorderEdgeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPulsing, setIsPulsing] = useState(false);
  const [isTouching, setIsTouching] = useState(false);
  const prevActiveRef = useRef(active);
  const BORDER_WIDTH = 4;
  const HIT_AREA = isTouchDevice ? HIT_AREA_TOUCH : HIT_AREA_DESKTOP;

  // Detect when border is drawn (active changes from false to true)
  useEffect(() => {
    if (active && !prevActiveRef.current) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 300);
      return () => clearTimeout(timer);
    }
    prevActiveRef.current = active;
  }, [active]);

  const style: React.CSSProperties =
    type === 'horizontal'
      ? {
          position: 'absolute',
          left: col * cellSize,
          top: row * cellSize - HIT_AREA / 2,
          width: cellSize,
          height: HIT_AREA,
          cursor: clickable ? (toggleState === 'blocked' ? 'not-allowed' : 'pointer') : 'default',
          zIndex: 10,
        }
      : {
          position: 'absolute',
          left: col * cellSize - HIT_AREA / 2,
          top: row * cellSize,
          width: HIT_AREA,
          height: cellSize,
          cursor: clickable ? (toggleState === 'blocked' ? 'not-allowed' : 'pointer') : 'default',
          zIndex: 10,
        };

  const baseTransform = type === 'horizontal' ? 'translateY(-50%)' : 'translateX(-50%)';

  const innerStyle: React.CSSProperties =
    type === 'horizontal'
      ? {
          position: 'absolute',
          left: 0,
          top: '50%',
          transform: baseTransform,
          width: '100%',
          height: BORDER_WIDTH,
          transition: 'background-color 200ms ease, transform 200ms ease, opacity 200ms ease',
          animation: isPulsing ? 'borderPulse 300ms ease-out' : undefined,
          transformOrigin: 'center',
        }
      : {
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: baseTransform,
          width: BORDER_WIDTH,
          height: '100%',
          transition: 'background-color 200ms ease, transform 200ms ease, opacity 200ms ease',
          animation: isPulsing ? 'borderPulse 300ms ease-out' : undefined,
          transformOrigin: 'center',
        };

  // Determine border color based on state
  const getBorderColor = () => {
    // Show touch feedback when touching
    if (isTouching && clickable && toggleState !== 'blocked') {
      return active ? 'bg-amber-600' : 'bg-green-500';
    }
    if (!active) {
      // Inactive border - show hover feedback based on toggleState
      if (clickable && isHovered) {
        if (toggleState === 'blocked') {
          return 'bg-red-400'; // Red when blocked
        }
        return 'bg-green-400'; // Green when can toggle on
      }
      return 'bg-transparent';
    }
    // Active border colors
    if (isError) return 'bg-red-500';
    if (isFixed) return 'bg-teal-600'; // Fixed borders have distinct color
    // Show removal hint on hover
    if (clickable && isHovered) {
      return 'bg-amber-500'; // Amber when can toggle off
    }
    return 'bg-gray-800 dark:bg-gray-300';
  };

  const handleClick = useCallback(() => {
    if (clickable && toggleState !== 'blocked') {
      onClick();
    }
  }, [clickable, toggleState, onClick]);

  // Touch event handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (clickable && toggleState !== 'blocked') {
      // Prevent scrolling when touching borders
      e.preventDefault();
      setIsTouching(true);
    }
  }, [clickable, toggleState]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (isTouching) {
      e.preventDefault();
      setIsTouching(false);
      handleClick();
    }
  }, [isTouching, handleClick]);

  const handleTouchCancel = useCallback(() => {
    setIsTouching(false);
  }, []);

  return (
    <>
      <style>{borderPulseKeyframes}</style>
      <div
        className={`${clickable && toggleState !== 'blocked' ? 'hover:opacity-90' : ''} touch-none`}
        style={{
          ...style,
          // Apply scale feedback on touch
          transform: isTouching ? 'scale(1.1)' : undefined,
          transition: 'transform 100ms ease-out',
        }}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
      >
        <div
          className={`${getBorderColor()}`}
          style={innerStyle}
        />
      </div>
    </>
  );
}

