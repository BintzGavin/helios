import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

// Ship the renderer and Studio inside the CLI (docs/rfcs/2026-10-24-npm-packaging.md, slices 3–4).
// Copy each package's compiled output into dist/, then point the CLI's compiled imports at the
// copy. Source and tests keep importing the workspace packages by name.
// The renderer copy is also the public API: @helios-project/cli/renderer.

const cliRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(cliRoot, 'dist');
const require = createRequire(import.meta.url);

const packages = [
  // name the CLI imports, file it resolves to, directory to copy, where it goes, what to leave out
  { name: '@helios-project/renderer', resolves: '', entry: 'index.js', to: 'renderer', skip: [] },
  { name: '@helios-project/studio/cli', resolves: '..', entry: 'cli/plugin.js', to: 'studio', skip: ['types'] },
];

const embedded = [];
for (const pkg of packages) {
  const from = path.resolve(path.dirname(require.resolve(pkg.name)), pkg.resolves);
  if (!fs.existsSync(path.join(from, pkg.entry))) {
    console.error(`${pkg.name} isn't built: ${path.join(from, pkg.entry)} is missing. Run the root build.`);
    process.exit(1);
  }
  const target = path.join(dist, pkg.to);
  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(from, target, {
    recursive: true,
    filter: src => !src.endsWith('.tsbuildinfo') && !pkg.skip.some(dir => src === path.join(from, dir)),
  });
  embedded.push({ ...pkg, target, file: path.join(target, pkg.entry) });
}

// dist/skills and dist/registry hold files written into users' projects, so they keep the package names.
const skip = new Set([...embedded.map(pkg => pkg.target), path.join(dist, 'skills'), path.join(dist, 'registry')]);
const escape = text => text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
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
    let next = text;
    for (const pkg of embedded) {
      let relative = path.relative(path.dirname(file), pkg.file).split(path.sep).join('/');
      if (!relative.startsWith('.')) relative = './' + relative;
      const specifier = new RegExp(`((?:from|import)\\s*\\(?\\s*)(['"])${escape(pkg.name)}\\2`, 'g');
      next = next.replace(specifier, (_, prefix, quote) => `${prefix}${quote}${relative}${quote}`);
    }
    if (next !== text) {
      fs.writeFileSync(file, next);
      files++;
    }
    if (/(?:from|import)\s*\(?\s*['"]@helios-project\/(renderer|studio)/.test(next)) leftovers.push(path.relative(cliRoot, file));
  }
}
walk(dist);

if (leftovers.length) {
  console.error(`Still importing an embedded package by name: ${leftovers.join(', ')}`);
  process.exit(1);
}
console.log(`Embedded ${embedded.map(pkg => `${pkg.name} in dist/${pkg.to}`).join(' and ')}; pointed ${files} files at them.`);
