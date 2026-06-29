import "server-only";

// ── Sliding-window rate limiter ──────────────────────────────────────────────
//
// This is an in-process store — it resets when the lambda instance is
// recycled.  That's acceptable for abuse prevention on a demo deployment;
// a production system would use Redis (Upstash) or Vercel KV instead.
//
// We store a timestamp queue per (IP, endpoint) key and evict entries
// older than the window.

interface WindowEntry {
  timestamps: number[];
}

const store = new Map<string, WindowEntry>();

// Prune entries that haven't been touched in >2× the window to avoid
// unbounded memory growth on long-lived lambda instances.
const PRUNE_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
let lastPruned = Date.now();

function maybeProune(windowMs: number): void {
  const now = Date.now();
  if (now - lastPruned < PRUNE_INTERVAL_MS) return;
  lastPruned = now;
  for (const [key, entry] of store.entries()) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs * 2);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export interface RateLimitOptions {
  /** Max requests allowed within the window */
  limit: number;
  /** Window length in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Remaining allowed requests in the current window */
  remaining: number;
  /** Unix timestamp (ms) when the oldest request falls out of the window */
  resetAt: number;
}

/**
 * Check and record a request for `key` (typically `"<ip>:<endpoint>"`).
 * Returns immediately — no async I/O.
 */
export function checkRateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions
): RateLimitResult {
  maybeProune(windowMs);

  const now = Date.now();
  const cutoff = now - windowMs;

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Evict timestamps outside the current window
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  const count = entry.timestamps.length;
  const allowed = count < limit;

  if (allowed) {
    entry.timestamps.push(now);
  }

  const oldest = entry.timestamps[0] ?? now;
  const resetAt = oldest + windowMs;
  const remaining = Math.max(0, limit - entry.timestamps.length);

  return { allowed, remaining, resetAt };
}

// ── Per-route default configs ─────────────────────────────────────────────────
//
// Free tier: 100 LLM calls/month; we don't enforce monthly limits in-memory,
// but we cap burst rate to stay friendly with the upstream gateway.

export const CHAT_RATE_LIMIT: RateLimitOptions = {
  limit: 20,       // 20 requests …
  windowMs: 60_000 // … per minute per IP
};

export const IMAGE_RATE_LIMIT: RateLimitOptions = {
  limit: 10,
  windowMs: 60_000
};

export const VISION_RATE_LIMIT: RateLimitOptions = {
  limit: 15,
  windowMs: 60_000
};

// ── Extract client IP from Next.js request ────────────────────────────────────

export function getClientIp(request: Request): string {
  // Vercel injects the real IP in x-forwarded-for
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // May be a comma-separated list; take the first (leftmost) address
    return forwarded.split(",")[0].trim();
  }
  // Fallback for local dev where the header isn't set
  return "127.0.0.1";
}
