import { defineConfig, searchForWorkspaceRoot } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    fs: {
      allow: [
        // Allow serving files from the project root (including packages)
        path.resolve(__dirname, '../../')
      ],
    },
  },
  resolve: {
    alias: [
      {
        find: '@helios-project/core',
        replacement: path.resolve(__dirname, '../../packages/core/src/index.ts')
      }
    ]
  }
});
