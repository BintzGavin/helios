import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const targets = {
  core: '5.13.2',
  player: '0.78.1',
  renderer: '1.78.3',
  studio: '0.107.3',
  cli: '0.45.2',
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
