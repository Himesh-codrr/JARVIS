import type { ChatMessage, StreamChatOptions } from './types'

export const MAX_MESSAGES = 20
export const MAX_MESSAGE_LENGTH = 4000

export function normalizeMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages
    .filter((message) => message && ['user', 'assistant', 'system'].includes(message.role))
    .slice(-MAX_MESSAGES)
    .map((message) => ({
      role: message.role,
      content: String(message.content || '').slice(0, MAX_MESSAGE_LENGTH),
    }))
}

export function parseServerEvent(line: string): { type: string; text?: string; message?: string } | null {
  const trimmed = line.trim()
  if (!trimmed.startsWith('data:')) return null
  const payload = trimmed.slice(5).trim()
  if (!payload || payload === '[DONE]') return { type: 'done' }
  try {
    const event = JSON.parse(payload)
    return typeof event === 'object' && event ? event : null
  } catch {
    return null
  }
}

export async function streamChat(messages: ChatMessage[], options: StreamChatOptions): Promise<string> {
  const response = await fetch(options.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    body: JSON.stringify({ messages: normalizeMessages(messages) }),
    signal: options.signal,
  })
  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Assistant request failed (${response.status})${detail ? `: ${detail.slice(0, 160)}` : ''}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let answer = ''
  let done = false

  while (!done) {
    const chunk = await reader.read()
    buffer += decoder.decode(chunk.value || new Uint8Array(), { stream: !chunk.done })
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() || ''
    for (const line of lines) {
      const event = parseServerEvent(line)
      if (!event) continue
      if (event.type === 'content' && event.text) {
        answer += event.text
        options.onText?.(event.text)
      }
      if (event.type === 'error') throw new Error(event.message || 'The assistant returned an error.')
      if (event.type === 'done') done = true
    }
    if (chunk.done) done = true
  }
  const finalEvent = parseServerEvent(buffer)
  if (finalEvent?.type === 'content' && finalEvent.text) {
    answer += finalEvent.text
    options.onText?.(finalEvent.text)
  }
  if (!answer.trim()) throw new Error('The assistant returned an empty response.')
  return answer
}
