import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { studioApiPlugin } from './vite-plugin-studio-api'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    studioApiPlugin()
  ],
  resolve: {
    alias: {
      '@helios-project/renderer': path.resolve(__dirname, '../renderer/src/index.ts')
    }
  },
  server: {
    fs: {
      // Allow serving files from one level up to the project root (packages/studio -> packages -> root)
      allow: [path.resolve(__dirname, '../../')]
    }
  }
})
