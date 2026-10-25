import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const targets = {
  core: '5.13.2',
  player: '0.78.1',
  renderer: '1.79.0',
  studio: '0.107.3',
  cli: '0.47.0',
  infrastructure: '0.25.0',
};

const packageNames = Object.keys(targets);

async function readJson(path) {
  return JSON.parse(await readFile(new URL('../' + path, import.meta.url), 'utf8'));
}

test('Given the approved release matrix, package manifests expose exactly those versions', async () => {
  for (const packageName of packageNames) {
    const manifest = await readJson('packages/' + packageName + '/package.json');
    assert.equal(
      manifest.version,
      targets[packageName],
      '@helios-project/' + packageName + ' must match the approved release version',
    );
  }
});

test('Given formerly public core exports, the explicit barrel preserves source compatibility', async () => {
  const indexSource = await readFile(
    new URL('../packages/core/src/index.ts', import.meta.url),
    'utf8',
  );
  const exportedNames = new Set();

  for (const match of indexSource.matchAll(/export(?:\s+type)?\s*\{([^}]+)\}/gs)) {
    for (const name of match[1].split(',')) {
      exportedNames.add(name.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[1] ?? name.trim());
    }
  }

  const compatibilityExports = [
    'DEFAULT_SPRING_CONFIG',
    'parseWebVTT',
    'stringifySrt',
    'areCuesEqual',
    'ManualTicker',
    'TickCallback',
    'DriverMetadata',
    'EasingFunction',
    'RenderSessionOptions',
    'Subscription',
    'untracked',
    'framesToTimestamp',
    'HeliosComposition',
  ];

  for (const name of compatibilityExports) {
    assert.ok(exportedNames.has(name), 'core must continue exporting ' + name);
  }
});

test('Given a first public infrastructure release, npm publishing is explicit and build-gated', async () => {
  const manifest = await readJson('packages/infrastructure/package.json');

  assert.equal(manifest.publishConfig?.access, 'public');
  assert.equal(manifest.scripts?.prepublishOnly, 'npm run build');
  assert.deepEqual(manifest.files, ['dist']);
});

test('Given public workspace packages, every package builds before npm publish', async () => {
  for (const packageName of packageNames) {
    const manifest = await readJson('packages/' + packageName + '/package.json');
    assert.equal(
      manifest.scripts?.prepublishOnly,
      'npm run build',
      '@helios-project/' + packageName + ' must build during npm publish',
    );
  }
});

test('Given workspace packages, every internal dependency pins its sibling exactly', async () => {
  const { readdir } = await import('node:fs/promises');
  const dirs = (await readdir(new URL('../packages/', import.meta.url), { withFileTypes: true }))
    .filter(entry => entry.isDirectory()).map(entry => entry.name);
  const manifests = [];
  for (const dir of dirs) {
    try { manifests.push(await readJson('packages/' + dir + '/package.json')); } catch { /* not a package */ }
  }
  const versions = new Map(manifests.map(m => [m.name, m.version]));
  for (const manifest of manifests) {
    for (const section of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
      for (const [dep, spec] of Object.entries(manifest[section] ?? {})) {
        if (!versions.has(dep) || /^(file|link|workspace):/.test(spec)) continue;
        assert.equal(spec, versions.get(dep),
          manifest.name + ' ' + section + ' must pin ' + dep + ' to ' + versions.get(dep) + ' (run scripts/release.mjs)');
      }
    }
  }
});
