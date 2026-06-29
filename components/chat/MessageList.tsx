"use client";

import { useEffect, useRef } from "react";
import type { Message } from "@/types/chat";
import { MessageBubble } from "./MessageBubble";

interface Props {
  messages: Message[];
  isStreaming: boolean;
  onRegenerate: () => void;
}

export function MessageList({ messages, isStreaming, onRegenerate }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const userScrolledRef = useRef(false);

  // Track whether user has manually scrolled up
  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    userScrolledRef.current = !atBottom;
  };

  // Auto-scroll to bottom when new content arrives, unless user scrolled up
  useEffect(() => {
    if (!userScrolledRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages]);

  // Always scroll to bottom on new conversation (messages reset)
  useEffect(() => {
    userScrolledRef.current = false;
    bottomRef.current?.scrollIntoView({ behavior: "instant", block: "end" });
  }, []);

  const lastAssistantIdx = messages.findLastIndex((m) => m.role === "assistant");

  // Typing indicator: show when streaming but the last assistant message has no content yet
  const showTyping =
    isStreaming &&
    messages.length > 0 &&
    messages[messages.length - 1].role === "assistant" &&
    messages[messages.length - 1].content === "";

  return (
    <div
      className="messages-scroll"
      ref={scrollRef}
      onScroll={onScroll}
    >
      <div className="messages-inner">
        {messages.map((msg, idx) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isLast={idx === lastAssistantIdx}
            onRegenerate={idx === lastAssistantIdx && !isStreaming ? onRegenerate : undefined}
          />
        ))}

        {/* Typing indicator */}
        {showTyping && (
          <div className="msg-row assistant" style={{ paddingLeft: 0 }}>
            <div className="msg-avatar assistant" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
              </svg>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "10px 0 4px",
              }}
              aria-label="Assistant is typing"
            >
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--text-muted)",
                    display: "inline-block",
                    animation: `typing-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} style={{ height: 1 }} aria-hidden="true" />
      </div>
    </div>
  );
}
