/**
 * Simple in-memory rate limiter for Next.js API routes.
 * Uses a sliding window approach stored in a global Map.
 * For production, replace with Redis-based rate limiting.
 */

interface RateLimitEntry {
  count:   number;
  resetAt: number;
}

// Global store — survives hot reloads in dev via globalThis
declare global {
  // eslint-disable-next-line no-var
  var __rateLimitStore: Map<string, RateLimitEntry> | undefined;
}

const store: Map<string, RateLimitEntry> =
  globalThis.__rateLimitStore ?? new Map();

if (process.env.NODE_ENV !== "production") {
  globalThis.__rateLimitStore = store;
}

// Cleanup old entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < now) store.delete(key);
    }
  }, 5 * 60 * 1000);
}

interface RateLimitOptions {
  /** Max requests in the window */
  limit:  number;
  /** Window size in seconds */
  window: number;
}

interface RateLimitResult {
  success:   boolean;
  limit:     number;
  remaining: number;
  resetAt:   number;
}

/**
 * Check if the given identifier has exceeded the rate limit.
 * Returns success=false if rate-limited.
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { limit: 30, window: 60 },
): RateLimitResult {
  const now    = Date.now();
  const key    = `rl:${identifier}`;
  const entry  = store.get(key);

  if (!entry || entry.resetAt < now) {
    // Fresh window
    const resetAt = now + options.window * 1000;
    store.set(key, { count: 1, resetAt });
    return {
      success:   true,
      limit:     options.limit,
      remaining: options.limit - 1,
      resetAt,
    };
  }

  entry.count++;
  store.set(key, entry);

  const remaining = Math.max(0, options.limit - entry.count);
  return {
    success:   entry.count <= options.limit,
    limit:     options.limit,
    remaining,
    resetAt:   entry.resetAt,
  };
}

/**
 * Get client IP from a Next.js request.
 * Handles common proxy headers.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}
