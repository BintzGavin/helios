import { defineConfig, searchForWorkspaceRoot } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      allow: [
        searchForWorkspaceRoot(path.resolve(__dirname, '../..')),
      ],
    },
  },
  resolve: {
    alias: [
      { find: 'mediabunny', replacement: path.resolve(__dirname, 'node_modules/mediabunny') },
      { find: /^\/packages\/(.*)/, replacement: path.resolve(__dirname, '../../packages') + '/$1' },
      { find: '@helios-project/core', replacement: path.resolve(__dirname, '../../packages/core/src/index.ts') }
    ]
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'composition.html'),
      },
    },
  },
});
