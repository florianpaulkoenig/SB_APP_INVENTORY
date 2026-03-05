import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/SB_APP_INVENTORY/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-pdf': ['@react-pdf/renderer'],
          'jszip': ['jszip'],
          'recharts': ['recharts'],
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-storage-cache',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
      manifest: {
        name: 'NOA Inventory',
        short_name: 'NOA Inv',
        description: 'Artwork inventory management for NOA Contemporary',
        theme_color: '#1a1a1a',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          { src: '/SB_APP_INVENTORY/icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/SB_APP_INVENTORY/icon-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
