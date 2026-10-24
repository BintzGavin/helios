#!/usr/bin/env node
// Helios release tool: the only writer of package versions, internal pins and the release matrix.
//
//   node scripts/release.mjs --set renderer@1.80.0,cli@0.47.0   set some versions, then check
//   node scripts/release.mjs --version 6.0.0                    set every public package, then check
//   node scripts/release.mjs --pin                              repair internal pins without changing versions
//   node scripts/release.mjs --check                            clean build and tarball checks only
//   node scripts/release.mjs --publish [--otp 123456]           publish what npm doesn't have yet
//
// Setting versions edits files and stops; commit them through a PR. Publish from the merged commit.
// Design: docs/rfcs/2026-10-24-npm-packaging.md

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCOPE = '@helios-project/';
const SECTIONS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];
const MATRIX_FILE = 'tests/release-contract.test.mjs';
const SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;

export function compareVersions(a, b) {
  const parse = v => {
    const [core, pre] = v.split('-');
    return { nums: core.split('.').map(Number), pre };
  };
  const x = parse(a), y = parse(b);
  for (let i = 0; i < 3; i++) if (x.nums[i] !== y.nums[i]) return x.nums[i] - y.nums[i];
  if (x.pre === y.pre) return 0;
  if (!x.pre) return 1;
  if (!y.pre) return -1;
  return x.pre < y.pre ? -1 : 1;
}

export function loadWorkspace(root) {
  const dir = path.join(root, 'packages');
  return fs.readdirSync(dir)
    .filter(name => fs.existsSync(path.join(dir, name, 'package.json')))
    .map(name => {
      const file = path.join(dir, name, 'package.json');
      const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
      return { short: name, dir: `packages/${name}`, file, manifest };
    });
}

// Public packages, dependencies first.
export function publishOrder(packages) {
  const pub = packages.filter(p => !p.manifest.private);
  const byName = new Map(pub.map(p => [p.manifest.name, p]));
  const order = [], state = new Map();
  const visit = p => {
    if (state.get(p) === 'done') return;
    if (state.get(p) === 'visiting') throw new Error(`Dependency cycle at ${p.manifest.name}`);
    state.set(p, 'visiting');
    for (const section of ['dependencies', 'peerDependencies', 'optionalDependencies'])
      for (const dep of Object.keys(p.manifest[section] || {})) if (byName.has(dep)) visit(byName.get(dep));
    state.set(p, 'done');
    order.push(p);
  };
  [...pub].sort((a, b) => a.short.localeCompare(b.short)).forEach(visit);
  return order;
}

export function planVersions(packages, { set, version }) {
  const pub = packages.filter(p => !p.manifest.private);
  const plan = new Map();
  if (version) for (const p of pub) plan.set(p.short, version);
  for (const entry of (set || '').split(',').map(s => s.trim()).filter(Boolean)) {
    const at = entry.lastIndexOf('@');
    if (at <= 0) throw new Error(`Expected name@version, got "${entry}"`);
    const name = entry.slice(0, at).replace(SCOPE, ''), v = entry.slice(at + 1);
    if (!pub.some(p => p.short === name)) throw new Error(`No public package named "${name}"`);
    plan.set(name, v);
  }
  if (!plan.size) throw new Error('Nothing to set: pass --version or --set');
  for (const [name, v] of plan) {
    if (!SEMVER.test(v)) throw new Error(`${name}: "${v}" is not a version like 1.2.3`);
    const current = pub.find(p => p.short === name).manifest.version;
    if (compareVersions(v, current) <= 0) throw new Error(`${name}: ${v} is not above the current ${current}`);
  }
  return plan;
}

// Point every internal dependency at its sibling's exact version. Returns the edits made.
export function pinInternal(packages) {
  const versions = new Map(packages.map(p => [p.manifest.name, p.manifest.version]));
  const edits = [];
  for (const p of packages) for (const section of SECTIONS) {
    const deps = p.manifest[section];
    if (!deps) continue;
    for (const [dep, spec] of Object.entries(deps)) {
      if (!versions.has(dep) || /^(file|link|workspace):/.test(spec)) continue;
      const want = versions.get(dep);
      if (spec !== want) { deps[dep] = want; edits.push(`${p.short} ${section}: ${dep} ${spec} -> ${want}`); }
    }
  }
  return edits;
}

// Rewrite the `targets` object in the release contract test to the given versions.
export function rewriteMatrix(text, versions) {
  const start = text.indexOf('const targets = {');
  const end = text.indexOf('};', start);
  if (start < 0 || end < 0) throw new Error(`${MATRIX_FILE}: no "const targets = { ... };" block`);
  // Keep the existing order so a release diff shows only the versions that changed.
  const existing = [...text.slice(start, end).matchAll(/^\s+([\w-]+):/gm)].map(m => m[1]).filter(n => versions.has(n));
  const names = [...existing, ...[...versions.keys()].filter(n => !existing.includes(n))];
  const body = names.map(name => `  ${name}: '${versions.get(name)}',`).join('\n');
  return text.slice(0, start) + `const targets = {\n${body}\n` + text.slice(end);
}

// Every file a package promises (bin, main, types, exports targets) must be in its tarball.
export function promisedFiles(manifest) {
  const out = new Set();
  const add = v => { if (typeof v === 'string' && !v.includes('*')) out.add(v.replace(/^\.\//, '')); };
  const walk = v => {
    if (typeof v === 'string') add(v);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  if (typeof manifest.bin === 'string') add(manifest.bin); else walk(manifest.bin);
  ['main', 'module', 'types', 'typings', 'browser'].forEach(k => add(manifest[k]));
  walk(manifest.exports);
  return [...out].sort();
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: opts.cwd, env: process.env });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} exited with ${r.status}`);
}

function writeJson(file, value) { fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n'); }

function cleanBuild(root, packages) {
  for (const p of packages) {
    fs.rmSync(path.join(root, p.dir, 'dist'), { recursive: true, force: true });
    // A tsbuildinfo that outlives dist makes tsc skip emitting, and the package ships without files.
    for (const f of fs.readdirSync(path.join(root, p.dir))) if (f.endsWith('.tsbuildinfo')) fs.rmSync(path.join(root, p.dir, f));
  }
  run('npm', ['run', 'build'], { cwd: root });
}

function checkTarballs(root, order) {
  const problems = [];
  for (const p of order) {
    const out = execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts', '-w', p.dir], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const files = new Set(JSON.parse(out)[0].files.map(f => f.path));
    const missing = promisedFiles(p.manifest).filter(f => !files.has(f));
    console.log(`  ${p.manifest.name}@${p.manifest.version}: ${files.size} files${missing.length ? `, MISSING ${missing.join(', ')}` : ', entry points present'}`);
    if (missing.length) problems.push(`${p.manifest.name} tarball lacks ${missing.join(', ')}`);
  }
  if (problems.length) throw new Error(problems.join('\n'));
}

function check(root) {
  const packages = loadWorkspace(root), order = publishOrder(packages);
  const stale = pinInternal(structuredClone(packages));
  if (stale.length) throw new Error(`Internal pins are out of date; run --set or --version first:\n  ${stale.join('\n  ')}`);
  console.log('Clean build');
  cleanBuild(root, packages);
  console.log('Tarball check');
  checkTarballs(root, order);
  return order;
}

function onNpm(name, version) {
  const r = spawnSync('npm', ['view', `${name}@${version}`, 'version'], { encoding: 'utf8' });
  return r.status === 0 && r.stdout.trim() === version;
}

function setVersions(root, opts) {
  const packages = loadWorkspace(root);
  const plan = planVersions(packages, opts);
  for (const p of packages) if (plan.has(p.short)) {
    console.log(`  ${p.manifest.name} ${p.manifest.version} -> ${plan.get(p.short)}`);
    p.manifest.version = plan.get(p.short);
  }
  const edits = pinInternal(packages);
  edits.forEach(e => console.log(`  pin ${e}`));
  for (const p of packages) writeJson(p.file, p.manifest);
  const matrix = new Map(publishOrder(packages).map(p => [p.short, p.manifest.version]));
  const matrixFile = path.join(root, MATRIX_FILE);
  fs.writeFileSync(matrixFile, rewriteMatrix(fs.readFileSync(matrixFile, 'utf8'), matrix));
  const unreleased = [...new Set(edits.map(e => e.split(' ')[0]))].filter(s => !plan.has(s) && !packages.find(p => p.short === s).manifest.private);
  if (unreleased.length) console.log(`  note: not releasing ${unreleased.join(', ')}, whose pins changed; the published copies keep their old ranges.`);
  run('npm', ['install', '--package-lock-only', '--no-audit', '--no-fund'], { cwd: root });
}

function publish(root, { otp, dryRun }) {
  if (execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim())
    throw new Error('The working tree has changes. Publish from a clean checkout of the merged release commit.');
  const order = check(root);
  const todo = order.filter(p => !onNpm(p.manifest.name, p.manifest.version));
  if (!todo.length) { console.log('npm already has every version in this commit.'); return; }
  console.log(`Publishing, dependencies first: ${todo.map(p => `${p.manifest.name}@${p.manifest.version}`).join(', ')}`);
  for (const p of todo) {
    run('npm', ['publish', '-w', p.dir, ...(otp ? ['--otp', otp] : []), ...(dryRun ? ['--dry-run'] : [])], { cwd: root });
    if (dryRun) continue;
    for (let i = 0; i < 30 && !onNpm(p.manifest.name, p.manifest.version); i++) spawnSync('sleep', ['2']);
    if (!onNpm(p.manifest.name, p.manifest.version)) throw new Error(`${p.manifest.name}@${p.manifest.version} isn't visible on npm yet; rerun --publish to continue.`);
  }
  console.log(dryRun ? 'Dry run finished; nothing was published.' : 'Published. Tag the commit: git tag helios-YYYY.MM.N && git push origin helios-YYYY.MM.N');
}

function parseArgs(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (['--set', '--version', '--otp'].includes(a)) opts[a.slice(2)] = argv[++i];
    else if (a === '--check') opts.check = true;
    else if (a === '--pin') opts.pin = true;
    else if (a === '--publish') opts.publish = true;
    else if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--no-check') opts.noCheck = true;
    else throw new Error(`Unknown option ${a}`);
  }
  return opts;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  try {
    const opts = parseArgs(process.argv.slice(2));
    if (opts.publish) publish(root, opts);
    else if (opts.set || opts.version) {
      console.log('Set versions');
      setVersions(root, opts);
      if (!opts.noCheck) check(root);
      console.log('Ready. Commit these files through a PR, then run --publish from the merged commit.');
    } else if (opts.pin) {
      const packages = loadWorkspace(root);
      const edits = pinInternal(packages);
      edits.forEach(e => console.log(`  pin ${e}`));
      for (const p of packages) writeJson(p.file, p.manifest);
      if (edits.length) run('npm', ['install', '--package-lock-only', '--no-audit', '--no-fund'], { cwd: root });
      console.log(edits.length ? 'Pins written.' : 'Pins already exact.');
    } else if (opts.check) check(root);
    else { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 10).join('\n').replace(/^\/\/ ?/gm, '')); }
  } catch (err) {
    console.error(`release: ${err.message}`);
    process.exit(1);
  }
}
