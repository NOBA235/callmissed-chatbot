"use client";

import { useState, useCallback, useRef } from "react";
import type { Message, AttachedImage, AppError } from "@/types/chat";
import type { ImageResponseBody } from "@/types/api";
import { detectImageIntent } from "@/lib/client/image-intent";
import { messageToApiFormat } from "@/types/chat";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function readStream(
  response: Response,
  onChunk: (text: string) => void,
  signal: AbortSignal
): Promise<void> {
  if (!response.body) throw new Error("No response body");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      if (signal.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Split on SSE message boundaries
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        const line = part.trim();
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") return;
        try {
          const parsed = JSON.parse(data) as { content?: string; finishReason?: string };
          if (parsed.content) onChunk(parsed.content);
        } catch {
          // malformed chunk — skip
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

async function handleErrorResponse(response: Response): Promise<AppError> {
  try {
    const body = await response.json() as { error: AppError };
    return body.error;
  } catch {
    return { code: "internal_error", message: `Request failed (${response.status})` };
  }
}

export function useChat(
  conversationId: string | null,
  messages: Message[],
  onMessagesChange: (msgs: Message[]) => void
) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const sendMessage = useCallback(
    async (text: string, image?: AttachedImage) => {
      if (!conversationId || isStreaming) return;
      if (!text.trim() && !image) return;

      setError(null);

      // ── Build user message ────────────────────────────────────────────────
      const userMsg: Message = {
        id: generateId(),
        role: "user",
        content: text.trim(),
        image,
        status: "done",
        createdAt: Date.now(),
      };

      // Placeholder assistant message — filled as stream arrives
      const assistantMsg: Message = {
        id: generateId(),
        role: "assistant",
        content: "",
        status: "streaming",
        createdAt: Date.now() + 1,
      };

      const nextMessages = [...messages, userMsg, assistantMsg];
      onMessagesChange(nextMessages);
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        // ── Route: image generation? ────────────────────────────────────────
        const intent = detectImageIntent(text.trim());

        if (intent.isImageRequest && !image) {
          // Mark assistant message as image generation
          onMessagesChange(
            nextMessages.map((m) =>
              m.id === assistantMsg.id
                ? { ...m, isImageGeneration: true }
                : m
            )
          );

          const res = await fetch("/api/image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: intent.prompt }),
            signal: controller.signal,
          });

          if (!res.ok) {
            const err = await handleErrorResponse(res);
            onMessagesChange(
              nextMessages.map((m) =>
                m.id === assistantMsg.id
                  ? { ...m, content: err.message, status: "error" }
                  : m
              )
            );
            setError(err);
            return;
          }

          const data = (await res.json()) as ImageResponseBody;
          const img = data.images[0];

          onMessagesChange(
            nextMessages.map((m) =>
              m.id === assistantMsg.id
                ? {
                    ...m,
                    content: `Here's your image for: *${intent.prompt}*`,
                    generatedImage: img,
                    isImageGeneration: true,
                    status: "done",
                  }
                : m
            )
          );
          return;
        }

        // ── Route: vision or chat ───────────────────────────────────────────
        const endpoint = image ? "/api/vision" : "/api/chat";

        // Build history for context (exclude streaming placeholder)
        const historyMessages = [...messages, userMsg]
          .filter((m) => m.status !== "error")
          .map(messageToApiFormat);

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: historyMessages }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const err = await handleErrorResponse(res);
          onMessagesChange(
            nextMessages.map((m) =>
              m.id === assistantMsg.id
                ? { ...m, content: err.message, status: "error" }
                : m
            )
          );
          setError(err);
          return;
        }

        // ── Stream tokens into assistant message ────────────────────────────
        let accumulated = "";

        await readStream(
          res,
          (chunk) => {
            accumulated += chunk;
            // Functional update to avoid stale closures
            onMessagesChange(
              [...messages, userMsg, { ...assistantMsg, content: accumulated, status: "streaming" }]
            );
          },
          controller.signal
        );

        // Finalise
        onMessagesChange(
          [...messages, userMsg, { ...assistantMsg, content: accumulated, status: "done" }]
        );
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // User stopped — mark the assistant message as done with whatever was accumulated
          onMessagesChange(
            nextMessages.map((m) =>
              m.id === assistantMsg.id
                ? { ...m, status: "done" as const }
                : m
            )
          );
          return;
        }
        const appError: AppError = {
          code: "internal_error",
          message: err instanceof Error ? err.message : "Something went wrong.",
        };
        setError(appError);
        onMessagesChange(
          nextMessages.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: appError.message, status: "error" }
              : m
          )
        );
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [conversationId, isStreaming, messages, onMessagesChange]
  );

  const regenerate = useCallback(async () => {
    if (isStreaming || messages.length < 2) return;

    // Find last assistant message and remove it
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant) return;

    const idx = messages.findLastIndex((m) => m.id === lastAssistant.id);
    const withoutLast = messages.slice(0, idx);
    onMessagesChange(withoutLast);

    // Re-send the last user message
    const lastUser = [...withoutLast].reverse().find((m) => m.role === "user");
    if (!lastUser) return;

    await sendMessage(lastUser.content, lastUser.image);
  }, [isStreaming, messages, onMessagesChange, sendMessage]);

  return { isStreaming, error, clearError, sendMessage, stop, regenerate };
}
