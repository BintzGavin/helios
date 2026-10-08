import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// tsc compiles the registry's component modules but doesn't keep their TypeScript source, which
// is what `helios add` copies into projects: put the .ts files next to the compiled manifest
// (dist/registry/components/), where it reads them.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const source = path.resolve(__dirname, '../src/registry/components');
const dest = path.resolve(__dirname, '../dist/registry/components');

if (!fs.existsSync(source)) {
  console.error(`Registry component sources not found: ${source}`);
  process.exit(1);
}

fs.mkdirSync(dest, { recursive: true });
const files = fs.readdirSync(source).filter((file) => file.endsWith('.ts') && !file.endsWith('.d.ts'));
for (const file of files) {
  fs.copyFileSync(path.join(source, file), path.join(dest, file));
}
console.log(`Copied ${files.length} registry component sources to ${path.relative(process.cwd(), dest)}.`);
