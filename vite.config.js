import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages hosts this project below /resumebuilder/, while Vercel serves
// it from the domain root. Keeping the deployment target explicit prevents a
// Vercel build from emitting asset URLs that only exist on GitHub Pages.
const isGitHubPagesBuild = process.env.GITHUB_ACTIONS === 'true'

// https://vite.dev/config/
export default defineConfig({
  base: isGitHubPagesBuild ? '/resumebuilder/' : '/',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5193,
    strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:5194',
    },
  },
})
