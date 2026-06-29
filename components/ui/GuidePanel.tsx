"use client";

import { X, ExternalLink } from "lucide-react";

interface Props {
  onClose: () => void;
}

export function GuidePanel({ onClose }: Props) {
  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Getting started guide">
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 500 }}
      >
        {/* Header */}
        <div className="guide-header">
          <h2 className="guide-title">Getting started</h2>
          <button
            onClick={onClose}
            className="btn-icon"
            aria-label="Close guide"
            style={{ color: "var(--text-muted)" }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="guide-body">
          {/* Steps */}
          <div className="guide-step">
            <div className="guide-step-num">1</div>
            <div className="guide-step-content">
              <div className="guide-step-label">Get your free API key</div>
              <div className="guide-step-text">
                Sign up at{" "}
                <a
                  href="https://app.callmissed.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--accent)", textDecoration: "underline", textUnderlineOffset: 2 }}
                >
                  app.callmissed.com
                </a>
                , go to Profile → API Keys → Create. Give it <code style={{ fontSize: 11, background: "var(--sidebar)", padding: "1px 5px", borderRadius: 4, border: "1px solid var(--border)" }}>llm</code> and <code style={{ fontSize: 11, background: "var(--sidebar)", padding: "1px 5px", borderRadius: 4, border: "1px solid var(--border)" }}>image</code> permissions.
              </div>
            </div>
          </div>

          <div className="guide-step">
            <div className="guide-step-num">2</div>
            <div className="guide-step-content">
              <div className="guide-step-label">Add it to your environment</div>
              <div className="guide-step-text">
                Copy your key (starts with <code style={{ fontSize: 11, background: "var(--sidebar)", padding: "1px 5px", borderRadius: 4, border: "1px solid var(--border)" }}>cm_</code>) and add it to{" "}
                <code style={{ fontSize: 11, background: "var(--sidebar)", padding: "1px 5px", borderRadius: 4, border: "1px solid var(--border)" }}>.env.local</code>:
                <div
                  style={{
                    marginTop: 6,
                    padding: "8px 12px",
                    background: "var(--sidebar)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    fontFamily: "ui-monospace, monospace",
                    fontSize: 12,
                    color: "var(--text-secondary)",
                  }}
                >
                  CALLMISSED_API_KEY=cm_your_key
                </div>
              </div>
            </div>
          </div>

          <div className="guide-step">
            <div className="guide-step-num">3</div>
            <div className="guide-step-content">
              <div className="guide-step-label">Start chatting</div>
              <div className="guide-step-text">
                Type any message to chat, or ask to draw an image.
                Upload a photo using the attach button to ask questions about it.
              </div>
            </div>
          </div>

          {/* Models */}
          <div
            style={{
              padding: "12px 14px",
              background: "var(--sidebar)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              Models in use
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text-primary)", marginBottom: 1 }}>Chat &amp; Vision</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>262K context · vision-capable</div>
                </div>
                <code className="model-chip">kimi-k2.7-code</code>
              </div>
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 8, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--text-primary)", marginBottom: 1 }}>Image generation</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Free tier · base64 output</div>
                </div>
                <code className="model-chip">flux-2-klein-9b</code>
              </div>
            </div>
          </div>

          {/* Docs link */}
          <a
            href="https://docs.callmissed.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 13,
              color: "var(--accent)",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Read the full docs
            <ExternalLink size={13} />
          </a>
        </div>
      </div>
    </div>
  );
}
