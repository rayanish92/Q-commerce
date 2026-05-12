import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: false, // We handle manifests physically in our 4 HTML files
      workbox: {
        globPatterns: ['**/*.{js,css,html}'],
        // CRITICAL FIX: Adding runtimeCaching satisfies Workbox and stops the build crash permanently
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.(png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache'
            }
          }
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        retailer: resolve(__dirname, 'retailer.html'),
        admin: resolve(__dirname, 'admin.html'),
        agent: resolve(__dirname, 'agent.html'),
      }
    }
  }
});
