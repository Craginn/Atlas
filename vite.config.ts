import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Vite only bundles the renderer (the React app) for Electron — see electron/main.mjs.
// In development, scripts/dev.mjs starts this dev server and opens it in an
// Electron window; `npm run build` writes dist/, which Electron serves itself.

export default defineConfig({
  plugins: [react()],
  server: {
    // Only the Electron window needs to reach the dev server.
    host: '127.0.0.1',
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
})
