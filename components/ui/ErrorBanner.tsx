"use client";

import { AlertCircle, X, ExternalLink } from "lucide-react";
import type { AppError } from "@/types/chat";

const CODE_CONTEXT: Partial<Record<string, { action?: string; link?: string }>> = {
  credits_exhausted: {
    action: "Add credits",
    link: "https://app.callmissed.com",
  },
  rate_limited: {
    action: "Check limits",
    link: "https://docs.callmissed.com",
  },
  unauthorized: {
    action: "View docs",
    link: "https://docs.callmissed.com",
  },
};

interface Props {
  error: AppError;
  onDismiss: () => void;
}

export function ErrorBanner({ error, onDismiss }: Props) {
  const ctx = CODE_CONTEXT[error.code];
  const retryMsg =
    error.retryAfter != null
      ? ` Retry in ${error.retryAfter}s.`
      : "";

  return (
    <div
      className="error-banner"
      role="alert"
      aria-live="assertive"
    >
      <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
      <span className="error-banner-msg">
        {error.message}
        {retryMsg}
        {ctx?.link && (
          <>
            {" "}
            <a
              href={ctx.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "var(--error)",
                textDecoration: "underline",
                textUnderlineOffset: "2px",
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              {ctx.action}
              <ExternalLink size={10} />
            </a>
          </>
        )}
      </span>
      <button
        onClick={onDismiss}
        className="btn-icon"
        style={{ width: 20, height: 20, color: "var(--error)", flexShrink: 0 }}
        aria-label="Dismiss error"
      >
        <X size={12} />
      </button>
    </div>
  );
}
