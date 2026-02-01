'use client';

import { useEffect, useState } from 'react';

interface MutationTimerProps {
  nextMutationAt: number | null;
  mutationCount: number;
  isPaused?: boolean;
}

export function MutationTimer({ nextMutationAt, mutationCount, isPaused = false }: MutationTimerProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(30);
  const isWarning = secondsRemaining <= 5;

  useEffect(() => {
    if (!nextMutationAt || isPaused) return;
    
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((nextMutationAt - Date.now()) / 1000));
      setSecondsRemaining(remaining);
    }, 100);
    
    return () => clearInterval(interval);
  }, [nextMutationAt, isPaused]);

  return (
    <div className={`mutation-timer flex items-center gap-2 px-3 py-2 rounded-lg ${isWarning ? 'mutation-timer-warning bg-red-100 dark:bg-red-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'}`}>
      <span className="text-lg">{isWarning ? '⚠️' : '🧬'}</span>
      <div className="flex flex-col">
        <span className={`text-sm font-bold ${isWarning ? 'text-red-600 dark:text-red-400' : 'text-yellow-700 dark:text-yellow-400'}`}>
          {secondsRemaining}s
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Mutation #{mutationCount + 1}
        </span>
      </div>
    </div>
  );
}

