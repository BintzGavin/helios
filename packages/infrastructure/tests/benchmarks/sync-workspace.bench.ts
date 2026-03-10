import { describe, bench, beforeAll, afterAll } from 'vitest';
import { syncWorkspaceDependencies } from '../../src/governance/sync-workspace.js';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

describe('syncWorkspaceDependencies Benchmark', () => {
  let rootDir: string;

  beforeAll(async () => {
    rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-workspace-bench-'));
    const packagesDir = path.join(rootDir, 'packages');
    await fs.mkdir(packagesDir);

    const pkgADir = path.join(packagesDir, 'pkg-a');
    await fs.mkdir(pkgADir);
    await fs.writeFile(
      path.join(pkgADir, 'package.json'),
      JSON.stringify({
        name: '@helios-project/pkg-a',
        version: '1.2.3',
        dependencies: {
          '@helios-project/pkg-b': '^1.0.0',
          'external-pkg': '^2.0.0',
        },
      })
    );

    const pkgBDir = path.join(packagesDir, 'pkg-b');
    await fs.mkdir(pkgBDir);
    await fs.writeFile(
      path.join(pkgBDir, 'package.json'),
      JSON.stringify({
        name: '@helios-project/pkg-b',
        version: '2.5.0',
        devDependencies: {
          '@helios-project/pkg-a': 'workspace:*',
        },
      })
    );
  });

  afterAll(async () => {
    await fs.rm(rootDir, { recursive: true, force: true });
  });

  bench('synchronize dependencies', async () => {
    await syncWorkspaceDependencies({ rootDir });
  });
});
