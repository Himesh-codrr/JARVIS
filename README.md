# JARVIS Voice Assistant

A standalone, framework-free voice assistant that people can embed into **any website**. It is not tied to CivicEye, React, Tailwind, React Router, Supabase, or any other application.

The browser handles microphone input and spoken replies with native Web Speech APIs. Your server endpoint handles the assistant response, keeping LLM keys out of the browser.

## What is included

- Custom element: `<jarvis-assistant>`
- IIFE widget bundle for plain HTML sites
- TypeScript core for chat streaming, voice input/output, and optional navigation intents
- Generic OpenAI-compatible streaming API route at `api/chat.js`
- Configurable name, theme, accent, language, endpoint, prompts, and routes
- No audio upload: only the browser-recognized transcript is sent to your endpoint
- No runtime dependency for the embeddable widget

## Requirements

- Node.js `22.23.3` (`.nvmrc`)
- npm 10+
- A browser with Web Speech support for microphone input (Chrome and Edge are recommended)

Voice input requires `localhost` or HTTPS and microphone permission.

## Install and run the demo

```bash
nvm use
npm ci
npm run dev
```

Open <http://localhost:5173/>. Click the JARVIS button, allow microphone access, and try typed or spoken input.

The local Vite demo serves the widget UI. To get assistant replies, point the widget at a deployed API or run the API with a platform such as Vercel.

## Build

```bash
make test
make build
npm run preview -- --host 0.0.0.0
```

Build outputs:

- `dist/demo/` — local demo page
- `dist/widget/jarvis-widget.iife.js` — script-tag bundle for any website
- `dist/widget/jarvis-widget.es.js` — ES module bundle

## Embed on any website

Deploy the widget bundle and API to your own domain, then add this to any HTML page:

```html
<script
  src="https://assistant.example.com/jarvis-widget.iife.js"
  defer
></script>

<jarvis-assistant
  data-endpoint="https://assistant.example.com/api/chat"
  data-assistant-name="JARVIS"
  data-site-name="My Website"
  data-subtitle="Voice assistant · online"
  data-theme="dark"
  data-accent="#8AFFF0"
  data-language="en-US"
></jarvis-assistant>
```

The custom element is isolated with Shadow DOM, so the host website does not need React, Tailwind, or any CSS framework.

### Supported attributes

| Attribute | Example | Purpose |
|---|---|---|
| `data-endpoint` | `https://assistant.example.com/api/chat` | Streaming assistant endpoint |
| `data-assistant-name` | `JARVIS` | Display name |
| `data-site-name` | `My Website` | Host website label |
| `data-subtitle` | `Voice assistant · online` | Header subtitle |
| `data-placeholder` | `Ask a question…` | Input placeholder |
| `data-theme` | `dark`, `light` | Color mode |
| `data-accent` | `#8AFFF0` | Accent color |
| `data-language` | `en-US`, `hi-IN` | Speech language |
| `auto-open` | — | Open automatically |
| `data-read-aloud="false"` | — | Disable spoken replies initially |
| `data-auto-send="true"` | — | Send after a final voice transcript |

## Navigation integration

The widget can optionally recognize configured navigation commands and dispatch a `jarvis:navigate` event. The host website remains in control of routing:

```html
<script>
  document.addEventListener('jarvis:navigate', (event) => {
    const { path } = event.detail
    window.location.assign(path)
  })
</script>
```

For a custom route table, initialize the element from JavaScript:

```js
const jarvis = document.querySelector('jarvis-assistant')
jarvis.configure?.({
  routes: [
    { path: '/', label: 'home', aliases: ['home', 'homepage'] },
    { path: '/pricing', label: 'pricing', aliases: ['plans', 'pricing page'] },
  ],
})
```

## API endpoint

The included `api/chat.js` is a Vercel-compatible serverless handler. It accepts:

```http
POST /api/chat
Content-Type: application/json
```

```json
{
  "messages": [
    { "role": "user", "content": "Hello" }
  ]
}
```

It returns server-sent events:

```text
data: {"type":"content","text":"Hello"}

data: {"type":"done"}
```

Copy `.env.example` to `.env` for local/server configuration:

```bash
cp .env.example .env
```

Set these on the server only:

```env
LLM_BASE_URL=https://api.openai.com/v1
LLM_API_KEY=your-server-side-key
LLM_MODEL=your-model
ALLOWED_ORIGINS=https://www.example.com,http://localhost:5173
ASSISTANT_NAME=JARVIS
APPLICATION_CONTEXT=Answer questions about Example Website.
MOCK_LLM=0
```

`MOCK_LLM=1` provides a safe local response without an LLM key. Never put `LLM_API_KEY` in the widget HTML or browser JavaScript.

## Deploy with Vercel

1. Push this repository to GitHub.
2. Import it into Vercel.
3. Add the server environment variables in Vercel project settings.
4. Deploy.
5. Use the generated `dist/widget/jarvis-widget.iife.js` URL and `/api/chat` endpoint in the host website.
6. Set `ALLOWED_ORIGINS` to the exact host origins that are allowed to call the API.

For local API testing, use a Vercel-compatible development server so `/api/chat` is available, or deploy the API separately and set `data-endpoint` to that URL.

## Security and privacy

- LLM credentials stay server-side.
- The browser uses speech recognition and sends recognized text, not microphone recordings.
- The API has bounded message history, message length limits, CORS origin checks, and a basic per-instance rate limit.
- Replace the included in-memory limit with durable tenant quotas before operating a public multi-site service.
- Register allowed origins instead of using `ALLOWED_ORIGINS=*` in production.

## Project layout

```text
src/types.ts       public types and configuration shapes
src/voice.ts       browser microphone and speech-synthesis controller
src/chat.ts        fetch + SSE client
src/navigation.ts  optional generic route intent parser
src/widget.ts      framework-free Shadow DOM custom element
src/demo.ts        local demonstration page
api/chat.js        generic OpenAI-compatible server endpoint
api/system-prompt.txt
```

## License

MIT. See `LICENSE`.
