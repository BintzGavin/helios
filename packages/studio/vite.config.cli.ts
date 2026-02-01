import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/server/plugin.ts'),
      formats: ['es'],
      fileName: 'index'
    },
    outDir: 'dist/cli',
    ssr: true, // Target Node.js environment
    rollupOptions: {
      external: [
        'vite',
        'fs',
        'path',
        'child_process',
        'net',
        'url',
        'http',
        'os',
        'events',
        'stream',
        'util',
        '@modelcontextprotocol/sdk',
        /@modelcontextprotocol\/sdk\/.*/
      ]
    },
    // Minify false to make debugging easier if needed
    minify: false
  }
});
