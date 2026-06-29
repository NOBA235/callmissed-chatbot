"use client";

import { useState } from "react";
import { Download, ImageIcon } from "lucide-react";
import type { GeneratedImageData } from "@/types/chat";

interface Props {
  image: GeneratedImageData;
}

export function GeneratedImage({ image }: Props) {
  const [loaded, setLoaded] = useState(false);
  const src = `data:${image.mimeType};base64,${image.b64}`;

  const download = () => {
    const a = document.createElement("a");
    a.href = src;
    a.download = `callmissed-${Date.now()}.png`;
    a.click();
  };

  // If b64 was stripped (loaded from localStorage), show placeholder
  if (!image.b64) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 14px",
          background: "var(--sidebar)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border)",
          color: "var(--text-muted)",
          fontSize: 13,
          marginTop: 8,
        }}
      >
        <ImageIcon size={14} />
        Image not available after reload
      </div>
    );
  }

  return (
    <div className="generated-image-wrap">
      {!loaded && (
        <div
          style={{
            width: "100%",
            maxWidth: 400,
            aspectRatio: "1",
            background: "var(--sidebar)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              border: "2px solid var(--border)",
              borderTopColor: "var(--accent)",
              borderRadius: "50%",
              animation: "spin 0.7s linear infinite",
            }}
          />
        </div>
      )}
      <img
        src={src}
        alt="AI generated image"
        style={{ display: loaded ? "block" : "none" }}
        onLoad={() => setLoaded(true)}
      />
      {loaded && (
        <div className="generated-image-footer">
          {image.revisedPrompt && (
            <p className="revised-prompt" title={image.revisedPrompt}>
              {image.revisedPrompt.length > 80
                ? image.revisedPrompt.slice(0, 80) + "…"
                : image.revisedPrompt}
            </p>
          )}
          <button
            onClick={download}
            className="btn btn-ghost"
            style={{
              flexShrink: 0,
              fontSize: 12,
              height: 28,
              padding: "0 10px",
              gap: 5,
            }}
            aria-label="Download generated image"
          >
            <Download size={13} />
            Download
          </button>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
