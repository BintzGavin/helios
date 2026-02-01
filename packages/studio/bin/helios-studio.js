#!/usr/bin/env node
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { existsSync } from 'fs';
import { createServer } from 'vite';
import { studioApiPlugin } from '../dist/cli/plugin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve path to studio package root
const studioRoot = resolve(__dirname, '..');
const distPath = resolve(studioRoot, 'dist');

// Check if dist folder exists (Studio UI)
if (!existsSync(distPath)) {
  console.error('❌ Error: Studio UI has not been built yet.');
  console.error('   Please run: npm run build');
  process.exit(1);
}

// Detect project root (current working directory)
const projectRoot = process.env.HELIOS_PROJECT_ROOT || process.cwd();

console.log('🚀 Starting Helios Studio...');
console.log(`📁 Project root: ${projectRoot}`);
console.log(`🌐 Studio UI: ${distPath}`);

(async () => {
  try {
    const server = await createServer({
      // Root at user project to enable HMR for their files
      root: projectRoot,
      server: {
        port: 5173,
        open: true,
      },
      // Use the built plugin which includes the static serving middleware
      plugins: [
        studioApiPlugin({ studioRoot: distPath })
      ],
      // Allow Vite to discover user config if it exists
      configFile: undefined,
    });

    await server.listen();

    const address = server.httpServer.address();
    const port = typeof address === 'object' && address ? address.port : 5173;

    server.printUrls();
    console.log(`\n  ➜  Studio: http://localhost:${port}/`);

  } catch (e) {
    console.error('❌ Failed to start studio server:', e);
    process.exit(1);
  }
})();
