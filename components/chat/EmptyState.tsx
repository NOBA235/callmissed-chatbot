"use client";

interface Suggestion {
  title: string;
  desc: string;
  prompt: string;
}

const SUGGESTIONS: Suggestion[] = [
  {
    title: "Explain a concept",
    desc: "Break down something complex",
    prompt: "Explain how transformer attention works in simple terms",
  },
  {
    title: "Write code",
    desc: "Generate, review, or debug",
    prompt: "Write a TypeScript function that debounces async functions",
  },
  {
    title: "Generate an image",
    desc: "Describe what you want",
    prompt: "Draw a minimalist mountain landscape at golden hour",
  },
  {
    title: "Analyze an image",
    desc: "Upload a photo to discuss",
    prompt: "Upload an image using the attach button and ask anything about it",
  },
];

interface Props {
  onSuggestion: (prompt: string) => void;
}

export function EmptyState({ onSuggestion }: Props) {
  return (
    <div className="empty-state">
      <div className="empty-logo" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.8">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" />
        </svg>
      </div>
      <h1 className="empty-title">What can I help with?</h1>
      <p className="empty-sub">
        Chat, generate images, or upload a photo and ask questions about it.
      </p>
      <div className="empty-suggestions" role="list">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.title}
            className="suggestion-card"
            role="listitem"
            onClick={() => {
              if (!s.prompt.includes("Upload")) {
                onSuggestion(s.prompt);
              }
            }}
            disabled={s.prompt.includes("Upload")}
            style={s.prompt.includes("Upload") ? { cursor: "default", opacity: 0.7 } : undefined}
          >
            <div className="suggestion-title">{s.title}</div>
            <div className="suggestion-desc">{s.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
