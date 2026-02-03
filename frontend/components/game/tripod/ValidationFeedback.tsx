'use client';

import { useState, useEffect, useRef } from 'react';
import type { TripodError } from '@/types/tripod';

// CSS keyframes for validation animations
const validationKeyframes = `
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

@keyframes successPop {
  0% { transform: scale(0.8); opacity: 0; }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes fadeOut {
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(-10px); }
}
`;

const MAX_DISPLAYED_ERRORS = 20;

interface ValidationFeedbackProps {
  errors: TripodError[];
  isComplete: boolean;
  onValidate: () => void;
}

export function ValidationFeedback({ errors, isComplete, onValidate }: ValidationFeedbackProps) {
  const [isNewErrors, setIsNewErrors] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const prevErrorCountRef = useRef(errors.length);

  // Detect when errors appear or disappear
  useEffect(() => {
    if (errors.length > 0 && prevErrorCountRef.current === 0) {
      prevErrorCountRef.current = errors.length;
      setIsNewErrors(true);
      const timer = setTimeout(() => setIsNewErrors(false), 500);
      return () => clearTimeout(timer);
    } else if (errors.length === 0 && prevErrorCountRef.current > 0) {
      prevErrorCountRef.current = errors.length;
      setIsSuccess(true);
      const timer = setTimeout(() => setIsSuccess(false), 500);
      return () => clearTimeout(timer);
    }
    prevErrorCountRef.current = errors.length;
  }, [errors.length]);

  if (isComplete) {
    return (
      <>
        <style>{validationKeyframes}</style>
        <div
          className="p-4 bg-green-100 border border-green-300 rounded-lg"
          style={{ animation: 'successPop 400ms ease-out' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎉</span>
            <div>
              <p className="font-bold text-green-800">Congratulations!</p>
              <p className="text-green-700 text-sm">You solved the puzzle!</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  const groupedErrors = {
    region: errors.filter((e) => e.type === 'region_size' || e.type === 'not_connected'),
    tripod: errors.filter((e) => e.type === 'four_way' || e.type === 'tripod_mismatch'),
    sudoku: errors.filter((e) => e.type === 'sudoku_duplicate'),
  };

  return (
    <>
      <style>{validationKeyframes}</style>
      <div className="flex flex-col gap-3">
        <button
          onClick={onValidate}
          className="w-full py-3 sm:py-2 px-4 min-h-[44px] bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] touch-none select-none"
        >
          ✓ Check Solution
        </button>

        {errors.length > 0 && (
          <div
            className="p-3 bg-red-50 border border-red-200 rounded-lg"
            style={{
              animation: isNewErrors ? 'shake 400ms ease-out, fadeInUp 300ms ease-out' : undefined,
            }}
          >
            <p className="font-medium text-red-800 mb-2">
              {errors.length} {errors.length === 1 ? 'issue' : 'issues'} found:
            </p>
            <ul className="text-sm text-red-700 space-y-1">
              {groupedErrors.region.length > 0 && (
                <li
                  className="flex items-start gap-2"
                  style={{ animation: 'fadeInUp 300ms ease-out 100ms both' }}
                >
                  <span>📐</span>
                  <span>{groupedErrors.region.length} region size issue(s)</span>
                </li>
              )}
              {groupedErrors.tripod.length > 0 && (
                <li
                  className="flex items-start gap-2"
                  style={{ animation: 'fadeInUp 300ms ease-out 200ms both' }}
                >
                  <span>🔺</span>
                  <span>{groupedErrors.tripod.length} tripod violation(s)</span>
                </li>
              )}
              {groupedErrors.sudoku.length > 0 && (
                <li
                  className="flex items-start gap-2"
                  style={{ animation: 'fadeInUp 300ms ease-out 300ms both' }}
                >
                  <span>🔢</span>
                  <span>{groupedErrors.sudoku.length} duplicate number(s)</span>
                </li>
              )}
            </ul>
          </div>
        )}

        {errors.length === 0 && (
          <div
            className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 text-sm text-center"
            style={{
              animation: isSuccess ? 'successPop 400ms ease-out' : 'fadeInUp 300ms ease-out',
            }}
          >
            {isSuccess ? (
              <span className="text-green-600 font-medium">✓ Looking good so far!</span>
            ) : (
              'Click "Check Solution" to validate your answer'
            )}
          </div>
        )}
      </div>
    </>
  );
}

