import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@helios-project/core': fileURLToPath(new URL('../../packages/core/src/index.ts', import.meta.url))
    }
  }
});
