import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const MAX_MESSAGES = 20
const MAX_MESSAGE_LENGTH = 4000
const RATE_WINDOW_MS = 60_000
const RATE_LIMIT = 30
const clients = new Map()

function json(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

function allowedOrigin(origin) {
  const configured = String(process.env.ALLOWED_ORIGINS || '').split(',').map((value) => value.trim()).filter(Boolean)
  if (!origin) return configured[0] || '*'
  if (configured.includes('*')) return '*'
  return configured.includes(origin) ? origin : null
}

function sendEvent(res, event) {
  res.write(`data: ${JSON.stringify(event)}\n\n`)
}

function boundedMessages(messages) {
  if (!Array.isArray(messages)) return null
  const bounded = messages.filter((message) => message && ['user', 'assistant', 'system'].includes(message.role)).slice(-MAX_MESSAGES).map((message) => ({
    role: message.role,
    content: String(message.content || '').slice(0, MAX_MESSAGE_LENGTH),
  }))
  return bounded.length ? bounded : null
}

function clientKey(req) {
  return String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim()
}

function withinRateLimit(req) {
  const now = Date.now()
  const key = clientKey(req)
  const previous = clients.get(key)
  if (!previous || now - previous.startedAt > RATE_WINDOW_MS) {
    clients.set(key, { startedAt: now, count: 1 })
    return true
  }
  previous.count += 1
  return previous.count <= RATE_LIMIT
}

async function systemPrompt() {
  const file = fileURLToPath(new URL('./system-prompt.txt', import.meta.url))
  const base = await readFile(file, 'utf8')
  const context = String(process.env.APPLICATION_CONTEXT || '').trim()
  return context ? `${base}\nHost website context:\n${context}` : base
}

async function mockResponse(messages) {
  const last = messages.filter((message) => message.role === 'user').at(-1)?.content || 'that'
  return `I’m JARVIS. I received: “${last.slice(0, 180)}”. Connect an OpenAI-compatible provider to enable full answers.`
}

async function providerResponse(messages) {
  const base = String(process.env.LLM_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '')
  const key = process.env.LLM_API_KEY
  const model = process.env.LLM_MODEL
  if (!key || !model) throw new Error('Set LLM_API_KEY and LLM_MODEL on the server.')
  const response = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, stream: true, messages: [{ role: 'system', content: await systemPrompt() }, ...messages] }),
    signal: AbortSignal.timeout(45_000),
  })
  if (!response.ok || !response.body) throw new Error(`Provider request failed (${response.status}).`)
  return response.body
}

export default async function handler(req, res) {
  const origin = allowedOrigin(req.headers.origin)
  if (!origin) return json(res, 403, { error: 'Origin is not allowed.' })
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end() }
  if (req.method !== 'POST') return json(res, 405, { error: 'Use POST.' })
  if (!withinRateLimit(req)) return json(res, 429, { error: 'Rate limit reached. Try again shortly.' })

  let body
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body } catch { return json(res, 400, { error: 'Request body must be valid JSON.' }) }
  const messages = boundedMessages(body?.messages)
  if (!messages) return json(res, 400, { error: 'Provide a non-empty messages array.' })

  res.statusCode = 200
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')

  try {
    if (process.env.MOCK_LLM === '1') {
      const answer = await mockResponse(messages)
      for (const chunk of answer.match(/.{1,60}(?:\s|$)/g) || [answer]) sendEvent(res, { type: 'content', text: chunk })
      sendEvent(res, { type: 'done' })
      return res.end()
    }
    const stream = await providerResponse(messages)
    const reader = stream.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let finished = false
    while (!finished) {
      const part = await reader.read()
      buffer += decoder.decode(part.value || new Uint8Array(), { stream: !part.done })
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() || ''
      for (const line of lines) {
        if (!line.trim().startsWith('data:')) continue
        const payload = line.trim().slice(5).trim()
        if (payload === '[DONE]') { finished = true; break }
        try {
          const data = JSON.parse(payload)
          const text = data.choices?.[0]?.delta?.content
          if (text) sendEvent(res, { type: 'content', text })
        } catch { /* ignore provider keepalive/non-JSON lines */ }
      }
      if (part.done) finished = true
    }
    sendEvent(res, { type: 'done' })
    res.end()
  } catch (error) {
    sendEvent(res, { type: 'error', message: error instanceof Error ? error.message : 'Assistant request failed.' })
    res.end()
  }
}
