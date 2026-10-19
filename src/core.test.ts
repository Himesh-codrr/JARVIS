import { describe, expect, it } from 'vitest'
import { MAX_MESSAGE_LENGTH, normalizeMessages, parseServerEvent } from './chat'
import { parseNavigationIntent } from './navigation'

describe('chat core', () => {
  it('bounds and preserves the latest messages', () => {
    const messages = Array.from({ length: 25 }, (_, index) => ({ role: 'user' as const, content: `${index}` }))
    expect(normalizeMessages(messages)).toHaveLength(20)
    expect(normalizeMessages(messages)[0].content).toBe('5')
  })

  it('limits message content', () => {
    const result = normalizeMessages([{ role: 'user', content: 'x'.repeat(MAX_MESSAGE_LENGTH + 50) }])
    expect(result[0].content).toHaveLength(MAX_MESSAGE_LENGTH)
  })

  it('parses content, done, and invalid SSE lines', () => {
    expect(parseServerEvent('data: {"type":"content","text":"Hi"}')).toEqual({ type: 'content', text: 'Hi' })
    expect(parseServerEvent('data: {"type":"done"}')).toEqual({ type: 'done' })
    expect(parseServerEvent(': keepalive')).toBeNull()
  })
})

describe('navigation core', () => {
  const routes = [{ path: '/pricing', label: 'pricing', aliases: ['plans'] }]

  it('recognizes configured navigation commands', () => {
    expect(parseNavigationIntent('Please open the plans page', routes)).toMatchObject({ path: '/pricing', label: 'pricing' })
  })

  it('does not hijack ordinary questions', () => {
    expect(parseNavigationIntent('What pricing do you offer?', routes)).toBeNull()
  })
})
