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
  server: {
    fs: {
      // Allow serving files from one level up to the project root (packages/studio -> packages -> root)
      allow: [path.resolve(__dirname, '../../')]
    }
  }
})
