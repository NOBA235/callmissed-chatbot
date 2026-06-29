import "server-only";

import type OpenAI from "openai";
import { getCallMissedClient, CHAT_MODEL } from "./callmissed-client";
import type { ValidatedVisionRequest } from "./validators";

// ── Types ─────────────────────────────────────────────────────────────────────

type SDKMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

// ── System prompt ─────────────────────────────────────────────────────────────

const VISION_SYSTEM_PROMPT = `You are a helpful AI assistant with vision capabilities, powered by ${CHAT_MODEL} via the CallMissed API.

When analyzing images:
- Describe what you see clearly and specifically
- Answer questions about the image content accurately
- Note any text visible in the image
- Be concise but thorough

Format code you see with proper markdown fences.`;

// ── Message builder ───────────────────────────────────────────────────────────

function buildVisionMessages(
  messages: ValidatedVisionRequest["messages"]
): SDKMessage[] {
  const hasSystem = messages.some((m) => m.role === "system");

  const sdkMessages: SDKMessage[] = messages.map((msg) => {
    if (typeof msg.content === "string") {
      return { role: msg.role, content: msg.content } as SDKMessage;
    }
    return {
      role: msg.role,
      content: msg.content as OpenAI.Chat.Completions.ChatCompletionContentPart[],
    } as SDKMessage;
  });

  if (!hasSystem) {
    sdkMessages.unshift({ role: "system", content: VISION_SYSTEM_PROMPT });
  }

  return sdkMessages;
}

// ── Core streaming function ───────────────────────────────────────────────────

/**
 * Streams a vision-capable chat completion.
 *
 * kimi-k2.7-code supports multimodal content (supports_vision: true).
 * The SDK forwards image_url content parts to the upstream model as-is.
 * If the model rejects the image format, the upstream returns a 400 with
 * code "unsupported_image_input" — our error normalizer maps this to a
 * friendly client message.
 *
 * Returns a ReadableStream<Uint8Array> of SSE bytes — identical format to
 * the chat service so the client can use the same parser.
 *
 * Throws on upstream errors.
 */
export async function streamVisionCompletion(
  validated: ValidatedVisionRequest,
  signal?: AbortSignal
): Promise<ReadableStream<Uint8Array>> {
  const client = getCallMissedClient();
  const messages = buildVisionMessages(validated.messages);

  const upstream = await client.chat.completions.create(
    {
      model: CHAT_MODEL,
      messages,
      stream: true,
      max_tokens: 2048,
      temperature: 0.5, // slightly lower temp for factual image analysis
    },
    { signal }
  );

  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of upstream) {
          const delta = chunk.choices?.[0]?.delta?.content;
          if (delta) {
            const sse = `data: ${JSON.stringify({ content: delta })}\n\n`;
            controller.enqueue(encoder.encode(sse));
          }

          const finishReason = chunk.choices?.[0]?.finish_reason;
          if (finishReason) {
            const done = `data: ${JSON.stringify({ finishReason })}\n\n`;
            controller.enqueue(encoder.encode(done));
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}
