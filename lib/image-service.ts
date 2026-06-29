import "server-only";

import { getCallMissedClient, IMAGE_MODEL } from "./callmissed-client";
import type { ValidatedImageRequest } from "./validators";
import type { GeneratedImage, ImageResponseBody } from "@/types/api";

// ── Core generation function ──────────────────────────────────────────────────

/**
 * Calls flux-2-klein-9b and returns the generated images as base64 strings.
 *
 * CallMissed's image endpoint is OpenAI-compatible:
 *   POST /v1/images/generations
 *   { model, prompt, n, size, response_format: "b64_json" }
 *
 * The response carries data[].b64_json.  We strip the data-URI prefix
 * (if any) and return raw base64 so the client can choose how to render it.
 *
 * Throws on upstream errors — the route handler calls normalizeError().
 */
export async function generateImage(
  validated: ValidatedImageRequest,
  signal?: AbortSignal
): Promise<ImageResponseBody> {
  const client = getCallMissedClient();

  const response = await client.images.generate(
    {
      model: IMAGE_MODEL,
      prompt: validated.prompt,
      n: validated.n,
      size: validated.size as "256x256" | "512x512" | "1024x1024",
      response_format: "b64_json",
    },
    { signal }
  );

  const images: GeneratedImage[] = (response.data ?? []).map((item) => {
    // Strip any accidental data-URI prefix some providers add
    const raw = item.b64_json ?? "";
    const b64 = raw.startsWith("data:")
      ? raw.split(",")[1] ?? raw
      : raw;

    return {
      b64,
      mimeType: "image/png",
      // The API may return a revised (safety-filtered) prompt
      ...(item.revised_prompt && { revisedPrompt: item.revised_prompt }),
    };
  });

  return { images };
}
