"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface Props {
  language?: string;
  children: string;
}

export function CodeBlock({ language, children }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayLang = language && language !== "text" ? language : null;

  return (
    <div style={{ position: "relative", marginBottom: "0.75em" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 12px",
          background: "var(--sidebar)",
          borderBottom: "1px solid var(--border)",
          borderRadius: "var(--radius-md) var(--radius-md) 0 0",
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontFamily: "ui-monospace, monospace",
            color: "var(--text-muted)",
            letterSpacing: "0.02em",
          }}
        >
          {displayLang ?? "code"}
        </span>
        <button
          onClick={copy}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "2px 7px",
            background: "transparent",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 11,
            color: copied ? "var(--success)" : "var(--text-muted)",
            fontFamily: "inherit",
            transition: "color 0.12s, background 0.12s",
          }}
          onMouseEnter={(e) => {
            if (!copied) (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            if (!copied) (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
          }}
          aria-label="Copy code"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre
        style={{
          margin: 0,
          borderRadius: "0 0 var(--radius-md) var(--radius-md)",
          border: "1px solid var(--border)",
          borderTop: "none",
          overflow: "hidden",
        }}
      >
        <code
          className={displayLang ? `language-${displayLang}` : undefined}
          style={{
            display: "block",
            overflowX: "auto",
            padding: "14px 16px",
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', ui-monospace, monospace",
            fontSize: 12.5,
            lineHeight: 1.65,
            background: "var(--surface)",
            color: "var(--text-primary)",
          }}
        >
          {children}
        </code>
      </pre>
    </div>
  );
}
