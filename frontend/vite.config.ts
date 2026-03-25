import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': 'http://localhost:5467',
      '/feed.xml': 'http://localhost:5467',
      '/sitemap.xml': 'http://localhost:5467',
      '/healthz': 'http://localhost:5467',
    },
  },
})
