import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  build: {
    outDir: 'dist/widget',
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'src/widget.ts'),
      name: 'JarvisVoiceAssistant',
      formats: ['iife', 'es'],
      fileName: (format) => `jarvis-widget.${format}.js`,
    },
  },
})
