import { type NextRequest } from "next/server";
import { validateBody, imageRequestSchema } from "@/lib/validators";
import { generateImage } from "@/lib/image-service";
import { errorResponse } from "@/lib/errors";
import {
  checkRateLimit,
  getClientIp,
  IMAGE_RATE_LIMIT,
} from "@/lib/rate-limit";

export const runtime = "nodejs";

// Image generation can take up to ~30 s on the free tier; 55 s gives headroom.
export const maxDuration = 55;

export async function POST(request: NextRequest): Promise<Response> {
  // ── 1. Rate limit ─────────────────────────────────────────────────────────
  const ip = getClientIp(request);
  const rl = checkRateLimit(`${ip}:image`, IMAGE_RATE_LIMIT);

  if (!rl.allowed) {
    const retryAfter = Math.ceil((rl.resetAt - Date.now()) / 1000);
    return new Response(
      JSON.stringify({
        error: {
          code: "rate_limited",
          message: "Too many image requests. Please wait before generating another.",
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

  const validation = validateBody(imageRequestSchema, rawBody);
  if (!validation.success) {
    return new Response(
      JSON.stringify({
        error: { code: "invalid_request", message: validation.error },
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // ── 3. Generate image ─────────────────────────────────────────────────────
  try {
    const result = await generateImage(validation.data, request.signal);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store", // b64 images shouldn't be cached publicly
        "X-RateLimit-Remaining": String(rl.remaining),
        "X-RateLimit-Reset": String(rl.resetAt),
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
