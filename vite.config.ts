import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// ---------------------------------------------------------------------------
// Base path: controlled by VITE_BASE_PATH in .env
// - Custom domain (app.noacontemporary.com) or local dev: '/' (default)
// - GitHub Pages repo deploy without custom domain: '/SB_APP_INVENTORY/'
// ---------------------------------------------------------------------------

export default defineConfig(({ mode }) => {
  // loadEnv reads .env files so VITE_BASE_PATH is available in config
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const basePath = env.VITE_BASE_PATH || '/'

  return {
    base: basePath,
    build: {
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-pdf': ['@react-pdf/renderer'],
            'jszip': ['jszip'],
            'recharts': ['recharts'],
            'mapbox-gl': ['mapbox-gl'],
            'pdfjs-dist': ['pdfjs-dist'],
          },
        },
      },
    },
    plugins: [
      react(),
      tailwindcss(),
    ],
  }
})
