import { type NextRequest } from "next/server";
import { validateBody, chatRequestSchema } from "@/lib/validators";
import { streamChatCompletion } from "@/lib/chat-service";
import { errorResponse } from "@/lib/errors";
import {
  checkRateLimit,
  getClientIp,
  CHAT_RATE_LIMIT,
} from "@/lib/rate-limit";

// Vercel: run as a Node.js serverless function (not Edge) so we can use
// the full OpenAI SDK with keepAlive and connection pooling.
export const runtime = "nodejs";

// Allow streaming responses up to 55 s (our client timeout is also 55 s;
// Vercel's hard limit is 60 s on Pro, 10 s on Hobby — adjust accordingly).
export const maxDuration = 55;

export async function POST(request: NextRequest): Promise<Response> {
  // ── 1. Rate limit ─────────────────────────────────────────────────────────
  const ip = getClientIp(request);
  const rl = checkRateLimit(`${ip}:chat`, CHAT_RATE_LIMIT);

  if (!rl.allowed) {
    const retryAfter = Math.ceil((rl.resetAt - Date.now()) / 1000);
    return new Response(
      JSON.stringify({
        error: {
          code: "rate_limited",
          message: "Too many requests. Please wait before sending another message.",
          retryAfter,
        },
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfter),
        },
      }
    );
  }

  // ── 2. Parse & validate body ──────────────────────────────────────────────
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return new Response(
      JSON.stringify({
        error: { code: "invalid_request", message: "Request body must be valid JSON." },
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const validation = validateBody(chatRequestSchema, rawBody);
  if (!validation.success) {
    return new Response(
      JSON.stringify({
        error: { code: "invalid_request", message: validation.error },
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── 3. Stream response from CallMissed ────────────────────────────────────
  try {
    const stream = await streamChatCompletion(
      validation.data,
      request.signal // propagates client disconnect → aborts upstream
    );

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        // Prevent buffering by proxies and CDNs
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",   // disable nginx buffering on Vercel
        "Connection": "keep-alive",
        // Expose remaining rate-limit info to the client (optional but useful)
        "X-RateLimit-Remaining": String(rl.remaining),
        "X-RateLimit-Reset": String(rl.resetAt),
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
