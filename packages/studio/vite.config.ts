import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import vue from '@vitejs/plugin-vue'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { studioApiPlugin } from './vite-plugin-studio-api'
import path from 'path'

const projectRoot = process.env.HELIOS_PROJECT_ROOT
  ? path.resolve(process.env.HELIOS_PROJECT_ROOT)
  : path.resolve(__dirname, '../../');

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    vue(),
    svelte(),
    studioApiPlugin()
  ],
  resolve: {
    alias: {
      '@helios-project/core': path.resolve(__dirname, '../core/src/index.ts'),
      '@helios-project/player': path.resolve(__dirname, '../player/src/index.ts'),
      '@helios-project/renderer': path.resolve(__dirname, '../renderer/src/index.ts')
    }
  },
  server: {
    fs: {
      // Allow serving files from the repository root (simplifies dev)
      // Also allow the project root if it's different (e.g. external projects)
      allow: [projectRoot, path.resolve(__dirname, '../../')]
    }
  }
})
