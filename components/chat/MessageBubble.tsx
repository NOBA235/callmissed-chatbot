"use client";

import { useState } from "react";
import { Copy, Check, RefreshCw, AlertCircle } from "lucide-react";
import type { Message } from "@/types/chat";
import { MarkdownContent } from "@/components/ui/MarkdownContent";
import { GeneratedImage } from "@/components/ui/GeneratedImage";

interface Props {
  message: Message;
  isLast: boolean;
  onRegenerate?: () => void;
}

export function MessageBubble({ message, isLast, onRegenerate }: Props) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const isStreaming = message.status === "streaming";
  const isError = message.status === "error";

  const copy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="msg-group">
      <div className={`msg-row ${isUser ? "user" : "assistant"}`}>
        {!isUser && (
          <div className="msg-avatar assistant" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
            </svg>
          </div>
        )}
        <div className={`msg-bubble ${isUser ? "user" : "assistant"}`}>
          {/* Attached image (vision) */}
          {message.image && message.image.dataUrl !== "[image]" && (
            <img
              src={message.image.dataUrl}
              alt={message.image.name ?? "Uploaded image"}
              className="inline-image"
            />
          )}

          {/* Main content */}
          {isError ? (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 7,
                color: "var(--error)",
                fontSize: 13,
              }}
            >
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{message.content}</span>
            </div>
          ) : isUser ? (
            <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>
              {message.content}
            </p>
          ) : (
            <MarkdownContent content={message.content} isStreaming={isStreaming} />
          )}

          {/* Generated image */}
          {message.generatedImage && (
            <GeneratedImage image={message.generatedImage} />
          )}
        </div>
      </div>

      {/* Message actions */}
      {!isStreaming && (
        <div
          className="msg-actions"
          style={{
            paddingLeft: isUser ? 0 : 38,
            justifyContent: isUser ? "flex-end" : "flex-start",
          }}
        >
          {message.content && (
            <button
              onClick={copy}
              className="btn-icon"
              style={{ width: 26, height: 26 }}
              aria-label="Copy message"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
            </button>
          )}
          {!isUser && isLast && onRegenerate && (
            <button
              onClick={onRegenerate}
              className="btn-icon"
              style={{ width: 26, height: 26 }}
              aria-label="Regenerate response"
            >
              <RefreshCw size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
