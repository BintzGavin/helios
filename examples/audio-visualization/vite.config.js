import { defineConfig, searchForWorkspaceRoot } from 'vite';
import path from 'path';

export default defineConfig({
  server: {
    port: 5173,
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
