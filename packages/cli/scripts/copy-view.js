import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// tsc doesn't copy .html: put the MCP App view next to the compiled server (dist/mcp/view/).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const source = path.resolve(__dirname, '../src/mcp/view/player.html');
const dest = path.resolve(__dirname, '../dist/mcp/view/player.html');

if (!fs.existsSync(source)) {
  console.error(`MCP view not found: ${source}`);
  process.exit(1);
}

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(source, dest);
console.log(`Copied MCP view to ${path.relative(process.cwd(), dest)}.`);
