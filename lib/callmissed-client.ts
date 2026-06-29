// "server-only" throws a build-time error if this module is accidentally
// imported inside a Client Component or anywhere that gets bundled for
// the browser.  The API key never reaches client JS.
import "server-only";

import OpenAI from "openai";

// ── Constants ───────────────────────────────────────────────────────────────

export const CALLMISSED_BASE_URL = "https://api.callmissed.com/v1";

/** kimi-k2.7-code: vision-capable, free-tier, 262K context */
export const CHAT_MODEL = "kimi-k2.7-code" as const;

/** flux-2-klein-9b: free-tier image generation */
export const IMAGE_MODEL = "flux-2-klein-9b" as const;

// ── Client singleton ─────────────────────────────────────────────────────────
//
// The OpenAI SDK is fully compatible with CallMissed — only the baseURL
// and api_key change.  We use a module-level singleton so the same
// underlying http.Agent connection pool is reused across warm lambda
// invocations on Vercel.

function createClient(): OpenAI {
  const apiKey = process.env.CALLMISSED_API_KEY;

  if (!apiKey) {
    // Fail loudly at boot — a missing key is a config error, not a
    // user error.  This surfaces in Vercel logs immediately.
    throw new Error(
      "CALLMISSED_API_KEY is not set. " +
        "Add it to .env.local (local) or the Vercel environment (production)."
    );
  }

  return new OpenAI({
    apiKey,
    baseURL: CALLMISSED_BASE_URL,
    // Default timeout: 55 s — slightly under Vercel's 60 s serverless limit
    // so we can return a clean timeout error rather than a hard 504.
    timeout: 55_000,
    maxRetries: 0, // We handle retries in the error layer to keep UX control
  });
}

// Lazy singleton: instantiated on first import, reused on warm invocations.
let _client: OpenAI | null = null;

export function getCallMissedClient(): OpenAI {
  if (!_client) {
    _client = createClient();
  }
  return _client;
}
