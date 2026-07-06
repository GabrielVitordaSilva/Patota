import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'Patota CCC',
        short_name: 'CCC',
        description: 'Sistema de gestão da Patota CCC',
        theme_color: '#10b981',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        // Cacheia comprovantes/imagens do Storage do Supabase no dispositivo:
        // abre instantaneo nas proximas visualizacoes e economiza dados moveis.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-storage',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  build: {
    // Separa as libs em chunks proprios: o navegador baixa em paralelo e,
    // principalmente, mantem react/supabase/etc em cache entre deploys
    // (so o codigo do app muda de hash a cada versao nova).
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          if (id.includes('@supabase')) return 'vendor-supabase'
          if (id.includes('lucide')) return 'vendor-icons'
          if (id.includes('date-fns')) return 'vendor-datefns'
          if (id.includes('react-router')) return 'vendor-router'
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) {
            return 'vendor-react'
          }

          return 'vendor'
        }
      }
    }
  }
})
