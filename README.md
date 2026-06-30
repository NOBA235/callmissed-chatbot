# CallMissed Chat

A full-stack AI chatbot built as an internship take-home project. The app uses Next.js 16, React 19, and the CallMissed API to support streaming chat, image generation, and vision-based image analysis in one polished interface.

Live demo: https://callmissed-chatbot.vercel.app/

---

## Project overview

The goal of this project was to build a practical AI chat experience that feels close to a real product rather than a minimal API demo. It includes a responsive chat UI, multiple conversations, markdown/code rendering, image upload, generated images, API route validation, rate limiting, and safe server-side handling of the CallMissed API key.

The project is intentionally built with a clear separation between the browser UI, API route handlers, validation, service logic, and provider client configuration. This keeps the code easier to test, debug, and extend.

---

## Features

| Feature | Details |
|---|---|
| Streaming chat | Uses `kimi-k2.7-code` through `/api/chat` and streams responses token by token with SSE |
| Image generation | Uses `flux-2-klein-9b` through `/api/image` and renders base64 image output inline |
| Vision input | Supports uploaded or pasted images through `/api/vision` for image analysis |
| Conversation history | Supports multiple local conversations persisted in `localStorage` |
| Markdown and code | Renders GFM markdown, code blocks, syntax highlighting, and copy buttons |
| Stop generation | Uses `AbortController` to cancel client fetches and upstream streams |
| Regenerate response | Re-sends the last user message and replaces the assistant response |
| Theme support | Supports light/dark mode with persisted preference |
| In-app guide | Explains how to add a CallMissed API key and which models are used |
| Rate limiting | Adds an in-memory per-IP sliding window limiter for chat, image, and vision endpoints |

---

## Tech stack

| Area | Technology |
|---|---|
| Framework | Next.js 16 App Router |
| UI | React 19, TypeScript |
| Styling | CSS custom properties and responsive layouts |
| AI provider | CallMissed API via the OpenAI-compatible SDK |
| Validation | Zod |
| Markdown | `react-markdown`, `remark-gfm`, `rehype-highlight` |
| Deployment target | Vercel |

---

## Running locally

```bash
# 1. Install dependencies
npm install

# 2. Create a local environment file
cp .env.example .env.local

# 3. Add your CallMissed API key to .env.local
CALLMISSED_API_KEY=cm_your_real_key_here

# 4. Start the development server
npm run dev
```

Open http://localhost:3000.

Get a CallMissed API key from https://app.callmissed.com, then create a key with `llm` and `image` permissions.

Important: restart the dev server after changing `.env` or `.env.local`.

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `CALLMISSED_API_KEY` | Yes | Server-only CallMissed API key. Do not prefix it with `NEXT_PUBLIC_`. |

The key is only read inside server-side route handlers and service modules. It is never exposed to browser JavaScript.

---

## API routes

| Route | Purpose | Response |
|---|---|---|
| `POST /api/chat` | Streams text chat completions | `text/event-stream` |
| `POST /api/image` | Generates images from text prompts | JSON with base64 image data |
| `POST /api/vision` | Streams image analysis responses | `text/event-stream` |

All API routes follow the same flow:

1. Read client IP for rate limiting.
2. Parse and validate request JSON with Zod.
3. Call the relevant service layer.
4. Normalize upstream or configuration errors into safe client responses.

---

## Architecture

```text
Browser / React Client
  -> /api/chat    -> streaming SSE response
  -> /api/image   -> JSON image response
  -> /api/vision  -> streaming SSE response

Next.js Route Handlers
  -> request validation
  -> per-route rate limiting
  -> service layer
  -> CallMissed client

CallMissed API
  -> kimi-k2.7-code for chat and vision
  -> flux-2-klein-9b for image generation
```

Key design decisions:

- Server-only API key handling using `server-only` modules.
- Thin route handlers that delegate provider logic to services.
- Shared error normalization for API, network, timeout, auth, and config errors.
- SSE output shaped as simple `data: {"content":"..."}` events for easier client parsing.
- Uploaded and generated image bytes are not persisted to `localStorage`.

---

## Debugging and fixes

During development, `/api/chat` and `/api/image` returned `500 Internal Server Error` when the local environment file was empty.

Fixes added:

- Missing API keys now return a clear `401 Unauthorized` response instead of an opaque `500`.
- Placeholder keys such as `cm_your_key_here` are rejected before calling the provider.
- A typed `ConfigError` was added so setup problems are handled by the normal API error layer.
- `next.config.ts` sets `turbopack.root` to the app folder to prevent Turbopack from scanning the parent user directory during builds.

Expected response when the API key is missing:

```json
{
  "error": {
    "code": "unauthorized",
    "message": "AI service is not configured. Add CALLMISSED_API_KEY to .env.local (or .env), then restart the dev server."
  }
}
```

---

## Verification

The project was verified with:

```bash
npx tsc --noEmit
npm run build
```

Both commands pass after the configuration and error-handling fixes.

---

## Trade-offs

- The rate limiter is in-memory, so it resets when the serverless instance restarts. A production version should use Redis, Upstash, or Vercel KV.
- Conversations are stored in `localStorage`, so they are device-local and do not sync across browsers.
- Image intent detection uses client-side pattern matching. A production version could route this through a lightweight classifier or LLM call.
- Generated image data is session-only to avoid storing large base64 payloads in browser storage.

---

## Future improvements

1. Add server-side conversation persistence with user accounts.
2. Replace the in-memory rate limiter with a durable store.
3. Add model and image-size selectors in the UI.
4. Add conversation search.
5. Add stronger end-to-end tests for chat, image generation, and vision flows.
6. Add structured logging for provider errors and latency.

---

## AI usage disclosure

This project was built with AI assistance as part of the development workflow.

- ChatGPT was used for project understanding, planning, and documentation guidance.
- Claude was used for architecture discussion, TypeScript design, CSS direction, and SSE debugging.
- Codex was used for code review, bug fixing, README cleanup, and implementation support.

All generated code and documentation were reviewed, edited, and tested before submission.

---

## Models

| Use case | Model |
|---|---|
| Chat and vision | `kimi-k2.7-code` |
| Image generation | `flux-2-klein-9b` |
