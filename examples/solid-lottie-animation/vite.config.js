import { defineConfig, searchForWorkspaceRoot } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import path from 'path';

export default defineConfig({
  plugins: [solidPlugin()],
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
