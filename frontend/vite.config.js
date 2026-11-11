import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Where "/api" is forwarded during `npm run dev` / `npm run preview`.
  const proxy = {
    '/api': { target: env.API_PROXY_TARGET || 'http://localhost:5000', changeOrigin: true },
  }
  return {
    plugins: [react(), tailwindcss()],
    server: { port: 3000, proxy },
    preview: { port: 3000, proxy },
  }
})
