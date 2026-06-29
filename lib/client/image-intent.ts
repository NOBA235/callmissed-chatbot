// Detects whether a user message is requesting image generation.
// Used client-side to route to /api/image instead of /api/chat.

// Explicit slash command — highest priority, no false positives
const SLASH_COMMAND = /^\/(?:image|img|draw|generate|gen|imagine)\s+(.+)/i;

// Natural-language patterns — conservative to avoid false positives.
// Requires both a creation verb AND an image noun in the same message.
const CREATION_VERBS =
  /\b(?:draw|paint|generate|create|make|render|design|sketch|illustrate|produce|imagine|show me)\b/i;

const IMAGE_NOUNS =
  /\b(?:image|picture|photo|photograph|painting|illustration|artwork|art|poster|wallpaper|portrait|landscape|scene|visual|graphic|logo|icon|banner|thumbnail)\b/i;

export interface ImageIntentResult {
  isImageRequest: boolean;
  /** Cleaned prompt to send to /api/image (may differ from raw input) */
  prompt: string;
}

export function detectImageIntent(input: string): ImageIntentResult {
  const trimmed = input.trim();

  // Check slash command first
  const slashMatch = trimmed.match(SLASH_COMMAND);
  if (slashMatch) {
    return { isImageRequest: true, prompt: slashMatch[1].trim() };
  }

  // Natural language: both verb + noun must appear
  if (CREATION_VERBS.test(trimmed) && IMAGE_NOUNS.test(trimmed)) {
    return { isImageRequest: true, prompt: trimmed };
  }

  return { isImageRequest: false, prompt: trimmed };
}
