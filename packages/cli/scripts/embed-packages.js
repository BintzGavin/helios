import fs from 'fs';
import path from 'path';
import { builtinModules, createRequire } from 'module';
import { fileURLToPath } from 'url';

// Ship the renderer, Studio and the portable renderer inside the CLI
// (docs/rfcs/2026-10-24-npm-packaging.md, slices 3–4). Copy each package's compiled output into
// dist/, then point the CLI's compiled imports at the copy. Source and tests keep importing the
// workspace packages by name.
// The renderer and portable copies are also public APIs: @helios-project/cli/renderer and
// @helios-project/cli/portable.

const cliRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(cliRoot, 'dist');
const require = createRequire(import.meta.url);

const packages = [
  // name the CLI imports, file it resolves to, directory to copy, where it goes, what to leave out
  // (a directory, or every file of a module: 'cli' drops cli.js, cli.d.ts and their maps)
  { name: '@helios-project/renderer', resolves: '', entry: 'index.js', to: 'renderer', skip: [] },
  { name: '@helios-project/studio/cli', resolves: '..', entry: 'cli/plugin.js', to: 'studio', skip: ['types'] },
  // Portable's HTTP service, client, S3 store, OIDC auth and bin are separate entry points that
  // render paths never load. Leaving them out keeps @aws-sdk/client-s3 and jose out of the CLI's
  // dependencies. The import check below fails the build if the copy needs a package the CLI
  // doesn't install.
  {
    name: '@helios-project/portable', resolves: '', entry: 'index.js', to: 'portable',
    skip: ['server', 'client', 's3-storage', 'auth', 'cli'], dependenciesOnly: true,
    // tsc doesn't emit portable's ambient declarations for the untyped fontkit and bidi-js; ship
    // them with the entry's types so the export type-checks with skipLibCheck off.
    ambient: '../src/vendor.d.ts',
  },
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
    filter: src => {
      if (src.endsWith('.tsbuildinfo')) return false;
      const relative = path.relative(from, src);
      return !pkg.skip.some(name => relative === name || relative.startsWith(name + '.'));
    },
  });
  if (pkg.ambient) {
    const name = path.basename(pkg.ambient);
    fs.copyFileSync(path.join(from, pkg.ambient), path.join(target, name));
    const types = path.join(target, pkg.entry.replace(/\.js$/, '.d.ts'));
    fs.writeFileSync(types, `/// <reference path="./${name}" />\n` + fs.readFileSync(types, 'utf8'));
  }
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
    if (/(?:from|import)\s*\(?\s*['"]@helios-project\/(renderer|studio|portable)/.test(next)) leftovers.push(path.relative(cliRoot, file));
  }
}
walk(dist);

if (leftovers.length) {
  console.error(`Still importing an embedded package by name: ${leftovers.join(', ')}`);
  process.exit(1);
}

// A copy marked dependenciesOnly may load only Node built-ins and the CLI's own dependencies.
const manifest = JSON.parse(fs.readFileSync(path.join(cliRoot, 'package.json'), 'utf8'));
const builtins = new Set(builtinModules);
const missing = new Set();
function checkImports(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { checkImports(file); continue; }
    if (!entry.name.endsWith('.js')) continue;
    const text = fs.readFileSync(file, 'utf8');
    const loads = /(?:\bfrom|\bimport|\brequire|\.resolve)\s*\(?\s*['"]([^'"]+)['"]/g;
    for (const [, specifier] of text.matchAll(loads)) {
      if (specifier.startsWith('.') || specifier.startsWith('node:') || builtins.has(specifier)) continue;
      const parts = specifier.split('/');
      const name = specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
      if (!manifest.dependencies?.[name]) missing.add(`${name} (${path.relative(cliRoot, file)})`);
    }
  }
}
for (const pkg of embedded) if (pkg.dependenciesOnly) checkImports(pkg.target);
if (missing.size) {
  console.error(`Embedded code loads packages the CLI doesn't depend on: ${[...missing].join(', ')}`);
  process.exit(1);
}
console.log(`Embedded ${embedded.map(pkg => `${pkg.name} in dist/${pkg.to}`).join(', ')}; pointed ${files} files at them.`);
