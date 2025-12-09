import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // Expose to network
    allowedHosts: ['maro.revisioniai.com'],
    proxy: {
      '/_supaproxy': {
        target: 'http://127.0.0.1:54331',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/_supaproxy/, ''),
      },
    }
  }
})
