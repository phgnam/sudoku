export interface RateLimitEntry {
  count: number;
  firstRequest: number;
  blocked: boolean;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  blockDurationMs: number;
}

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  'match:ready': { windowMs: 5000, maxRequests: 3, blockDurationMs: 10000 },
  'match:move': { windowMs: 1000, maxRequests: 10, blockDurationMs: 5000 },
  default: { windowMs: 1000, maxRequests: 20, blockDurationMs: 5000 },
};
