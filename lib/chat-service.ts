import "server-only";

import type OpenAI from "openai";
import { getCallMissedClient, CHAT_MODEL } from "./callmissed-client";
import type { ValidatedChatRequest } from "./validators";

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a helpful, concise AI assistant powered by ${CHAT_MODEL} via the CallMissed API.

When you receive an image, describe and analyze it thoughtfully.
Format code with proper markdown fences and language identifiers.
Keep responses focused and avoid unnecessary padding.`;

// ── Types ─────────────────────────────────────────────────────────────────────

// The OpenAI SDK's message type, narrowed to what CallMissed expects
type SDKMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Converts our internal ChatMessage[] into the shape the OpenAI SDK expects.
 * Prepends the system prompt if the caller hasn't supplied one.
 */
function buildMessages(
  messages: ValidatedChatRequest["messages"]
): SDKMessage[] {
  const hasSystem = messages.some((m) => m.role === "system");

  const sdkMessages: SDKMessage[] = messages.map((msg) => {
    if (typeof msg.content === "string") {
      return { role: msg.role, content: msg.content } as SDKMessage;
    }
    // Multi-part content (vision) — cast to SDK's union type
    return {
      role: msg.role,
      content: msg.content as OpenAI.Chat.Completions.ChatCompletionContentPart[],
    } as SDKMessage;
  });

  if (!hasSystem) {
    sdkMessages.unshift({ role: "system", content: SYSTEM_PROMPT });
  }

  return sdkMessages;
}

// ── Core streaming function ───────────────────────────────────────────────────

/**
 * Calls kimi-k2.7-code with `stream: true` and returns a ReadableStream
 * of raw SSE bytes that can be piped directly into a Response.
 *
 * The SSE format matches the OpenAI spec:
 *   data: {"choices":[{"delta":{"content":"Hello"},"finish_reason":null}]}\n\n
 *   data: [DONE]\n\n
 *
 * Throws on upstream errors — the route handler calls normalizeError().
 */
export async function streamChatCompletion(
  validated: ValidatedChatRequest,
  signal?: AbortSignal
): Promise<ReadableStream<Uint8Array>> {
  const client = getCallMissedClient();
  const messages = buildMessages(validated.messages);

  const upstream = await client.chat.completions.create(
    {
      model: CHAT_MODEL,
      messages,
      stream: true,
      max_tokens: 2048,  // cap keeps us inside Vercel's 60 s timeout
      temperature: 0.7,
    },
    { signal }
  );

  // Transform the SDK's async iterator into a WHATWG ReadableStream of
  // UTF-8 encoded SSE bytes.  We re-emit each chunk in standard SSE format
  // so the client can parse it with a generic EventSource or fetch reader.
  const encoder = new TextEncoder();

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of upstream) {
          const delta = chunk.choices?.[0]?.delta?.content;
          if (delta) {
            // Encode as SSE "data:" line
            const sse = `data: ${JSON.stringify({ content: delta })}\n\n`;
            controller.enqueue(encoder.encode(sse));
          }

          // Propagate the finish reason so the client knows when to close
          const finishReason = chunk.choices?.[0]?.finish_reason;
          if (finishReason) {
            const done = `data: ${JSON.stringify({ finishReason })}\n\n`;
            controller.enqueue(encoder.encode(done));
          }
        }
        // Standard SSE terminator
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        // Surface the error through the stream so the route handler can
        // catch it and return a proper error response.
        controller.error(err);
      }
    },
    cancel() {
      // Called when the client disconnects.  The upstream iterator's
      // return() is invoked automatically by the SDK when the signal fires.
    },
  });

  return readable;
}
