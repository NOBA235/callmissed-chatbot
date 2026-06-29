"use client";

import { useState, useEffect, useCallback } from "react";
import { useConversations } from "@/hooks/useConversations";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { ChatHeader } from "@/components/chat/ChatHeader";
import { ChatPane } from "@/components/chat/ChatPane";
import { GuidePanel } from "@/components/ui/GuidePanel";
import type { Message } from "@/types/chat";

export default function Home() {
  const {
    conversations,
    activeId,
    activeConversation,
    createConversation,
    selectConversation,
    deleteConversation,
    updateMessages,
  } = useConversations();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  // Create initial conversation on first load
  useEffect(() => {
    if (conversations.length === 0) {
      createConversation();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Close sidebar when pressing Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const handleMessagesChange = useCallback(
    (msgs: Message[]) => {
      if (activeId) updateMessages(activeId, msgs);
    },
    [activeId, updateMessages]
  );

  const handleCreate = useCallback(() => {
    createConversation();
    setSidebarOpen(false);
  }, [createConversation]);

  const handleSelect = useCallback(
    (id: string) => {
      selectConversation(id);
      setSidebarOpen(false);
    },
    [selectConversation]
  );

  const title =
    activeConversation?.title ??
    (conversations.length === 0 ? "New conversation" : "Select a conversation");

  return (
    <main className="app-shell">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={handleSelect}
        onCreate={handleCreate}
        onDelete={deleteConversation}
        onGuide={() => setGuideOpen(true)}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="chat-area">
        <ChatHeader
          title={title}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <ChatPane
          conversation={activeConversation}
          onMessagesChange={handleMessagesChange}
        />
      </div>

      {guideOpen && <GuidePanel onClose={() => setGuideOpen(false)} />}
    </main>
  );
}
