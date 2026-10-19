export type ChatRole = 'user' | 'assistant' | 'system'

export type ChatMessage = {
  role: ChatRole
  content: string
}

export type VoiceLanguage = {
  value: string
  label: string
}

export type NavigationRoute = {
  path: string
  label: string
  aliases?: string[]
}

export type NavigationIntent = {
  path: string
  label: string
  confidence: number
}

export type StreamChatOptions = {
  endpoint: string
  headers?: Record<string, string>
  signal?: AbortSignal
  onText?: (text: string) => void
}

export type VoiceAssistantOptions = {
  language?: string
  languages?: VoiceLanguage[]
  readAloud?: boolean
  autoSend?: boolean
  onTranscript?: (text: string, isFinal: boolean) => void
  onStateChange?: (state: VoiceState) => void
  onError?: (error: Error) => void
}

export type VoiceState = 'idle' | 'listening' | 'speaking' | 'unsupported' | 'error'
