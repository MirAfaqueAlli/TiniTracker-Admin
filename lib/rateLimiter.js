/**
 * TiniTracker Admin — In-Memory Sliding Window Rate Limiter
 * ══════════════════════════════════════════════════════════
 * Lightweight, zero-dependency rate limiter running in the Edge runtime.
 * Uses a sliding window approach: the window resets from the FIRST request,
 * not a fixed clock interval, giving smoother protection.
 *
 * Tiers:
 *  - LOGIN     : 10 attempts per 15 minutes  (admin login is high-value target)
 *  - GENERAL   : 60 requests per minute      (generic admin API)
 */

/** @type {Map<string, { count: number, windowStart: number }>} */
const store = new Map();

// Prune stale entries every 10 minutes to avoid unbounded memory growth
const PRUNE_INTERVAL_MS = 10 * 60 * 1000;
let lastPrune = Date.now();

function pruneStore(maxWindowMs) {
  const now = Date.now();
  if (now - lastPrune < PRUNE_INTERVAL_MS) return;
  lastPrune = now;
  for (const [key, entry] of store.entries()) {
    if (now - entry.windowStart > maxWindowMs) {
      store.delete(key);
    }
  }
}

/**
 * Rate limit configurations by route pattern.
 * @type {Array<{ pattern: RegExp, limit: number, windowMs: number, errorMessage: string }>}
 */
export const RATE_LIMIT_CONFIGS = [
  {
    pattern: /^\/api\/provider\/auth\/login/,
    limit: 10,
    windowMs: 15 * 60 * 1000, // 15 minutes
    errorMessage: 'Too many login attempts. Please wait 15 minutes before trying again.',
  },
  {
    // All other provider API routes
    pattern: /^\/api\/provider\//,
    limit: 60,
    windowMs: 60 * 1000, // 1 minute
    errorMessage: 'API request limit reached. Please slow down your requests.',
  },
];

/**
 * Find the appropriate rate limit config for a given pathname.
 * @param {string} pathname
 * @returns {{ limit: number, windowMs: number, errorMessage: string } | null}
 */
export function getRateLimitConfig(pathname) {
  for (const config of RATE_LIMIT_CONFIGS) {
    if (config.pattern.test(pathname)) {
      return config;
    }
  }
  return null;
}

/**
 * Check & update rate limit for a given IP + route config.
 * @param {string} ip
 * @param {{ limit: number, windowMs: number, errorMessage: string }} config
 * @returns {{ allowed: boolean, remaining: number, resetSeconds: number, limit: number, retryAfter?: number, errorMessage?: string }}
 */
export function checkRateLimit(ip, config) {
  const { limit, windowMs, errorMessage } = config;
  const key = `${ip}::${limit}::${windowMs}`;
  const now = Date.now();

  pruneStore(windowMs * 2);

  const entry = store.get(key);

  if (!entry || now - entry.windowStart >= windowMs) {
    // New window
    store.set(key, { count: 1, windowStart: now });
    return {
      allowed: true,
      remaining: limit - 1,
      resetSeconds: Math.ceil(windowMs / 1000),
      limit,
    };
  }

  if (entry.count >= limit) {
    const retryAfter = Math.ceil((windowMs - (now - entry.windowStart)) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetSeconds: retryAfter,
      retryAfter,
      limit,
      errorMessage,
    };
  }

  entry.count += 1;
  store.set(key, entry);

  return {
    allowed: true,
    remaining: limit - entry.count,
    resetSeconds: Math.ceil((windowMs - (now - entry.windowStart)) / 1000),
    limit,
  };
}
