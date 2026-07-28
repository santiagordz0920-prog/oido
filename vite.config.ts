import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages serves a project site from a subpath, so the deploy workflow
// sets BASE_PATH=/oido/. Local dev, preview and the browser tests all run at
// the root and are unaffected. Everything that builds a URL at runtime — the
// piano samples, the pitch worklet — goes through import.meta.env.BASE_URL,
// so nothing else needs to know about this.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
})
