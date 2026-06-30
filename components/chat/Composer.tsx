"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { Send, Square, Paperclip, X } from "lucide-react";
import type { AttachedImage } from "@/types/chat";
import type { UseImageUploadReturn } from "@/hooks/useImageUpload";

interface Props {
  onSend: (text: string, image?: AttachedImage) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  imageUpload: UseImageUploadReturn;
  /** Pre-fill the input (e.g. from EmptyState suggestions) */
  prefill?: string;
  onPrefillConsumed?: () => void;
}

export function Composer({
  onSend,
  onStop,
  isStreaming,
  disabled,
  imageUpload,
  prefill,
  onPrefillConsumed,
}: Props) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const {
    image, isDragging, error: imageError,
    attach, clear,
    onDragEnter, onDragLeave, onDragOver, onDrop,
    onPaste, openFilePicker, fileInputRef,
  } = imageUpload;

  // Consume prefill from EmptyState
  useEffect(() => {
    if (prefill) {
      setText(prefill);
      textareaRef.current?.focus();
      onPrefillConsumed?.();
    }
  }, [prefill, onPrefillConsumed]);

  // Auto-resize textarea
  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    const maxHeight = window.matchMedia("(max-width: 768px)").matches ? 140 : 200;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, []);

  useEffect(() => { resize(); }, [text, resize]);

  const canSend = (text.trim().length > 0 || !!image) && !disabled;

  const submit = useCallback(() => {
    if (!canSend || isStreaming) return;
    onSend(text.trim(), image ?? undefined);
    setText("");
    clear();
    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [canSend, isStreaming, onSend, text, image, clear]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (isStreaming) {
        onStop();
      } else {
        submit();
      }
    }
    if (e.key === "Escape" && isStreaming) {
      onStop();
    }
  };

  return (
    <div
      className="composer-wrap"
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        style={{ display: "none" }}
        aria-hidden="true"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) attach(file);
        }}
      />

      {imageError && (
        <p
          style={{
            fontSize: 12,
            color: "var(--error)",
            marginBottom: 6,
            paddingLeft: 2,
          }}
          role="alert"
        >
          {imageError}
        </p>
      )}

      <div
        className={`composer${isDragging ? " composer-drag-over" : ""}`}
        role="region"
        aria-label="Message composer"
      >
        {/* Attached image preview */}
        {image && (
          <div className="image-preview-strip">
            <div className="image-preview-thumb">
              <img src={image.dataUrl} alt="Attached image" />
              <button
                onClick={clear}
                className="image-preview-remove"
                aria-label="Remove attached image"
              >
                <X size={9} />
              </button>
            </div>
          </div>
        )}

        {/* Drag overlay */}
        {isDragging && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--accent-soft)",
              borderRadius: "var(--radius-lg)",
              color: "var(--accent-text)",
              fontSize: 13,
              fontWeight: 500,
              pointerEvents: "none",
              zIndex: 10,
            }}
            aria-hidden="true"
          >
            Drop image to attach
          </div>
        )}

        <textarea
          ref={textareaRef}
          className="composer-textarea"
          placeholder={image ? "Ask about this image…" : "Message… (⌘↵ to send, Shift+↵ for newline)"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          disabled={disabled}
          rows={1}
          aria-label="Message input"
          aria-multiline="true"
        />

        <div className="composer-toolbar">
          <div className="composer-actions-left">
            <button
              onClick={openFilePicker}
              className="btn-icon"
              style={{ width: 30, height: 30 }}
              aria-label="Attach image"
              title="Attach image (JPEG, PNG, GIF, WebP)"
              disabled={disabled}
            >
              <Paperclip size={15} />
            </button>
          </div>

          <div className="composer-actions-right">
            <span
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                display: text.length > 50 ? "block" : "none",
              }}
              aria-hidden="true"
            >
              {text.length}
            </span>

            {isStreaming ? (
              <button
                onClick={onStop}
                className="btn-stop"
                aria-label="Stop generation"
                title="Stop generation (Esc)"
              >
                <Square size={12} fill="currentColor" />
              </button>
            ) : (
              <button
                onClick={submit}
                className="btn-send"
                disabled={!canSend}
                aria-label="Send message"
                title="Send (Enter)"
              >
                <Send size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      <p
        className="composer-disclaimer"
        style={{
          fontSize: 11,
          color: "var(--text-muted)",
          textAlign: "center",
          marginTop: 8,
          lineHeight: 1.4,
        }}
      >
        Powered by{" "}
        <a
          href="https://docs.callmissed.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--text-muted)", textDecoration: "underline", textUnderlineOffset: 2 }}
        >
          CallMissed API
        </a>
        . Messages are not stored on our servers.
      </p>
    </div>
  );
}
