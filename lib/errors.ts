import "server-only";

import OpenAI, { APIError } from "openai";
import type { ApiErrorCode, ApiErrorResponse } from "@/types/api";

// ── Internal error shape ─────────────────────────────────────────────────────

export interface NormalizedError {
  statusCode: number;
  body: ApiErrorResponse;
}

// ── Upstream error-code strings we care about ────────────────────────────────

const UNSUPPORTED_IMAGE_CODES = new Set([
  "unsupported_image_input",
  "invalid_image",
  "image_not_supported",
]);

// ── Core normalizer ──────────────────────────────────────────────────────────

/**
 * Converts any thrown value into a consistent { statusCode, body } pair.
 *
 * We map upstream HTTP status codes and error codes from CallMissed /
 * the OpenAI SDK into our own ApiErrorCode vocabulary.  Sensitive details
 * (raw upstream messages, API key hints, internal stack traces) are never
 * forwarded to the client.
 */
export function normalizeError(err: unknown): NormalizedError {
  // ── OpenAI SDK errors (covers 4xx / 5xx from CallMissed) ─────────────────
  if (err instanceof APIError) {
    return handleOpenAIError(err);
  }

  // ── AbortError — client disconnected or we hit our own timeout ────────────
  if (isAbortError(err)) {
    return makeError(408, "timeout", "The request timed out. Please try again.");
  }

  // ── Generic network / fetch errors ────────────────────────────────────────
  if (err instanceof TypeError && (err as TypeError).message.includes("fetch")) {
    return makeError(
      502,
      "upstream_error",
      "Could not reach the AI service. Check your connection and try again."
    );
  }

  // ── Unknown — log on the server, return opaque 500 ───────────────────────
  console.error("[callmissed] Unhandled error:", err);
  return makeError(500, "internal_error", "An unexpected error occurred.");
}

// ── OpenAI/CallMissed HTTP error handler ─────────────────────────────────────

function handleOpenAIError(err: APIError): NormalizedError {
  const status = err.status ?? 500;
  const code = extractErrorCode(err);
  const message = err.message ?? "";

  // 402 — account credits exhausted
  if (status === 402) {
    return makeError(
      402,
      "credits_exhausted",
      "Your CallMissed credits are exhausted. Add credits at app.callmissed.com."
    );
  }

  // 401 — bad or missing key (shouldn't reach prod if env is set, but be safe)
  if (status === 401) {
    return makeError(
      401,
      "unauthorized",
      "Invalid API key configuration. Contact the site administrator."
    );
  }

  // 403 — key lacks permissions (e.g. missing llm or image scope)
  if (status === 403) {
    return makeError(
      403,
      "forbidden",
      "This operation is not permitted with the current API key permissions."
    );
  }

  // 429 — rate limit; extract Retry-After header when available
  if (status === 429) {
    const retryAfter = extractRetryAfter(err);
    return {
      statusCode: 429,
      body: {
        error: {
          code: "rate_limited",
          message:
            "Too many requests. Please wait a moment before trying again.",
          ...(retryAfter !== undefined && { retryAfter }),
        },
      },
    };
  }

  // unsupported_image_input — kimi rejected a vision payload
  if (UNSUPPORTED_IMAGE_CODES.has(code) || message.includes("unsupported_image_input")) {
    return makeError(
      422,
      "unsupported_image",
      "The image could not be processed. Try a different format (JPEG, PNG, GIF, or WebP) or a smaller file."
    );
  }

  // 400 — general bad request (usually a validation we missed)
  if (status === 400) {
    return makeError(400, "invalid_request", "The request was malformed.");
  }

  // 503 / 5xx — upstream overload or maintenance
  if (status >= 500) {
    return makeError(
      502,
      "upstream_error",
      "The AI service is temporarily unavailable. Please try again in a moment."
    );
  }

  // Fallback
  return makeError(500, "internal_error", "An unexpected error occurred.");
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeError(
  statusCode: number,
  code: ApiErrorCode,
  message: string
): NormalizedError {
  return { statusCode, body: { error: { code, message } } };
}

/**
 * Tries to extract the machine-readable error code from the OpenAI error.
 * The SDK exposes it as err.code; the raw body may also carry it.
 */
function extractErrorCode(err: APIError): string {
  // err.code is typed as string | null | undefined in the SDK
  if (err.code) return err.code;

  // Fallback: parse from the raw error body if available
  const body = err.error as Record<string, unknown> | undefined;
  if (body && typeof body.code === "string") return body.code;
  if (body && typeof body.type === "string") return body.type;

  return "";
}

/**
 * Extracts a numeric Retry-After value (in seconds) from the error,
 * checking the SDK's headers map when present.
 */
function extractRetryAfter(err: APIError): number | undefined {
  try {
    // The SDK attaches the raw Response headers via err.headers
    const headers = err.headers as Record<string, string> | undefined;
    if (headers) {
      const raw = headers["retry-after"] ?? headers["Retry-After"];
      if (raw) {
        const parsed = parseInt(raw, 10);
        if (!isNaN(parsed)) return parsed;
      }
    }
  } catch {
    // ignore — header parsing is best-effort
  }
  return undefined;
}

function isAbortError(err: unknown): boolean {
  if (err instanceof Error) {
    return (
      err.name === "AbortError" ||
      err.message.includes("aborted") ||
      err.message.includes("timeout")
    );
  }
  return false;
}

// ── Convenience: build a NextResponse-ready Response from a NormalizedError ──

export function errorResponse(err: unknown): Response {
  const { statusCode, body } = normalizeError(err);
  return new Response(JSON.stringify(body), {
    status: statusCode,
    headers: { "Content-Type": "application/json" },
  });
}
