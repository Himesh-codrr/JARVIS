import type { VoiceAssistantOptions, VoiceLanguage, VoiceState } from './types'

type RecognitionResult = { isFinal: boolean; [index: number]: { transcript: string } }
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> }
type RecognitionLike = {
  lang: string
  interimResults: boolean
  continuous: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onstart: (() => void) | null
  onend: (() => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onresult: ((event: RecognitionEvent) => void) | null
}
type RecognitionConstructor = new () => RecognitionLike

type SpeechWindow = Window & typeof globalThis & {
  SpeechRecognition?: RecognitionConstructor
  webkitSpeechRecognition?: RecognitionConstructor
}

export const DEFAULT_LANGUAGES: VoiceLanguage[] = [
  { value: 'en-US', label: 'English' },
  { value: 'hi-IN', label: 'Hindi' },
  { value: 'ta-IN', label: 'Tamil' },
  { value: 'te-IN', label: 'Telugu' },
  { value: 'kn-IN', label: 'Kannada' },
  { value: 'ml-IN', label: 'Malayalam' },
]

export class VoiceController {
  private recognition: RecognitionLike | null = null
  private state: VoiceState = 'idle'
  private generation = 0
  private watchdog: number | undefined
  private readonly options: Required<Pick<VoiceAssistantOptions, 'language' | 'readAloud' | 'autoSend'>> & VoiceAssistantOptions

  constructor(options: VoiceAssistantOptions = {}) {
    this.options = {
      language: options.language || 'en-US',
      readAloud: options.readAloud ?? true,
      autoSend: options.autoSend ?? false,
      ...options,
    }
    if (!this.getRecognitionConstructor()) this.setState('unsupported')
  }

  get supported() { return Boolean(this.getRecognitionConstructor()) }
  get listening() { return this.state === 'listening' }
  get readAloud() { return Boolean(this.options.readAloud) }
  set readAloud(value: boolean) { this.options.readAloud = value }
  get autoSend() { return Boolean(this.options.autoSend) }
  set autoSend(value: boolean) { this.options.autoSend = value }

  setLanguage(language: string) { this.options.language = language }

  async start() {
    if (!this.supported) {
      const error = new Error('Voice input is not supported in this browser. Try Chrome or Edge.')
      this.setState('unsupported'); this.options.onError?.(error); throw error
    }
    this.cancel()
    const Recognition = this.getRecognitionConstructor()!
    const token = ++this.generation
    const recognition = new Recognition()
    this.recognition = recognition
    recognition.lang = this.options.language
    recognition.interimResults = true
    recognition.continuous = false
    recognition.onstart = () => { if (token === this.generation) { this.setState('listening'); this.startWatchdog() } }
    recognition.onresult = (event) => {
      if (token !== this.generation) return
      let transcript = ''
      let final = false
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0]?.transcript || ''
        final ||= Boolean(event.results[i].isFinal)
      }
      this.options.onTranscript?.(transcript.trim(), final)
    }
    recognition.onerror = (event) => {
      if (token !== this.generation) return
      const ignored = event.error === 'aborted' || event.error === 'no-speech'
      if (!ignored) this.fail(new Error(`Voice input error: ${event.error || 'unknown error'}`))
    }
    recognition.onend = () => { if (token === this.generation) { this.clearWatchdog(); this.recognition = null; this.setState('idle') } }
    try { recognition.start() } catch (error) { this.fail(error instanceof Error ? error : new Error(String(error))); throw error }
  }

  stop() { this.recognition?.stop(); this.clearWatchdog() }
  cancel() { this.generation++; this.recognition?.abort(); this.recognition = null; this.clearWatchdog(); if (this.state === 'listening') this.setState('idle') }

  speak(text: string) {
    if (!this.options.readAloud || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const chunks = text.replace(/[`*_#>\[\]]/g, '').replace(/https?:\/\/\S+/g, '').match(/.{1,220}(?:\s|$)/g) || [text]
    let index = 0
    const speakNext = () => {
      if (index >= chunks.length) { this.setState('idle'); return }
      const utterance = new SpeechSynthesisUtterance(chunks[index++].trim())
      utterance.lang = this.options.language
      utterance.onstart = () => this.setState('speaking')
      utterance.onend = speakNext
      utterance.onerror = () => { this.setState('idle'); this.options.onError?.(new Error('Speech playback failed.')) }
      window.speechSynthesis.speak(utterance)
    }
    speakNext()
  }

  stopSpeaking() { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); if (this.state === 'speaking') this.setState('idle') }
  destroy() { this.cancel(); this.stopSpeaking() }

  private getRecognitionConstructor() { const w = window as SpeechWindow; return w.SpeechRecognition || w.webkitSpeechRecognition }
  private setState(state: VoiceState) { this.state = state; this.options.onStateChange?.(state) }
  private fail(error: Error) { this.clearWatchdog(); this.recognition = null; this.setState('error'); this.options.onError?.(error) }
  private startWatchdog() { this.clearWatchdog(); this.watchdog = window.setTimeout(() => this.stop(), 30_000) }
  private clearWatchdog() { if (this.watchdog !== undefined) window.clearTimeout(this.watchdog); this.watchdog = undefined }
}
