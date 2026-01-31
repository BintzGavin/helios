#!/usr/bin/env node
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { spawn } from 'child_process';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve path to studio package root
const studioRoot = resolve(__dirname, '..');
const distPath = resolve(studioRoot, 'dist');

// Check if dist folder exists
if (!existsSync(distPath)) {
  console.error('❌ Error: Studio has not been built yet.');
  console.error('   Please run: npm run build');
  console.error('   Or install the package which will build it automatically.');
  process.exit(1);
}

// Detect project root (current working directory)
const projectRoot = process.env.HELIOS_PROJECT_ROOT || process.cwd();

console.log('🚀 Starting Helios Studio...');
console.log(`📁 Project root: ${projectRoot}`);
console.log(`🌐 Studio UI: ${distPath}`);

// Spawn vite preview
const viteProcess = spawn('npx', ['vite', 'preview', '--host', '--open'], {
  cwd: studioRoot,
  env: {
    ...process.env,
    HELIOS_PROJECT_ROOT: projectRoot,
  },
  stdio: 'inherit',
  shell: true,
});

viteProcess.on('error', (err) => {
  console.error('❌ Failed to start studio:', err.message);
  process.exit(1);
});

viteProcess.on('close', (code) => {
  if (code !== 0 && code !== null) {
    console.log(`\n⚠️  Studio process exited with code ${code}`);
  }
  process.exit(code || 0);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down Helios Studio...');
  viteProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  viteProcess.kill('SIGTERM');
});
