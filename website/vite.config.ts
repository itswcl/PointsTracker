import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: __dirname,
  base: '/PointsTracker/',
  plugins: [react()],
  publicDir: 'public',
  build: {
    outDir: '../docs',
    emptyOutDir: false,
    assetsDir: 'site-assets',
    rollupOptions: {
      input: {
        guide: resolve(__dirname, 'index.html'),
        privacy: resolve(__dirname, 'privacy.html'),
      },
      output: {
        entryFileNames: 'site-assets/[name].js',
        chunkFileNames: 'site-assets/[name].js',
        assetFileNames: 'site-assets/[name][extname]',
      },
    },
  },
});
