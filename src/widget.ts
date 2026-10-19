import { streamChat } from './chat'
import { parseNavigationIntent } from './navigation'
import { DEFAULT_LANGUAGES, VoiceController } from './voice'
import type { ChatMessage, NavigationRoute } from './types'

export type JarvisWidgetOptions = {
  endpoint?: string
  assistantName?: string
  siteName?: string
  subtitle?: string
  placeholder?: string
  theme?: 'dark' | 'light' | 'auto'
  accent?: string
  autoOpen?: boolean
  readAloud?: boolean
  autoSend?: boolean
  language?: string
  routes?: NavigationRoute[]
  headers?: Record<string, string>
}

const defaultOptions: Required<Pick<JarvisWidgetOptions, 'endpoint' | 'assistantName' | 'siteName' | 'subtitle' | 'placeholder' | 'theme' | 'accent' | 'autoOpen' | 'readAloud' | 'autoSend' | 'language'>> = {
  endpoint: '/api/chat',
  assistantName: 'JARVIS',
  siteName: 'your website',
  subtitle: 'Voice assistant · ready',
  placeholder: 'Ask me anything…',
  theme: 'dark',
  accent: '#8AFFF0',
  autoOpen: false,
  readAloud: true,
  autoSend: false,
  language: 'en-US',
}

const css = `
:host{--jarvis-accent:#8AFFF0;--jarvis-bg:#080B16;--jarvis-panel:#101A32;--jarvis-ink:#E8EEF8;--jarvis-muted:#AAB6CB;--jarvis-line:rgba(232,238,248,.2);all:initial;position:fixed;right:24px;bottom:24px;z-index:2147483000;font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--jarvis-ink)}
:host([data-theme="light"]){--jarvis-bg:#f7fafc;--jarvis-panel:#fff;--jarvis-ink:#152238;--jarvis-muted:#63718a;--jarvis-line:rgba(21,34,56,.2)}
*{box-sizing:border-box}.jarvis-launcher{width:62px;height:62px;border:1px solid color-mix(in srgb,var(--jarvis-accent) 70%,white 30%);border-radius:50%;background:var(--jarvis-panel);color:var(--jarvis-accent);box-shadow:0 12px 38px rgba(0,0,0,.34),0 0 28px color-mix(in srgb,var(--jarvis-accent) 18%,transparent);cursor:pointer;display:grid;place-items:center;transition:transform .2s ease,box-shadow .2s ease}.jarvis-launcher:hover{transform:translateY(-3px) scale(1.04);box-shadow:0 16px 44px rgba(0,0,0,.4),0 0 38px color-mix(in srgb,var(--jarvis-accent) 28%,transparent)}.jarvis-launcher svg{width:28px;height:28px}
.jarvis-panel{display:none;width:min(390px,calc(100vw - 32px));height:min(640px,calc(100vh - 48px));overflow:hidden;border:1px solid var(--jarvis-line);border-radius:22px;background:color-mix(in srgb,var(--jarvis-panel) 94%,black 6%);box-shadow:0 24px 80px rgba(0,0,0,.48);backdrop-filter:blur(18px);flex-direction:column}.jarvis-open .jarvis-panel{display:flex}.jarvis-open .jarvis-launcher{display:none}
.jarvis-head{display:flex;align-items:center;gap:12px;padding:16px 17px;border-bottom:1px solid var(--jarvis-line)}.jarvis-orb{width:38px;height:38px;border:1px solid var(--jarvis-accent);border-radius:50%;display:grid;place-items:center;color:var(--jarvis-accent);box-shadow:0 0 22px color-mix(in srgb,var(--jarvis-accent) 28%,transparent)}.jarvis-orb svg{width:20px;height:20px}.jarvis-title{font-size:15px;font-weight:800;letter-spacing:.08em}.jarvis-subtitle{font-size:11px;color:var(--jarvis-muted);margin-top:3px}.jarvis-close{margin-left:auto;border:0;background:transparent;color:var(--jarvis-muted);font-size:24px;cursor:pointer}.jarvis-close:hover{color:var(--jarvis-ink)}
.jarvis-messages{flex:1;overflow:auto;padding:18px 14px;display:flex;flex-direction:column;gap:11px}.jarvis-message{max-width:86%;padding:11px 13px;border:1px solid var(--jarvis-line);border-radius:15px;font-size:13.5px;line-height:1.5;white-space:pre-wrap;word-break:break-word}.jarvis-message.bot{align-self:flex-start;background:color-mix(in srgb,var(--jarvis-panel) 78%,var(--jarvis-accent) 8%);border-top-left-radius:5px}.jarvis-message.user{align-self:flex-end;background:var(--jarvis-accent);color:#071217;border-color:transparent;border-top-right-radius:5px}.jarvis-message.error{border-color:#ff7655;color:#ffb9a7}.jarvis-typing{color:var(--jarvis-muted)}
.jarvis-controls{display:flex;gap:8px;padding:9px 12px 0}.jarvis-toggle{border:1px solid var(--jarvis-line);background:transparent;color:var(--jarvis-muted);border-radius:999px;padding:6px 9px;font:inherit;font-size:10px;cursor:pointer}.jarvis-toggle[aria-pressed="true"]{border-color:var(--jarvis-accent);color:var(--jarvis-accent)}
.jarvis-form{display:flex;gap:8px;padding:12px;border-top:1px solid var(--jarvis-line)}.jarvis-input{min-width:0;flex:1;min-height:44px;max-height:110px;resize:none;border:1px solid var(--jarvis-line);border-radius:13px;background:transparent;color:var(--jarvis-ink);padding:12px;font:inherit;font-size:13px;outline:none}.jarvis-input:focus{border-color:var(--jarvis-accent)}.jarvis-button{width:44px;height:44px;border:1px solid var(--jarvis-line);border-radius:13px;background:transparent;color:var(--jarvis-ink);display:grid;place-items:center;cursor:pointer}.jarvis-button:hover,.jarvis-button.active{border-color:var(--jarvis-accent);color:var(--jarvis-accent)}.jarvis-button.send{background:var(--jarvis-accent);color:#071217;border-color:transparent}.jarvis-button:disabled{opacity:.45;cursor:not-allowed}.jarvis-button svg{width:19px;height:19px}.jarvis-status{min-height:18px;padding:0 14px 9px;color:var(--jarvis-muted);font-size:10px}.jarvis-brand{padding:0 14px 12px;color:var(--jarvis-muted);font-size:10px;text-align:center}.jarvis-chip-row{display:flex;flex-wrap:wrap;gap:6px;padding:0 12px 8px}.jarvis-chip{border:1px solid var(--jarvis-line);border-radius:999px;background:transparent;color:var(--jarvis-muted);padding:6px 9px;font:inherit;font-size:10px;cursor:pointer}.jarvis-chip:hover{color:var(--jarvis-accent);border-color:var(--jarvis-accent)}
@media(max-width:520px){:host{right:16px;bottom:16px}.jarvis-panel{height:min(680px,calc(100vh - 32px))}}
`

const icon = (path: string) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`
const icons = {
  bot: icon('<circle cx="12" cy="12" r="8"/><path d="M12 4V2M8 12h.01M16 12h.01M9 16c1.7 1 4.3 1 6 0"/>'),
  mic: icon('<path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M8 22h8"/>'),
  send: icon('<path d="m3 3 18 9-18 9 3-9-3-9Z"/><path d="M6 12h15"/>'),
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char))

export class JarvisAssistantElement extends HTMLElement {
  private root!: ShadowRoot
  private options: JarvisWidgetOptions & typeof defaultOptions = { ...defaultOptions }
  private messages: ChatMessage[] = []
  private voice!: VoiceController
  private busy = false
  private input!: HTMLTextAreaElement
  private messagesEl!: HTMLElement
  private statusEl!: HTMLElement
  private sendButton!: HTMLButtonElement
  private micButton!: HTMLButtonElement

  connectedCallback() {
    if (this.root) return
    this.options = { ...defaultOptions, ...this.optionsFromAttributes() }
    this.setAttribute('data-theme', this.options.theme)
    this.style.setProperty('--jarvis-accent', this.options.accent)
    this.root = this.attachShadow({ mode: 'open' })
    this.root.innerHTML = `<style>${css}</style><button class="jarvis-launcher" aria-label="Open ${escapeHtml(this.options.assistantName)}">${icons.bot}</button><section class="jarvis-panel" role="dialog" aria-label="${escapeHtml(this.options.assistantName)} assistant"><header class="jarvis-head"><div class="jarvis-orb">${icons.bot}</div><div><div class="jarvis-title">${escapeHtml(this.options.assistantName)}</div><div class="jarvis-subtitle">${escapeHtml(this.options.subtitle)}</div></div><button class="jarvis-close" aria-label="Close">×</button></header><div class="jarvis-messages"></div><div class="jarvis-chip-row"><button class="jarvis-chip">What can you do?</button><button class="jarvis-chip">Help me navigate this site</button></div><div class="jarvis-controls"><button class="jarvis-toggle" data-setting="read" aria-pressed="${this.options.readAloud}">Read replies aloud</button><button class="jarvis-toggle" data-setting="auto" aria-pressed="${this.options.autoSend}">Send after speaking</button></div><form class="jarvis-form"><textarea class="jarvis-input" rows="1" placeholder="${escapeHtml(this.options.placeholder)}"></textarea><button type="button" class="jarvis-button mic" aria-label="Use microphone">${icons.mic}</button><button type="submit" class="jarvis-button send" aria-label="Send">${icons.send}</button></form><div class="jarvis-status" aria-live="polite"></div><div class="jarvis-brand">Powered by ${escapeHtml(this.options.assistantName)} · ${escapeHtml(this.options.siteName)}</div></section>`
    this.messagesEl = this.root.querySelector('.jarvis-messages') as HTMLElement
    this.statusEl = this.root.querySelector('.jarvis-status') as HTMLElement
    this.input = this.root.querySelector('.jarvis-input') as HTMLTextAreaElement
    this.sendButton = this.root.querySelector('.send') as HTMLButtonElement
    this.micButton = this.root.querySelector('.mic') as HTMLButtonElement
    this.voice = new VoiceController({ language: this.options.language, readAloud: this.options.readAloud, autoSend: this.options.autoSend, onTranscript: (text, final) => { this.input.value = text; this.resizeInput(); if (final && this.voice.autoSend) this.submit() }, onStateChange: (state) => this.setVoiceState(state), onError: (error) => this.showError(error.message) })
    this.bindEvents()
    if (this.options.autoOpen) this.open()
  }

  disconnectedCallback() { this.voice?.destroy() }

  configure(options: JarvisWidgetOptions) {
    this.options = { ...this.options, ...options }
    this.setAttribute('data-theme', this.options.theme)
    this.style.setProperty('--jarvis-accent', this.options.accent)
    if (this.voice) {
      this.voice.setLanguage(this.options.language)
      this.voice.readAloud = this.options.readAloud
      this.voice.autoSend = this.options.autoSend
    }
  }

  private bindEvents() {
    this.root.querySelector('.jarvis-launcher')?.addEventListener('click', () => this.open())
    this.root.querySelector('.jarvis-close')?.addEventListener('click', () => this.close())
    this.root.querySelector('.jarvis-form')?.addEventListener('submit', (event) => { event.preventDefault(); this.submit() })
    this.micButton.addEventListener('click', () => this.voice.listening ? this.voice.stop() : this.voice.start().catch(() => undefined))
    this.input.addEventListener('input', () => this.resizeInput())
    this.root.querySelector('[data-setting="read"]')?.addEventListener('click', (event) => { const button = event.currentTarget as HTMLButtonElement; this.voice.readAloud = !this.voice.readAloud; button.setAttribute('aria-pressed', String(this.voice.readAloud)) })
    this.root.querySelector('[data-setting="auto"]')?.addEventListener('click', (event) => { const button = event.currentTarget as HTMLButtonElement; this.voice.autoSend = !this.voice.autoSend; button.setAttribute('aria-pressed', String(this.voice.autoSend)) })
    this.root.querySelectorAll('.jarvis-chip').forEach((chip) => chip.addEventListener('click', () => { this.input.value = chip.textContent || ''; this.submit() }))
  }

  private open() { this.classList.add('jarvis-open'); if (!this.messages.length) this.addMessage('assistant', `Hi! I’m ${this.options.assistantName}. I can listen, answer questions, and optionally navigate ${this.options.siteName}.`); this.input.focus() }
  private close() { this.classList.remove('jarvis-open'); this.voice.cancel(); this.voice.stopSpeaking() }
  private submit() { const content = this.input.value.trim(); if (!content || this.busy) return; this.input.value = ''; this.resizeInput(); const intent = parseNavigationIntent(content, this.options.routes || []); if (intent) { this.addMessage('user', content); this.addMessage('assistant', `Opening ${intent.label}.`); this.dispatchEvent(new CustomEvent('jarvis:navigate', { bubbles: true, detail: intent })); return } this.addMessage('user', content); this.runChat() }

  private async runChat() {
    this.busy = true; this.sendButton.disabled = true; this.micButton.disabled = true; this.setStatus('Thinking…'); const placeholder = this.addMessage('assistant', '…', true); let response = ''
    try { response = await streamChat(this.messages, { endpoint: this.options.endpoint, headers: this.options.headers, onText: (text) => { response += text; placeholder.textContent = response } }); this.voice.speak(response) } catch (error) { placeholder.remove(); this.showError(error instanceof Error ? error.message : 'Unable to reach the assistant.') } finally { this.busy = false; this.sendButton.disabled = false; this.micButton.disabled = false; this.setStatus(''); if (placeholder.isConnected && response) this.messages.push({ role: 'assistant', content: response }) }
  }

  private addMessage(role: 'user' | 'assistant', content: string, temporary = false) { const message: ChatMessage = { role, content }; if (!temporary) this.messages.push(message); const node = document.createElement('div'); node.className = `jarvis-message ${role === 'user' ? 'user' : 'bot'}`; node.textContent = content; this.messagesEl.appendChild(node); this.messagesEl.scrollTop = this.messagesEl.scrollHeight; return node }
  private showError(message: string) { this.setStatus(message); const node = document.createElement('div'); node.className = 'jarvis-message error'; node.textContent = message; this.messagesEl.appendChild(node); this.messagesEl.scrollTop = this.messagesEl.scrollHeight }
  private setStatus(message: string) { this.statusEl.textContent = message }
  private setVoiceState(state: string) { this.micButton.classList.toggle('active', state === 'listening'); if (state === 'listening') this.setStatus('Listening… speak now'); else if (state === 'speaking') this.setStatus('Speaking…'); else if (state === 'unsupported') this.setStatus('Voice input is unavailable in this browser.') }
  private resizeInput() { this.input.style.height = 'auto'; this.input.style.height = `${Math.min(this.input.scrollHeight, 110)}px` }
  private optionsFromAttributes(): JarvisWidgetOptions { const bool = (name: string) => this.hasAttribute(name) && this.getAttribute(name) !== 'false'; return { endpoint: this.dataset.endpoint, assistantName: this.dataset.assistantName, siteName: this.dataset.siteName, subtitle: this.dataset.subtitle, placeholder: this.dataset.placeholder, theme: (this.dataset.theme as JarvisWidgetOptions['theme']) || undefined, accent: this.dataset.accent, autoOpen: bool('auto-open'), readAloud: this.dataset.readAloud === undefined ? undefined : bool('read-aloud'), autoSend: this.dataset.autoSend === undefined ? undefined : bool('auto-send'), language: this.dataset.language } }
}

export function registerJarvisWidget() { if (!customElements.get('jarvis-assistant')) customElements.define('jarvis-assistant', JarvisAssistantElement) }
if (typeof window !== 'undefined' && 'customElements' in window) registerJarvisWidget()
