import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false, // CRITICAL: Tells Vite to back off and let our HTML handle it
      workbox: {
        // Safe glob pattern so the build doesn't crash on Render
        globPatterns: ['**/*.{js,css,html,png,svg,json}']
      }
    })
  ],
});
