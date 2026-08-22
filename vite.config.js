import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/resumebuilder/',
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
