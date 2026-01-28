import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@helios-project/core': path.resolve(__dirname, '../core/src/index.ts'),
      '@helios-project/player': path.resolve(__dirname, '../player/src/index.ts'),
      '@helios-project/renderer': path.resolve(__dirname, '../renderer/src/index.ts')
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
    css: false,
  },
});
