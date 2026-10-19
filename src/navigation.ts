import type { NavigationIntent, NavigationRoute } from './types'

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9/ ]/g, ' ').replace(/\s+/g, ' ').trim()

export function parseNavigationIntent(input: string, routes: NavigationRoute[]): NavigationIntent | null {
  const text = normalize(input)
  if (!text || !routes.length) return null
  for (const route of routes) {
    const terms = [route.label, ...(route.aliases || []), route.path]
      .map(normalize)
      .filter(Boolean)
      .sort((a, b) => b.length - a.length)
    const matched = terms.some((term) => text.includes(term))
    const navigational = /\b(go|open|show|take|navigate|visit|see)\b/.test(text)
    if (matched && navigational) return { path: route.path, label: route.label, confidence: 1 }
  }
  return null
}
