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
        // 1. Tell Workbox to cache these standard web files
        globPatterns: ['**/*.{js,css,html,png,jpg,json}'],
        // 2. CRITICAL FIX: Do not crash the build if a file type is missing!
        globStrict: false,
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
