import { z } from "zod";

// ── Shared sub-schemas ───────────────────────────────────────────────────────

const textPartSchema = z.object({
  type: z.literal("text"),
  text: z.string().min(1),
});

const imageUrlPartSchema = z.object({
  type: z.literal("image_url"),
  image_url: z.object({
    url: z
      .string()
      .min(1)
      .refine(
        (val) => val.startsWith("http") || val.startsWith("data:"),
        { message: "image_url.url must be an https URL or a data URI" }
      ),
    detail: z.enum(["auto", "low", "high"]).optional(),
  }),
});

const contentPartSchema = z.discriminatedUnion("type", [
  textPartSchema,
  imageUrlPartSchema,
]);

// A message's content: either a plain string or an array of content parts
const messageContentSchema = z.union([
  z.string().min(1, "Message content must not be empty"),
  z.array(contentPartSchema).min(1),
]);

const messageRoleSchema = z.enum(["system", "user", "assistant"]);

const chatMessageSchema = z.object({
  role: messageRoleSchema,
  content: messageContentSchema,
});

// ── /api/chat ────────────────────────────────────────────────────────────────

export const chatRequestSchema = z.object({
  messages: z
    .array(chatMessageSchema)
    .min(1, "At least one message is required")
    .max(200, "Message history too long — max 200 messages"),
});

export type ValidatedChatRequest = z.infer<typeof chatRequestSchema>;

// ── /api/image ───────────────────────────────────────────────────────────────

export const imageRequestSchema = z.object({
  prompt: z
    .string()
    .min(1, "Prompt must not be empty")
    .max(2000, "Prompt too long — max 2000 characters")
    .trim(),
  size: z.enum(["256x256", "512x512", "1024x1024"]).optional().default("1024x1024"),
  n: z.number().int().min(1).max(4).optional().default(1),
});

export type ValidatedImageRequest = z.infer<typeof imageRequestSchema>;

// ── /api/vision ──────────────────────────────────────────────────────────────

export const visionRequestSchema = z.object({
  messages: z
    .array(chatMessageSchema)
    .min(1, "At least one message is required")
    .max(100, "Message history too long — max 100 messages")
    .refine(
      // At least one message must contain an image_url part so the
      // /api/vision endpoint isn't used as a plain chat fallback.
      (msgs) =>
        msgs.some((msg) => {
          if (!Array.isArray(msg.content)) return false;
          return msg.content.some((part) => part.type === "image_url");
        }),
      {
        message:
          "Vision requests must include at least one message with an image_url content part",
      }
    ),
});

export type ValidatedVisionRequest = z.infer<typeof visionRequestSchema>;

// ── Helper: parse + return typed error ───────────────────────────────────────

export interface ValidationResult<T> {
  success: true;
  data: T;
}

export interface ValidationError {
  success: false;
  error: string; // human-readable, safe to send to client
}

export type ValidationOutcome<T> = ValidationResult<T> | ValidationError;

export function validateBody<T>(
  schema: z.ZodSchema<T>,
  raw: unknown
): ValidationOutcome<T> {
  const result = schema.safeParse(raw);
  if (result.success) {
    return { success: true, data: result.data };
  }
  // Flatten Zod v4 issues into a single readable string — safe for client
  const message = result.error.issues
    .map((e) =>
      `${e.path.map(String).join(".") || "body"}: ${e.message}`
    )
    .join("; ");
  return { success: false, error: message };
}
