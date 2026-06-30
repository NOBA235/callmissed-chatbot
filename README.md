# CallMissed Chat

A production-quality AI chatbot built with Next.js 16, powered by the [CallMissed API](https://docs.callmissed.com).

**Live demo:** *(deploy to Vercel and add URL here)*

---

## What it does

| Feature | Details |
|---|---|
| **Streaming chat** | kimi-k2.7-code via `/api/chat`, SSE streamed token-by-token |
| **Image generation** | flux-2-klein-9b via `/api/image`, b64_json decoded inline |
| **Vision / image input** | Upload or paste any image, kimi-k2.7-code analyzes it |
| **Conversation history** | Multiple chats, persisted in localStorage |
| **Markdown + code** | Full GFM rendering, syntax highlighting, copy button |
| **Stop generation** | AbortController cancels both client fetch and upstream stream |
| **Regenerate** | Re-sends last user message and replaces assistant response |
| **Light / dark theme** | System preference detection, persisted in localStorage |
| **In-app guide** | Explains how to get a `cm_` key, lists both models |
| **Rate limiting** | In-memory sliding window: 20 chat / 10 image / 15 vision per min per IP |

---

## Running locally

```bash
# 1. Clone and install
git clone <your-repo>
cd callmissed-chat
npm install

# 2. Set your API key
cp .env.example .env.local
# Edit .env.local and paste your key:
# CALLMISSED_API_KEY=cm_your_key_here
# Restart the dev server after changing env files.

# 3. Start
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **Get a free API key:** [app.callmissed.com](https://app.callmissed.com) → Profile → API Keys → Create.  
> Give it the `llm` and `image` permissions.

---

## Recent fixes

The app was showing `500 Internal Server Error` in the browser console for:

- `POST /api/chat`
- `POST /api/image`

Root cause: the local `.env` file was empty, so the server had no `CALLMISSED_API_KEY`. Both chat and image generation use the same server-side CallMissed client, so both endpoints failed together.

What was fixed:

- Missing or placeholder API keys now return a clear `401` JSON response instead of an opaque `500`.
- The server trims `CALLMISSED_API_KEY` and rejects placeholder values like `cm_your_key_here`.
- A typed `ConfigError` was added so local setup issues are handled safely by the existing API error layer.
- `next.config.ts` now sets `turbopack.root` to the app folder, preventing Next/Turbopack from scanning the parent user directory and crashing during `npm run build`.
- `.env.example` and this README now show the correct key format and remind you to restart the dev server after changing env files.

Expected response when the key is missing:

```json
{
  "error": {
    "code": "unauthorized",
    "message": "AI service is not configured. Add CALLMISSED_API_KEY to .env.local (or .env), then restart the dev server."
  }
}
```

To complete the local fix, add a real key:

```env
CALLMISSED_API_KEY=cm_your_real_key_here
```

Then restart the dev server:

```bash
npm run dev
```

Verified after the fix:

```bash
npx tsc --noEmit
npm run build
```

Both commands pass.

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `CALLMISSED_API_KEY` | ✅ | Your `cm_` key — **never use `NEXT_PUBLIC_` prefix** |

---

## Architecture

```
Browser (React Client)
    ↓ POST /api/chat    → streams SSE
    ↓ POST /api/image   → returns { images: [{ b64, mimeType }] }
    ↓ POST /api/vision  → streams SSE

Next.js Route Handlers (Node.js, server-only)
    ↓ CALLMISSED_API_KEY injected here — never leaves server
    ↓ OpenAI SDK → https://api.callmissed.com/v1
```

Key design decisions:

- **`server-only`** guard on all `lib/` files — build error if accidentally imported in a client component
- **Thin route handlers** — validate → rate-limit → delegate to service → return response. No business logic in routes.
- **SSE format** `data: {"content":"…"}\n\n` — simpler than raw OpenAI wire format, trivial to parse
- **No base64 in localStorage** — generated images and uploaded photo bytes are session-only; conversation text persists

---

## Trade-offs

- **In-memory rate limiter** resets on cold start. Production would use Upstash Redis / Vercel KV.
- **localStorage** for conversations means no cross-device sync. Acceptable for a demo.
- **Image intent detection** uses regex — good enough, but a small LLM call would be more reliable at scale.
- **No message streaming to localStorage** — content only persists after `status: "done"`, so a hard refresh mid-stream loses that turn.

---

## What I'd do next

1. Deploy on Vercel (15 minutes) — add live URL here
2. Persist conversations server-side (Supabase / PlanetScale) for cross-device sync
3. Replace in-memory rate limiter with Upstash Redis
4. Add conversation search
5. Add image size / model selector for the optional nice-to-haves
6. Add `next/image` for the generated image display

---

## AI usage

Built with Claude (Anthropic) as a coding assistant throughout. Claude was used for:
- Architecture planning and code review
- TypeScript type design
- CSS design system tokens
- Debugging edge cases in the SSE stream parser
- Writing this README

All code was reviewed, understood, and manually verified before committing.

---

## Models

| Use | Model |
|---|---|
| Chat + Vision | `kimi-k2.7-code` |
| Image generation | `flux-2-klein-9b` |
