import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';

export default defineConfig({
  server: {
    open: true, // Automatically open the app in the browser
  },
  resolve: {
    alias: {
      'helios-core': new URL('packages/core/src/index.ts', import.meta.url).pathname,
      'helios-core': fileURLToPath(new URL('packages/core/src/index.ts', import.meta.url)),
      'helios-player': fileURLToPath(new URL('packages/player/src/index.ts', import.meta.url)),
    }
  }
});
