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
      // Externalize @helios-project/core as it is primarily a type dependency
      // or provided by the environment/iframe.
      // We bundle mediabunny so it works drop-in.
      external: ['@helios-project/core'],
      output: {
        globals: {
          '@helios-project/core': 'HeliosCore'
        }
      }
    },
    emptyOutDir: false, // Preserve tsc output
    outDir: 'dist'
  }
});
