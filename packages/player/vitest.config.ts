import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  },
  resolve: {
    alias: {
      '@helios-project/core': path.resolve(__dirname, '../core/src/index.ts')
    }
  }
});
