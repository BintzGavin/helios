import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

// Ship the renderer inside the CLI (docs/rfcs/2026-10-24-npm-packaging.md, slice 3).
// Copy the renderer's compiled output to dist/renderer, then point the CLI's compiled imports at
// that copy. Source and tests keep importing @helios-project/renderer from the workspace.
// The copy is also the public API: @helios-project/cli/renderer.

const cliRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(cliRoot, 'dist');
const target = path.join(dist, 'renderer');
const require = createRequire(import.meta.url);
const rendererDist = path.dirname(require.resolve('@helios-project/renderer'));

if (!fs.existsSync(path.join(rendererDist, 'index.js'))) {
  console.error(`Renderer isn't built: ${rendererDist}/index.js is missing. Run npm run build -w packages/renderer.`);
  process.exit(1);
}

fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(rendererDist, target, { recursive: true, filter: src => !src.endsWith('.tsbuildinfo') });

// dist/skills and dist/registry hold files written into users' projects, so they keep the package name.
const skip = new Set([target, path.join(dist, 'skills'), path.join(dist, 'registry')]);
const specifier = /((?:from|import)\s*\(?\s*)(['"])@helios-project\/renderer\2/g;
let files = 0;
const leftovers = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!skip.has(file) && entry.name !== '__tests__') walk(file);
      continue;
    }
    if (!entry.name.endsWith('.js')) continue;
    const text = fs.readFileSync(file, 'utf8');
    let relative = path.relative(path.dirname(file), path.join(target, 'index.js')).split(path.sep).join('/');
    if (!relative.startsWith('.')) relative = './' + relative;
    const next = text.replace(specifier, (_, prefix, quote) => `${prefix}${quote}${relative}${quote}`);
    if (next !== text) {
      fs.writeFileSync(file, next);
      files++;
    }
    if (/['"]@helios-project\/renderer['"]/.test(next)) leftovers.push(path.relative(cliRoot, file));
  }
}
walk(dist);

if (leftovers.length) {
  console.error(`Still importing @helios-project/renderer by name: ${leftovers.join(', ')}`);
  process.exit(1);
}
console.log(`Embedded the renderer in dist/renderer and pointed ${files} files at it.`);
