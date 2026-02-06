import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@helios-project/core': path.resolve(__dirname, '../../packages/core/src/index.ts')
    }
  },
  server: {
    fs: {
       allow: ['../..']
    }
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      input: {
        composition: path.resolve(__dirname, 'composition.html')
      }
    }
  }
});
