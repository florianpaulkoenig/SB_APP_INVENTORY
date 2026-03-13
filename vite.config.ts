import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

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
          },
        },
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        // Use 'prompt' so the SW never silently serves stale content
        registerType: 'prompt',
        // selfDestroying cleans up any previously installed service workers
        selfDestroying: true,
        workbox: {
          // Only pre-cache static image assets, NOT JS/CSS/HTML
          // JS and HTML change on every deploy — caching them causes stale app issues
          globPatterns: ['**/*.{ico,png,svg,woff2}'],
          // Ensure navigation requests fall back to index.html (SPA routing)
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\/api\//],
        },
        manifest: {
          name: 'NOA Inventory',
          short_name: 'NOA Inv',
          description: 'Artwork inventory management for NOA Contemporary',
          theme_color: '#1a1a1a',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            { src: `${basePath}icon-192x192.png`, sizes: '192x192', type: 'image/png' },
            { src: `${basePath}icon-512x512.png`, sizes: '512x512', type: 'image/png' },
          ],
        },
      }),
    ],
  }
})
