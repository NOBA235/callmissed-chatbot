"use client";

import { useState, useCallback } from "react";
import type { Conversation, Message } from "@/types/chat";
import { useChat } from "@/hooks/useChat";
import { useImageUpload } from "@/hooks/useImageUpload";
import { MessageList } from "./MessageList";
import { EmptyState } from "./EmptyState";
import { Composer } from "./Composer";
import { ErrorBanner } from "@/components/ui/ErrorBanner";

interface Props {
  conversation: Conversation | null;
  onMessagesChange: (msgs: Message[]) => void;
}

export function ChatPane({ conversation, onMessagesChange }: Props) {
  const [prefill, setPrefill] = useState<string | undefined>();
  const imageUpload = useImageUpload();

  const { isStreaming, error, clearError, sendMessage, stop, regenerate } =
    useChat(
      conversation?.id ?? null,
      conversation?.messages ?? [],
      onMessagesChange
    );

  const handleSuggestion = useCallback((prompt: string) => {
    setPrefill(prompt);
  }, []);

  const messages = conversation?.messages ?? [];
  const isEmpty = messages.length === 0;

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      {/* Error banner */}
      {error && (
        <div style={{ padding: "0 16px", flexShrink: 0 }}>
          <ErrorBanner error={error} onDismiss={clearError} />
        </div>
      )}

      {/* Messages or empty state */}
      {isEmpty ? (
        <EmptyState onSuggestion={handleSuggestion} />
      ) : (
        <MessageList
          messages={messages}
          isStreaming={isStreaming}
          onRegenerate={regenerate}
        />
      )}

      {/* Composer */}
      <Composer
        onSend={sendMessage}
        onStop={stop}
        isStreaming={isStreaming}
        disabled={!conversation}
        imageUpload={imageUpload}
        prefill={prefill}
        onPrefillConsumed={() => setPrefill(undefined)}
      />
    </div>
  );
}
