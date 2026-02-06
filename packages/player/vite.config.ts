import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'HeliosPlayer',
      fileName: (format) => `helios-player.${format === 'es' ? 'bundle.mjs' : 'global.js'}`,
      formats: ['es', 'umd']
    },
    rollupOptions: {
      // We bundle everything so it works drop-in.
      // @helios-project/core is type-only so it won't add weight.
    },
    emptyOutDir: false, // Preserve tsc output
    outDir: 'dist'
  }
});
