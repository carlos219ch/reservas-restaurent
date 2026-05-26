import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name:             'Mesa Fácil',
        short_name:       'Mesa Fácil',
        description:      'Reservas de restaurante fáciles y rápidas',
        theme_color:      '#000000',
        background_color: '#ffffff',
        display:          'standalone',
        start_url:        '/',
        scope:            '/',
        lang:             'es',
        icons: [
          {
            src:     '/favicon.svg',
            sizes:   'any',
            type:    'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // API de Supabase: red primero, cache como fallback
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName:           'supabase-cache',
              expiration:          { maxEntries: 50, maxAgeSeconds: 60 * 60 },
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Recharts usa internamente require() — esto lo convierte correctamente para ESM
  optimizeDeps: {
    include: ['recharts'],
  },
  build: {
    commonjsOptions: {
      include: [/recharts/, /node_modules/],
    },
  },
})