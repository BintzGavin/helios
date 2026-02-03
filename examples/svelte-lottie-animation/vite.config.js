import { defineConfig, searchForWorkspaceRoot } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
  plugins: [svelte()],
  server: {
    fs: {
      allow: [
        searchForWorkspaceRoot(process.cwd()),
      ],
    },
  },
  resolve: {
    alias: [
        { find: /^\/packages\/(.*)/, replacement: path.resolve(process.cwd(), 'packages') + '/$1' }
    ]
  }
});
