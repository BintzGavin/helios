import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolving paths relative to this script file
const sourceDir = path.resolve(__dirname, '../../../.agents/skills/helios');
const destDir = path.resolve(__dirname, '../dist/skills');

console.log(`Bundling skills from ${sourceDir} to ${destDir}...`);

if (!fs.existsSync(sourceDir)) {
  console.error(`Source directory not found: ${sourceDir}`);
  process.exit(1);
}

// Clean destination
if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true, force: true });
}

// Ensure destination exists
fs.mkdirSync(destDir, { recursive: true });

// Copy recursively
fs.cpSync(sourceDir, destDir, { recursive: true });

console.log('Skills bundled successfully.');
