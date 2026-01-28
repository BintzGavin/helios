import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { studioApiPlugin } from './vite-plugin-studio-api'
import path from 'path'

const projectRoot = process.env.HELIOS_PROJECT_ROOT
  ? path.resolve(process.env.HELIOS_PROJECT_ROOT)
  : path.resolve(__dirname, '../../');

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
      // Allow serving files from the project root
      allow: [projectRoot]
    }
  },
  test: {
    environment: 'jsdom',
    globals: true
  }
} as any)
