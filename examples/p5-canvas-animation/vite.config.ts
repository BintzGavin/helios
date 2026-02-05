import { defineConfig, searchForWorkspaceRoot } from 'vite';
import path from 'path';

export default defineConfig({
  server: {
    port: 5178, // Using a different port (p5 usually uses something distinct)
    fs: {
      allow: [
        searchForWorkspaceRoot(process.cwd()),
      ],
    },
  },
  css: {
    postcss: {}
  },
  resolve: {
    alias: [
      { find: '@helios-project/core', replacement: path.resolve(__dirname, '../../packages/core/src/index.ts') }
    ]
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'composition.html')
      }
    }
  }
});
