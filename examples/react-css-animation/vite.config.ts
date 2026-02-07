import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    fs: {
      allow: [
        // Allow serving files from one level up to the project root
        path.resolve(__dirname, '../../')
      ],
    },
  },
  resolve: {
    alias: {
      '@helios-project/core': path.resolve(__dirname, '../../packages/core/src/index.ts')
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'composition.html')
      }
    }
  }
});
