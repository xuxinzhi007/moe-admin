import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// https://vite.dev/config/
const workspaceRoot = fileURLToPath(new URL('..', import.meta.url))

export default defineConfig({
  plugins: [react()],
  base: '/ops/',
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    fs: {
      allow: [workspaceRoot],
    },
    proxy: {
      // 业务 Admin：只需 RPC+API，不必起 Agent
      '/api/admin': { target: 'http://127.0.0.1:8888', changeOrigin: true },
      '/ws': { target: 'http://127.0.0.1:8888', changeOrigin: true, ws: true },
      // 云图库预览/查看：与业务 API 同源，避免走 Deploy Agent
      '/api/images': { target: 'http://127.0.0.1:8888', changeOrigin: true },
      '/api/deploy': { target: 'http://127.0.0.1:19010', changeOrigin: true },
      '/api': { target: 'http://127.0.0.1:19010', changeOrigin: true },
      '/debug': { target: 'http://127.0.0.1:19010', changeOrigin: true },
      '/tools': { target: 'http://127.0.0.1:19010', changeOrigin: true },
      '/devtools.html': { target: 'http://127.0.0.1:19010', changeOrigin: true },
      '/index.html': { target: 'http://127.0.0.1:19010', changeOrigin: true },
    },
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
})
