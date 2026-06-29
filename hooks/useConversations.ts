"use client";

import { useState, useEffect, useCallback } from "react";
import type { Conversation, Message } from "@/types/chat";

const STORAGE_KEY = "cm-conversations";
const MAX_CONVERSATIONS = 25;
const MAX_MESSAGES_PER_CONV = 100;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadConversations(): Conversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Conversation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveConversations(conversations: Conversation[]): void {
  try {
    // Prune to max conversations, sorted by most recent
    const pruned = [...conversations]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_CONVERSATIONS)
      // Don't persist base64 image data — it bloats storage significantly.
      // Generated images and uploaded image bytes are session-only.
      .map((conv) => ({
        ...conv,
        messages: conv.messages
          .slice(-MAX_MESSAGES_PER_CONV)
          .map((msg) => ({
            ...msg,
            // Strip b64 data from generated images
            generatedImage: msg.generatedImage
              ? { ...msg.generatedImage, b64: "" }
              : undefined,
            // Strip uploaded image bytes
            image: msg.image
              ? { ...msg.image, base64: "", dataUrl: "[image]" }
              : undefined,
          })),
      }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
  } catch {
    // Storage quota exceeded — fail silently
  }
}

function deriveTitle(messages: Message[]): string {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "New conversation";
  const text = first.content.trim().replace(/\s+/g, " ");
  return text.length > 48 ? text.slice(0, 48) + "…" : text || "New conversation";
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Load on mount
  useEffect(() => {
    const loaded = loadConversations();
    setConversations(loaded);
    if (loaded.length > 0) {
      setActiveId(loaded.sort((a, b) => b.updatedAt - a.updatedAt)[0].id);
    }
  }, []);

  // Persist on change
  useEffect(() => {
    if (conversations.length > 0) {
      saveConversations(conversations);
    }
  }, [conversations]);

  const activeConversation = conversations.find((c) => c.id === activeId) ?? null;

  const createConversation = useCallback((): string => {
    const id = generateId();
    const now = Date.now();
    const conv: Conversation = {
      id,
      title: "New conversation",
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    setConversations((prev) => [conv, ...prev]);
    setActiveId(id);
    return id;
  }, []);

  const selectConversation = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const deleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => {
        const next = prev.filter((c) => c.id !== id);
        if (id === activeId) {
          setActiveId(next.length > 0 ? next[0].id : null);
        }
        if (next.length === 0) {
          localStorage.removeItem(STORAGE_KEY);
        }
        return next;
      });
    },
    [activeId]
  );

  const updateMessages = useCallback(
    (conversationId: string, messages: Message[]) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                messages,
                title: deriveTitle(messages),
                updatedAt: Date.now(),
              }
            : c
        )
      );
    },
    []
  );

  return {
    conversations: [...conversations].sort((a, b) => b.updatedAt - a.updatedAt),
    activeId,
    activeConversation,
    createConversation,
    selectConversation,
    deleteConversation,
    updateMessages,
  };
}
