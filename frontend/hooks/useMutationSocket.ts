'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useGameStore } from '@/store/game';
import { socketService } from '@/lib/socket';
import { SOCKET_EVENTS, MUTATION_CONFIG } from '@/lib/constants';

interface MutationOccurredEvent {
  gameId: string;
  row: number;
  col: number;
  previousValue: number;
  mutationNumber: number;
  nextMutationIn: number;
}

interface MutationStartedEvent {
  gameId: string;
  intervalMs: number;
  nextMutationAt: number;
}

interface MutationStoppedEvent {
  gameId: string;
}

export function useMutationSocket() {
  const {
    gameMode,
    id: gameId,
    handleMutation,
    setMutationAnimating,
    setNextMutationAt,
    setLastMutatedCell,
  } = useGameStore();

  // #21/#22: Add refs for timeout tracking
  const mutationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMutationOccurred = useCallback((event: MutationOccurredEvent) => {
    if (event.gameId !== gameId) return;

    // #22: Clear any pending timeouts from previous mutation
    if (mutationTimeoutRef.current) {
      clearTimeout(mutationTimeoutRef.current);
    }
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }

    // Trigger animation with previousValue for fade-out effect
    setLastMutatedCell({ row: event.row, col: event.col, previousValue: event.previousValue });
    setMutationAnimating(true);

    // Apply mutation after animation delay (600ms for fade-out to complete)
    mutationTimeoutRef.current = setTimeout(() => {
      handleMutation(event.row, event.col);
    }, 600);

    // Clear animation state after animation completes
    animationTimeoutRef.current = setTimeout(() => {
      setMutationAnimating(false);
      setLastMutatedCell(null);
    }, MUTATION_CONFIG.ANIMATION_DURATION_MS);

    // Update next mutation time
    setNextMutationAt(Date.now() + event.nextMutationIn);
  }, [gameId, handleMutation, setMutationAnimating, setNextMutationAt, setLastMutatedCell]);

  const handleMutationStarted = useCallback((event: MutationStartedEvent) => {
    if (event.gameId !== gameId) return;
    setNextMutationAt(event.nextMutationAt);
  }, [gameId, setNextMutationAt]);

  const handleMutationStopped = useCallback((event: MutationStoppedEvent) => {
    if (event.gameId !== gameId) return;
    setNextMutationAt(null);
  }, [gameId, setNextMutationAt]);

  useEffect(() => {
    if (gameMode !== 'mutating') return;

    socketService.on(SOCKET_EVENTS.MUTATION_OCCURRED, handleMutationOccurred);
    socketService.on(SOCKET_EVENTS.MUTATION_STARTED, handleMutationStarted);
    socketService.on(SOCKET_EVENTS.MUTATION_STOPPED, handleMutationStopped);

    return () => {
      // #21: Clear timeouts on unmount
      if (mutationTimeoutRef.current) {
        clearTimeout(mutationTimeoutRef.current);
      }
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      socketService.off(SOCKET_EVENTS.MUTATION_OCCURRED, handleMutationOccurred);
      socketService.off(SOCKET_EVENTS.MUTATION_STARTED, handleMutationStarted);
      socketService.off(SOCKET_EVENTS.MUTATION_STOPPED, handleMutationStopped);
    };
  }, [gameMode, handleMutationOccurred, handleMutationStarted, handleMutationStopped]);

  return null; // This hook is for side effects only
}

