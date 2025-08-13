import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    open: true, // Automatically open the app in the browser
  },
  resolve: {
    alias: {
      'helios-core': new URL('packages/core/src/index.ts', import.meta.url).pathname,
      'helios-player': new URL('packages/player/src/index.ts', import.meta.url).pathname,
    }
  }
});
