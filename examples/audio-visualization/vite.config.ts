import { defineConfig, searchForWorkspaceRoot } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  server: {
    fs: {
      allow: [
        // Allow serving files from one level up to the project root
        searchForWorkspaceRoot(path.resolve(__dirname, '../..')),
      ],
    },
  },
  resolve: {
    alias: {
      '@helios-project/core': path.resolve(__dirname, '../../packages/core/src/index.ts'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'composition.html'),
      },
    },
  },
});
