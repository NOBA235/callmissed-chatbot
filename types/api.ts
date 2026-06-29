// ---------------------------------------------------------------------------
// Canonical types for the CallMissed Chat API surface.
// Imported by route handlers, services, and validators.
// ---------------------------------------------------------------------------

// ── Message roles ──────────────────────────────────────────────────────────

export type MessageRole = "system" | "user" | "assistant";

// A plain text message part (used in non-vision turns)
export interface TextPart {
  type: "text";
  text: string;
}

// An image URL part — carries either a remote URL or a base64 data URI
export interface ImageUrlPart {
  type: "image_url";
  image_url: {
    url: string; // "https://…" or "data:<mime>;base64,…"
    detail?: "auto" | "low" | "high";
  };
}

export type ContentPart = TextPart | ImageUrlPart;

// A chat message as understood by our API layer.
// content is a string for plain text turns; an array for vision turns.
export interface ChatMessage {
  role: MessageRole;
  content: string | ContentPart[];
}

// ── Chat endpoint ───────────────────────────────────────────────────────────

export interface ChatRequestBody {
  messages: ChatMessage[];
}

// ── Image generation endpoint ───────────────────────────────────────────────

export interface ImageRequestBody {
  prompt: string;
  size?: "256x256" | "512x512" | "1024x1024";
  n?: number;
}

export interface ImageResponseBody {
  images: GeneratedImage[];
}

export interface GeneratedImage {
  b64: string;       // raw base64 — no data URI prefix
  mimeType: string;  // "image/png" by default
  revisedPrompt?: string;
}

// ── Vision endpoint ─────────────────────────────────────────────────────────

// Vision requests are identical in shape to chat, but always contain at
// least one ImageUrlPart.  We model them as a separate endpoint to keep
// routing logic clean and error messages specific.
export interface VisionRequestBody {
  messages: ChatMessage[];
}

// ── Unified error response ──────────────────────────────────────────────────

export type ApiErrorCode =
  | "invalid_request"      // validation failed (400)
  | "unauthorized"         // missing or invalid API key (401)
  | "credits_exhausted"    // 402 from upstream
  | "forbidden"            // 403 from upstream
  | "rate_limited"         // 429 from upstream
  | "unsupported_image"    // kimi rejected the image content
  | "upstream_error"       // 5xx from upstream
  | "timeout"              // network / Vercel timeout
  | "internal_error";      // unexpected server error

export interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;        // safe, user-facing — no secrets
    retryAfter?: number;    // seconds, present on rate_limited
  };
}
