import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), basicSsl()],
  server: {
    host: true, // Expose to network
    proxy: {
      '/_supaproxy': {
        target: 'https://maro.revisioniai.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/_supaproxy/, ''),
      },
    }
  }
})
