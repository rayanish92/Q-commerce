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
      manifest: false, 
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,json,svg,ico}'],
        // globStrict has been removed to satisfy Workbox validation
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.(png|jpg|jpeg|svg|webp)$/,
            handler: 'CacheFirst',
            options: { cacheName: 'images' }
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
