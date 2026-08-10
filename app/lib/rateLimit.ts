/**
 * Rate limiter for Next.js API routes.
 *
 * Uses Upstash Redis (fixed-window counter via INCR + EXPIRE) when
 * UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are configured — this
 * is what makes rate limiting actually work once you're running more than
 * one server instance or deploying serverless, where an in-memory Map is
 * per-instance and silently stops doing its job.
 *
 * Falls back to the original in-memory Map for local development so
 * nobody needs a Redis instance just to run `next dev`. In production
 * without Redis configured, this logs a one-time warning rather than
 * failing silently.
 */

import { Redis } from "@upstash/redis";

export interface RateLimitOptions {
  /** Max requests in the window */
  limit:  number;
  /** Window size in seconds */
  window: number;
  /** When true, failures in Redis will not fail open (useful for auth endpoints) */
  failClosed?: boolean;
}

export interface RateLimitResult {
  success:   boolean;
  limit:     number;
  remaining: number;
  resetAt:   number;
}

// ── Redis backend (production) ──────────────────────────────────────────────

const redisUrl   = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis      = redisUrl && redisToken ? new Redis({ url: redisUrl, token: redisToken }) : null;

let warnedNoRedis = false;

async function checkRateLimitRedis(identifier: string, options: RateLimitOptions): Promise<RateLimitResult> {
  const key = `rl:${identifier}`;
  // INCR creates the key at 1 if it doesn't exist; only set an expiry the
  // first time so the window doesn't get pushed back on every request.
  const count = await redis!.incr(key);
  if (count === 1) {
    await redis!.expire(key, options.window);
  }
  const ttl     = await redis!.ttl(key);
  const resetAt = Date.now() + Math.max(ttl, 0) * 1000;

  return {
    success:   count <= options.limit,
    limit:     options.limit,
    remaining: Math.max(0, options.limit - count),
    resetAt,
  };
}

// ── In-memory backend (local dev fallback) ──────────────────────────────────

interface RateLimitEntry {
  count:   number;
  resetAt: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __rateLimitStore: Map<string, RateLimitEntry> | undefined;
}

const memoryStore: Map<string, RateLimitEntry> = globalThis.__rateLimitStore ?? new Map();
if (process.env.NODE_ENV !== "production") {
  globalThis.__rateLimitStore = memoryStore;
}

// Cleanup old entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryStore.entries()) {
      if (entry.resetAt < now) memoryStore.delete(key);
    }
  }, 5 * 60 * 1000);
}

function checkRateLimitMemory(identifier: string, options: RateLimitOptions): RateLimitResult {
  if (process.env.NODE_ENV === "production" && !warnedNoRedis) {
    warnedNoRedis = true;
    // eslint-disable-next-line no-console
    console.warn(
      "[rateLimit] UPSTASH_REDIS_REST_URL/TOKEN not set — falling back to " +
      "in-memory rate limiting. This does NOT work correctly across multiple " +
      "server instances or serverless deployments. Configure Upstash Redis " +
      "for production (see .env.example).",
    );
  }

  const now   = Date.now();
  const key   = `rl:${identifier}`;
  const entry = memoryStore.get(key);

  if (!entry || entry.resetAt < now) {
    const resetAt = now + options.window * 1000;
    memoryStore.set(key, { count: 1, resetAt });
    return { success: true, limit: options.limit, remaining: options.limit - 1, resetAt };
  }

  entry.count++;
  memoryStore.set(key, entry);

  return {
    success:   entry.count <= options.limit,
    limit:     options.limit,
    remaining: Math.max(0, options.limit - entry.count),
    resetAt:   entry.resetAt,
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Check if the given identifier has exceeded the rate limit.
 * Returns success=false if rate-limited.
 *
 * Uses Redis when configured (recommended for production), otherwise an
 * in-memory store (fine for local development only).
 */
export async function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { limit: 30, window: 60 },
): Promise<RateLimitResult> {
  if (redis) {
    try {
      return await checkRateLimitRedis(identifier, options);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[rateLimit] Redis error during rate limit check:", err);
      // Fallback to in-memory store before giving up
      const memResult = checkRateLimitMemory(identifier, options);
      if (!memResult.success || options.failClosed) {
        return {
          success: false,
          limit: options.limit,
          remaining: 0,
          resetAt: Date.now() + options.window * 1000,
        };
      }
      return memResult;
    }
  }
  return checkRateLimitMemory(identifier, options);
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
