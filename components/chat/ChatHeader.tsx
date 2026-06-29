"use client";

import { Menu } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

interface Props {
  title: string;
  onMenuClick: () => void;
}

export function ChatHeader({ title, onMenuClick }: Props) {
  return (
    <header className="chat-header">
      {/* Mobile hamburger */}
      <button
        className="btn-icon"
        onClick={onMenuClick}
        aria-label="Open sidebar"
        id="header-menu-btn"
        style={{ display: "none", flexShrink: 0 }}
      >
        <Menu size={17} />
      </button>

      <h1 className="chat-header-title" title={title}>
        {title}
      </h1>

      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
        <ThemeToggle />
      </div>

      <style>{`
        @media (max-width: 768px) {
          #header-menu-btn { display: flex !important; }
        }
      `}</style>
    </header>
  );
}
