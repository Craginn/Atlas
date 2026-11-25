import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

// Vite only bundles the renderer (the React app) for Electron — see electron/main.mjs.
// In development, scripts/dev.mjs starts this dev server and opens it in an
// Electron window; `npm run build` writes dist/, which Electron serves itself.

export default defineConfig({
  plugins: [react()],
  // The app shows its own version and compares it with the latest GitHub release.
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
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
