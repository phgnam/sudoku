/**
 * Throttle decorator for WebSocket handlers
 * Limits how frequently a method can be executed per client
 * 
 * @example
 * ```typescript
 * @SubscribeMessage('tripod:validate')
 * @Throttle(500) // Throttle to once per 500ms per client
 * handleValidate(client: Socket, data: any) {
 *   // Handler logic
 * }
 * ```
 */

export interface ThrottleOptions {
  /** Throttle interval in milliseconds */
  ms: number;
  /** Function to extract client ID from arguments (default: first arg.id) */
  getClientId?: (...args: any[]) => string;
  /** Optional logger function */
  onThrottled?: (clientId: string) => void;
}

/**
 * Throttle decorator factory
 * @param msOrOptions - Throttle interval in ms or options object
 */
export function Throttle(msOrOptions: number | ThrottleOptions) {
  const options: ThrottleOptions =
    typeof msOrOptions === 'number'
      ? { ms: msOrOptions }
      : msOrOptions;

  const { ms, getClientId, onThrottled } = options;

  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const throttleMap = new Map<string, number>();
    const CLEANUP_INTERVAL = 5 * 60 * 1000; // Cleanup every 5 minutes
    const EXPIRY_TIME = 10 * 60 * 1000; // Expire entries after 10 minutes of inactivity

    // Periodic cleanup to prevent memory leak
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const expiredKeys: string[] = [];

      throttleMap.forEach((lastCall, clientId) => {
        if (now - lastCall > EXPIRY_TIME) {
          expiredKeys.push(clientId);
        }
      });

      expiredKeys.forEach(key => throttleMap.delete(key));
    }, CLEANUP_INTERVAL);

    descriptor.value = async function (...args: any[]) {
      // Extract client ID
      const clientId = getClientId
        ? getClientId(...args)
        : args[0]?.id || args[0]?.client?.id || 'unknown';

      const lastCall = throttleMap.get(clientId) || 0;
      const now = Date.now();
      const timeSinceLastCall = now - lastCall;

      // Check if throttled
      if (timeSinceLastCall < ms) {
        // Still throttled
        if (onThrottled) {
          onThrottled(clientId);
        }
        return; // Drop the call
      }

      // Update last call time
      throttleMap.set(clientId, now);

      // Execute original method
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Debounce decorator for WebSocket handlers
 * Delays execution until no calls have been made for the specified time
 * 
 * @example
 * ```typescript
 * @SubscribeMessage('tripod:auto-save')
 * @Debounce(1000) // Wait 1s after last call
 * handleAutoSave(client: Socket, data: any) {
 *   // Handler logic
 * }
 * ```
 */
export function Debounce(ms: number) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const timeoutMap = new Map<string, NodeJS.Timeout>();

    descriptor.value = async function (...args: any[]) {
      // Extract client ID
      const clientId = args[0]?.id || args[0]?.client?.id || 'unknown';

      // Clear existing timeout
      const existingTimeout = timeoutMap.get(clientId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Set new timeout
      const timeout = setTimeout(async () => {
        timeoutMap.delete(clientId);
        await originalMethod.apply(this, args);
      }, ms);

      timeoutMap.set(clientId, timeout);
    };

    return descriptor;
  };
}

