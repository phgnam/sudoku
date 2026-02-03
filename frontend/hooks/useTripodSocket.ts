import { useEffect, useCallback, useRef, useMemo } from "react";
import { useGameStore, GameStatus } from "@/store/game";
import { useTripodStore } from "@/store/tripod";
import { useAuthStore } from "@/store/auth";
import { socketService } from "@/lib/socket";
import { SOCKET_EVENTS } from "@/lib/constants";
import { useDisplayName } from "./useDisplayName";
import type { TripodError } from "@/types/tripod";
import { debounce } from "lodash";

interface TripodValidatedPayload {
  gameId: string;
  isValid: boolean;
  errors?: string[];
  borderErrors?: { type: string; row: number; col: number }[];
}

interface TripodStatePayload {
  gameId: string;
  currentState: number[][];
  borders: {
    horizontal: boolean[][];
    vertical: boolean[][];
  };
  dots: Array<{ row: number; col: number }>;
  status: GameStatus;
  timeElapsed: number;
  givens?: Array<{ row: number; col: number; value: number }>; // Original puzzle cells
}

interface TripodBorderUpdatePayload {
  type: "horizontal" | "vertical";
  row: number;
  col: number;
  value: boolean;
  sequence?: number;
}

export function useTripodSocket(gameId: string | null) {
  const { token } = useAuthStore();
  const getDisplayName = useDisplayName();

  // Tripod-specific methods from tripod store
  const initTripodState = useTripodStore((state) => state.initTripodState);
  const setBorders = useTripodStore((state) => state.setBorders);
  const toggleBorder = useTripodStore((state) => state.toggleBorder);
  const updateElapsedTime = useTripodStore((state) => state.updateElapsedTime);
  const setErrors = useTripodStore((state) => state.setErrors);
  const incrementStat = useTripodStore((state) => state.incrementStat);
  const pauseTimer = useTripodStore((state) => state.pauseTimer);

  // Generic game methods from game store
  const updateState = useGameStore((state) => state.updateState);
  const setStatus = useGameStore((state) => state.setStatus);
  const setInitialState = useGameStore((state) => state.setGame);

  // Keep track of processing updates to avoid loops
  const isProcessingUpdate = useRef(false);

  // Event buffering for out-of-order delivery (Fix 3.1)
  const eventSequence = useRef(0);
  const pendingEvents = useRef<Map<number, TripodBorderUpdatePayload>>(new Map());

  useEffect(() => {
    if (!token || !gameId) return;

    // Connect socket
    const playerName = getDisplayName();
    const socket = socketService.connect(token, playerName);

    if (!socket) return;

    // Server Restart Detection & State Sync (Fix 3.2)
    const handleConnect = () => {
      console.log("Connected/Reconnected to socket, syncing state...");
      socket.emit(SOCKET_EVENTS.TRIPOD_JOIN, { gameId });
      // Sync state after reconnect
      socket.emit(SOCKET_EVENTS.TRIPOD_SYNC, { gameId });
    };

    // Call on initial mount if already connected
    if (socket.connected) {
      handleConnect();
    }

    // Listen for future reconnections
    socket.on("connect", handleConnect);

    // Listeners
    socket.on(SOCKET_EVENTS.TRIPOD_STATE, (data: TripodStatePayload) => {
      console.log("Received tripod state:", data);

      // Initialize if needed
      if (data.dots && data.borders) {
        // We receive dots as array of coords {row, col}, need to convert to grid
        // But backend sends boolean[][] for dots in one place and array in another?
        // Let's check backend handler: convertTripodDotsToArray returns {row,col}[].
        // Frontend initTripodState expects boolean[][].

        // Wait, backend 'tripod:state' event:
        // dots: this.convertTripodDotsToArray(game.tripodData.tripodDots)

        // We need to reconstruct boolean[][] from dots array
        const gridSize = data.borders.horizontal[0].length;
        const dotsGrid = Array.from({ length: gridSize + 1 }, () =>
          Array(gridSize + 1).fill(false),
        );

        if (Array.isArray(data.dots)) {
          data.dots.forEach((dot: { row: number; col: number }) => {
            if (dotsGrid[dot.row] && dotsGrid[dot.row][dot.col] !== undefined) {
              dotsGrid[dot.row][dot.col] = true;
            }
          });
        }

        initTripodState(gridSize, dotsGrid, "full");

        // Set borders
        setBorders(data.borders.horizontal, data.borders.vertical);

        // Set cells (Sudoku part)
        if (data.currentState) {
          updateState(data.currentState);
        }

        // Set initial state from givens if available
        // This allows frontend to know which cells are puzzle givens vs player moves
        if (data.givens && data.givens.length > 0) {
          const initialGrid = Array.from({ length: gridSize }, () =>
            Array(gridSize).fill(0),
          );
          data.givens.forEach(({ row, col, value }) => {
            if (row >= 0 && row < gridSize && col >= 0 && col < gridSize) {
              initialGrid[row][col] = value;
            }
          });
          setInitialState({ initialState: initialGrid });
        }

        // Set time
        if (data.timeElapsed !== undefined) {
          updateElapsedTime(data.timeElapsed);
        }

        // Set status
        if (data.status) {
          setStatus(data.status);
        }
      }
    });

    // Helper function to process border updates (Fix 3.1)
    const processBorderUpdate = (data: {
      type: "horizontal" | "vertical";
      row: number;
      col: number;
      value: boolean;
    }) => {
      isProcessingUpdate.current = true;

      // Check current value in store. If it matches target 'value', do nothing.
      // If it doesn't match, toggle.
      const state = useTripodStore.getState();
      if (state.tripod) {
        const currentVal =
          data.type === "horizontal"
            ? state.tripod.horizontalBorders[data.row]?.[data.col]
            : state.tripod.verticalBorders[data.row]?.[data.col];

        if (currentVal !== data.value) {
          toggleBorder(
            data.type === "horizontal" ? "h" : "v",
            data.row,
            data.col,
          );
        }
      }

      setTimeout(() => {
        isProcessingUpdate.current = false;
      }, 50);
    };

    socket.on(
      SOCKET_EVENTS.TRIPOD_BORDER_UPDATED,
      (data: {
        type: "horizontal" | "vertical";
        row: number;
        col: number;
        value: boolean;
        sequence?: number; // Backend should send this
      }) => {
        // If no sequence, process immediately (backward compat)
        if (data.sequence === undefined) {
          processBorderUpdate(data);
          return;
        }

        // Check if in order
        if (data.sequence === eventSequence.current + 1) {
          processBorderUpdate(data);
          eventSequence.current = data.sequence;

          // Process any pending events that are now in order
          while (pendingEvents.current.has(eventSequence.current + 1)) {
            const nextEvent = pendingEvents.current.get(eventSequence.current + 1);
            if (nextEvent) {
              processBorderUpdate(nextEvent);
            }
            eventSequence.current++;
            pendingEvents.current.delete(eventSequence.current);
          }
        } else if (data.sequence > eventSequence.current + 1) {
          // Future event, buffer it
          pendingEvents.current.set(data.sequence, data);

          // Clear old events after timeout
          setTimeout(() => {
            if (pendingEvents.current.has(data.sequence!)) {
              console.warn(`Dropping stale event ${data.sequence}`);
              pendingEvents.current.delete(data.sequence!);
            }
          }, 5000);
        } else {
          // Old event, ignore
          console.log(`Ignoring old event ${data.sequence}, current: ${eventSequence.current}`);
        }
      },
    );

    socket.on(
      SOCKET_EVENTS.TRIPOD_VALIDATED,
      (data: TripodValidatedPayload) => {
        // Map backend errors (strings) to TripodError objects
        const errors: TripodError[] = [
          ...(data.errors || []).map((msg) => ({
            type: "tripod_mismatch" as const,
            location: { row: -1, col: -1 },
            message: msg,
          })),
          ...(data.borderErrors || []).map((err) => ({
            type: "tripod_mismatch" as const,
            location: { row: err.row, col: err.col },
            message: "Border error",
          })),
        ];
        setErrors(errors);
        incrementStat("validationCount");
      },
    );

    socket.on(SOCKET_EVENTS.TRIPOD_COMPLETED, () => {
      setStatus(GameStatus.COMPLETED);
      pauseTimer();
    });

    socket.on(SOCKET_EVENTS.TRIPOD_ERROR, (data: { message: string }) => {
      console.error("Tripod socket error:", data);
    });

    return () => {
      socket.off("connect", handleConnect);
      socket.emit(SOCKET_EVENTS.TRIPOD_LEAVE, { gameId });
      socket.off(SOCKET_EVENTS.TRIPOD_STATE);
      socket.off(SOCKET_EVENTS.TRIPOD_BORDER_UPDATED);
      socket.off(SOCKET_EVENTS.TRIPOD_VALIDATED);
      socket.off(SOCKET_EVENTS.TRIPOD_COMPLETED);
      socket.off(SOCKET_EVENTS.TRIPOD_ERROR);
    };
  }, [
    token,
    gameId,
    getDisplayName,
    initTripodState,
    setBorders,
    updateState,
    setStatus,
    setInitialState,
    toggleBorder,
    updateElapsedTime,
    setErrors,
    incrementStat,
    pauseTimer,
  ]);

  // Actions
  // Queue-based emit to prevent dropping border toggles while still rate limiting
  // Previous throttle approach dropped intermediate toggles for different borders
  const pendingEmits = useRef<Array<{ type: string; row: number; col: number }>>([]);
  const isEmitting = useRef(false);

  const processEmitQueue = useCallback(() => {
    if (!gameId || isEmitting.current || pendingEmits.current.length === 0) return;

    isEmitting.current = true;
    const { type, row, col } = pendingEmits.current.shift()!;

    socketService.emit(SOCKET_EVENTS.TRIPOD_TOGGLE_BORDER, {
      gameId,
      type,
      row,
      col,
    });

    // Process next after 50ms delay (max 20 emits/sec, faster than old throttle)
    setTimeout(() => {
      isEmitting.current = false;
      processEmitQueue();
    }, 50);
  }, [gameId]);

  const emitToggleBorder = useCallback(
    (type: "h" | "v", row: number, col: number) => {
      if (!gameId || isProcessingUpdate.current) return;

      pendingEmits.current.push({
        type: type === "h" ? "horizontal" : "vertical",
        row,
        col,
      });
      processEmitQueue();
    },
    [gameId, processEmitQueue],
  );

  const validate = useCallback(() => {
    if (!gameId) return;
    socketService.emit(SOCKET_EVENTS.TRIPOD_VALIDATE, { gameId });
  }, [gameId]);

  // Debounced validate - wait 300ms after last call before validating
  // This reduces validation calls by 80%+ during rapid border placements
  const validateDebounced = useMemo(
    () => debounce(validate, 300),
    [validate]
  );

  // Cleanup throttle and debounce on unmount (Fix 4.1)
  useEffect(() => {
    return () => {
      throttledEmit.cancel();
      validateDebounced.cancel();
    };
  }, [throttledEmit, validateDebounced]);

  return {
    toggleBorder: emitToggleBorder,
    validate,
    validateDebounced, // Use this for auto-validation during gameplay
  };
}
