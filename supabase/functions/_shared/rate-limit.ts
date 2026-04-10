/**
 * Lightweight in-memory rate limiter for Supabase Edge Functions.
 * SEC-004 / AGENT-014: prevents cost-based DoS on LLM-calling endpoints.
 *
 * Uses a sliding-window counter per user. State lives in the edge function
 * instance memory — it resets when the function cold-starts, which is
 * acceptable for a first layer of defense. For stricter limits, use a
 * Redis or Supabase-backed counter (Phase D).
 *
 * Usage:
 *   const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 10 });
 *   const blocked = limiter.check(userId);
 *   if (blocked) return new Response(..., { status: 429 });
 */

interface RateLimiterConfig {
  /** Window duration in milliseconds */
  windowMs: number;
  /** Max requests per window per user */
  maxRequests: number;
}

interface WindowEntry {
  count: number;
  resetAt: number;
}

export function createRateLimiter(config: RateLimiterConfig) {
  const windows = new Map<string, WindowEntry>();

  // Periodically clean up expired entries to prevent memory leak
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of windows) {
      if (now > entry.resetAt) windows.delete(key);
    }
  }, config.windowMs * 2);

  return {
    /**
     * Check if a user is rate-limited.
     * @returns true if blocked, false if allowed
     */
    check(userId: string): boolean {
      const now = Date.now();
      const entry = windows.get(userId);

      if (!entry || now > entry.resetAt) {
        // New window
        windows.set(userId, { count: 1, resetAt: now + config.windowMs });
        return false;
      }

      entry.count++;
      if (entry.count > config.maxRequests) {
        return true; // blocked
      }

      return false;
    },

    /** Returns remaining requests in the current window, or 0 if blocked */
    remaining(userId: string): number {
      const entry = windows.get(userId);
      if (!entry || Date.now() > entry.resetAt) return config.maxRequests;
      return Math.max(0, config.maxRequests - entry.count);
    },
  };
}
