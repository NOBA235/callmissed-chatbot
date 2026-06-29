"use client";

import { useState } from "react";
import { Plus, MessageSquare, Trash2, HelpCircle, X } from "lucide-react";
import type { Conversation } from "@/types/chat";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onGuide: () => void;
  isOpen: boolean;
  onClose: () => void;
}

function timeLabel(ts: number): string {
  const d = Date.now() - ts;
  if (d < 60_000) return "just now";
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m ago`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h ago`;
  if (d < 7 * 86_400_000) return `${Math.floor(d / 86_400_000)}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function Sidebar({
  conversations,
  activeId,
  onSelect,
  onCreate,
  onDelete,
  onGuide,
  isOpen,
  onClose,
}: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${isOpen ? "visible" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`sidebar ${isOpen ? "open" : ""}`}
        aria-label="Conversations"
      >
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-dot" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3" />
              </svg>
            </div>
            CallMissed
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            <ThemeToggle />
            {/* Mobile close */}
            <button
              className="btn-icon"
              onClick={onClose}
              aria-label="Close sidebar"
              style={{ display: "none" }}
              id="sidebar-close-btn"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* New chat */}
        <div className="sidebar-section">
          <button
            className="new-chat-btn"
            onClick={onCreate}
            aria-label="New conversation"
          >
            <Plus size={14} />
            New conversation
          </button>
        </div>

        {/* Conversation list */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "0 6px",
          }}
        >
          {conversations.length === 0 ? (
            <div
              style={{
                padding: "20px 8px",
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: 12,
                lineHeight: 1.6,
              }}
            >
              No conversations yet.
              <br />
              Start one above.
            </div>
          ) : (
            <>
              <div className="sidebar-section-label">Recent</div>
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`conv-item ${conv.id === activeId ? "active" : ""}`}
                  onClick={() => onSelect(conv.id)}
                  onMouseEnter={() => setHoveredId(conv.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  role="button"
                  tabIndex={0}
                  aria-current={conv.id === activeId ? "page" : undefined}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(conv.id);
                    }
                  }}
                >
                  <MessageSquare
                    size={13}
                    style={{ flexShrink: 0, color: "var(--text-muted)" }}
                    aria-hidden="true"
                  />
                  <span className="conv-title" title={conv.title}>
                    {conv.title}
                  </span>
                  {hoveredId === conv.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(conv.id);
                      }}
                      className="btn-icon"
                      style={{ width: 22, height: 22, flexShrink: 0, marginLeft: "auto" }}
                      aria-label={`Delete "${conv.title}"`}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          <button
            className="sidebar-footer-item"
            onClick={onGuide}
            aria-label="Getting started guide"
          >
            <HelpCircle size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
            <span style={{ fontSize: 13 }}>Getting started</span>
          </button>
          <div
            style={{
              padding: "4px 8px",
              fontSize: 11,
              color: "var(--text-muted)",
            }}
          >
            Free tier · kimi-k2.7-code
          </div>
        </div>
      </aside>

      <style>{`
        @media (max-width: 768px) {
          #sidebar-close-btn { display: flex !important; }
        }
      `}</style>
    </>
  );
}
