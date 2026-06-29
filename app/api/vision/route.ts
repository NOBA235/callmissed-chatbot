import { type NextRequest } from "next/server";
import { validateBody, visionRequestSchema } from "@/lib/validators";
import { streamVisionCompletion } from "@/lib/vision-service";
import { errorResponse } from "@/lib/errors";
import {
  checkRateLimit,
  getClientIp,
  VISION_RATE_LIMIT,
} from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 55;

export async function POST(request: NextRequest): Promise<Response> {
  // ── 1. Rate limit ─────────────────────────────────────────────────────────
  const ip = getClientIp(request);
  const rl = checkRateLimit(`${ip}:vision`, VISION_RATE_LIMIT);

  if (!rl.allowed) {
    const retryAfter = Math.ceil((rl.resetAt - Date.now()) / 1000);
    return new Response(
      JSON.stringify({
        error: {
          code: "rate_limited",
          message: "Too many vision requests. Please wait before uploading another image.",
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

  // ── 2. Parse & validate ───────────────────────────────────────────────────
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

  const validation = validateBody(visionRequestSchema, rawBody);
  if (!validation.success) {
    return new Response(
      JSON.stringify({
        error: { code: "invalid_request", message: validation.error },
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── 3. Stream vision response ─────────────────────────────────────────────
  try {
    const stream = await streamVisionCompletion(
      validation.data,
      request.signal
    );

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
        "Connection": "keep-alive",
        "X-RateLimit-Remaining": String(rl.remaining),
        "X-RateLimit-Reset": String(rl.resetAt),
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
