import { registerJarvisWidget } from './widget'

registerJarvisWidget()

document.head.insertAdjacentHTML('beforeend', `<style>
  :root{color-scheme:dark;font-family:Inter,system-ui,sans-serif;background:#05070e;color:#e8eef8}
  body{margin:0;min-height:100vh;background:radial-gradient(circle at 50% 20%,#172537 0,#080b16 48%,#05070e 100%)}
  main{max-width:900px;margin:0 auto;padding:18vh 7vw 24vh} .eyebrow{color:#8afff0;text-transform:uppercase;letter-spacing:.2em;font-size:12px} h1{font-size:clamp(42px,8vw,96px);line-height:.95;margin:22px 0} p{max-width:620px;color:#aab6cb;line-height:1.7}.hint{margin-top:48px;padding:18px 20px;border:1px solid #ffffff26;border-radius:16px;background:#101a3266;color:#aab6cb;font-size:14px}
</style>`)

document.querySelector('#demo')!.innerHTML = `<p class="eyebrow">Standalone web component</p><h1>Meet JARVIS.</h1><p>A voice assistant that can be embedded into any website with one custom element. It uses the browser Web Speech APIs for microphone input and spoken replies, while your configurable endpoint handles the assistant response.</p><div class="hint">Click the JARVIS button in the bottom-right corner. Voice input requires localhost or HTTPS and browser microphone permission.</div><jarvis-assistant data-site-name="this demo" data-endpoint="/api/chat"></jarvis-assistant>`
