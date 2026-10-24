import assert from 'node:assert/strict';
import test from 'node:test';
import { compareVersions, pinInternal, planVersions, promisedFiles, publishOrder, rewriteMatrix } from '../scripts/release.mjs';

const pkg = (short, version, extra = {}) => ({ short, manifest: { name: '@helios-project/' + short, version, ...extra } });

test('versions compare numerically, and a prerelease sorts before its release', () => {
  assert.ok(compareVersions('1.10.0', '1.9.0') > 0);
  assert.ok(compareVersions('6.0.0-rc.1', '6.0.0') < 0);
  assert.equal(compareVersions('0.47.0', '0.47.0'), 0);
});

test('publish order puts dependencies first and skips private packages', () => {
  const order = publishOrder([
    pkg('cli', '1.0.0', { dependencies: { '@helios-project/renderer': '1.0.0', '@helios-project/studio': '1.0.0' } }),
    pkg('studio', '1.0.0', { dependencies: { '@helios-project/renderer': '1.0.0' } }),
    pkg('renderer', '1.0.0', { dependencies: { '@helios-project/core': '1.0.0' } }),
    pkg('core', '1.0.0'),
    pkg('portable', '0.0.0', { private: true }),
  ]).map(p => p.short);
  assert.deepEqual(order, ['core', 'renderer', 'studio', 'cli']);
});

test('planned versions must be valid and above the current ones', () => {
  const ws = [pkg('cli', '0.46.0'), pkg('renderer', '1.79.0'), pkg('portable', '0.0.0', { private: true })];
  assert.deepEqual([...planVersions(ws, { set: 'renderer@1.80.0,@helios-project/cli@0.47.0' })], [['renderer', '1.80.0'], ['cli', '0.47.0']]);
  assert.deepEqual([...planVersions(ws, { version: '6.0.0' })], [['cli', '6.0.0'], ['renderer', '6.0.0']]);
  assert.throws(() => planVersions(ws, { set: 'cli@0.46.0' }), /not above/);
  assert.throws(() => planVersions(ws, { set: 'cli@next' }), /not a version/);
  assert.throws(() => planVersions(ws, { set: 'portable@1.0.0' }), /No public package/);
});

test('internal dependencies become exact pins; file links stay', () => {
  const ws = [
    pkg('cli', '0.47.0', { dependencies: { '@helios-project/renderer': '^1.79.0', chalk: '^5.0.0' }, devDependencies: { '@helios-project/core': 'file:../core' } }),
    pkg('renderer', '1.80.0'),
    pkg('core', '5.13.2'),
  ];
  assert.deepEqual(pinInternal(ws), ['cli dependencies: @helios-project/renderer ^1.79.0 -> 1.80.0']);
  assert.equal(ws[0].manifest.dependencies['@helios-project/renderer'], '1.80.0');
  assert.equal(ws[0].manifest.dependencies.chalk, '^5.0.0');
  assert.equal(ws[0].manifest.devDependencies['@helios-project/core'], 'file:../core');
});

test('the release matrix is rewritten in place, keeping its order', () => {
  const text = "x\nconst targets = {\n  core: '5.13.2',\n  cli: '0.46.0',\n  studio: '0.107.3',\n};\n\nconst packageNames = Object.keys(targets);\n";
  assert.equal(rewriteMatrix(text, new Map([['infrastructure', '6.0.0'], ['cli', '6.0.0'], ['core', '6.0.0']])),
    "x\nconst targets = {\n  core: '6.0.0',\n  cli: '6.0.0',\n  infrastructure: '6.0.0',\n};\n\nconst packageNames = Object.keys(targets);\n");
});

test('a package promises its bin, main, types and every concrete exports target', () => {
  assert.deepEqual(promisedFiles({
    bin: { helios: './bin/helios.js' },
    main: 'dist/index.html',
    exports: { './cli': { types: './dist/types/plugin.d.ts', default: './dist/cli/plugin.js' }, './*': './dist/*.js' },
  }), ['bin/helios.js', 'dist/cli/plugin.js', 'dist/index.html', 'dist/types/plugin.d.ts']);
});
