import type { ContentPart } from "@/types/api";

// ── Message ──────────────────────────────────────────────────────────────────

export type MessageRole = "user" | "assistant";
export type MessageStatus = "streaming" | "done" | "error";

export interface AttachedImage {
  /** data URI including prefix — used for display */
  dataUrl: string;
  /** raw base64 without prefix — sent to API */
  base64: string;
  mimeType: string;
  name?: string;
}

export interface GeneratedImageData {
  b64: string;
  mimeType: string;
  revisedPrompt?: string;
}

export interface Message {
  id: string;
  role: MessageRole;
  /** Text content of the message */
  content: string;
  /** Attached image for vision messages */
  image?: AttachedImage;
  /** AI-generated image result */
  generatedImage?: GeneratedImageData;
  status: MessageStatus;
  createdAt: number;
  /** Was this message the result of an image generation request? */
  isImageGeneration?: boolean;
}

// ── Conversation ─────────────────────────────────────────────────────────────

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

// ── App UI state ─────────────────────────────────────────────────────────────

export type Theme = "light" | "dark";

export interface AppError {
  code: string;
  message: string;
  retryAfter?: number;
}

// ── API-to-frontend message builder ─────────────────────────────────────────

/** Convert a Message to the API messages array format */
export function messageToApiFormat(msg: Message): {
  role: MessageRole;
  content: string | ContentPart[];
} {
  if (msg.image) {
    return {
      role: msg.role,
      content: [
        { type: "text", text: msg.content || "What do you see in this image?" },
        {
          type: "image_url",
          image_url: {
            url: `data:${msg.image.mimeType};base64,${msg.image.base64}`,
            detail: "auto",
          },
        },
      ],
    };
  }
  return { role: msg.role, content: msg.content };
}
