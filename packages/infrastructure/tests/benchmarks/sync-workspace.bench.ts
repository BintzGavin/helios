import { describe, bench, beforeAll, afterAll } from 'vitest';
import { syncWorkspaceDependencies } from '../../src/governance/sync-workspace.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

describe('syncWorkspaceDependencies Benchmark', () => {
  let tmpDir: string;
  let packagesDir: string;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-bench-'));
    packagesDir = path.join(tmpDir, 'packages');
    await fs.mkdir(packagesDir, { recursive: true });

    const mockPkgA = {
      name: '@helios-project/pkg-a',
      version: '1.2.3',
      dependencies: {
        '@helios-project/pkg-b': '^1.0.0',
        'external-pkg': '^2.0.0',
      },
    };

    const mockPkgB = {
      name: '@helios-project/pkg-b',
      version: '2.5.0',
      devDependencies: {
        '@helios-project/pkg-a': 'workspace:*',
      },
    };

    await fs.mkdir(path.join(packagesDir, 'pkg-a'));
    await fs.mkdir(path.join(packagesDir, 'pkg-b'));

    await fs.writeFile(path.join(packagesDir, 'pkg-a', 'package.json'), JSON.stringify(mockPkgA, null, 2), 'utf8');
    await fs.writeFile(path.join(packagesDir, 'pkg-b', 'package.json'), JSON.stringify(mockPkgB, null, 2), 'utf8');
  });

  afterAll(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  bench('synchronize dependencies', async () => {
    await syncWorkspaceDependencies({ rootDir: tmpDir });
  }, {
    setup: async () => {
      if (!packagesDir) return;
      // Re-initialize files before each benchmark run to ensure consistency
      const mockPkgA = {
        name: '@helios-project/pkg-a',
        version: '1.2.3',
        dependencies: {
          '@helios-project/pkg-b': '^1.0.0',
          'external-pkg': '^2.0.0',
        },
      };

      const mockPkgB = {
        name: '@helios-project/pkg-b',
        version: '2.5.0',
        devDependencies: {
          '@helios-project/pkg-a': 'workspace:*',
        },
      };
      await fs.writeFile(path.join(packagesDir, 'pkg-a', 'package.json'), JSON.stringify(mockPkgA, null, 2), 'utf8');
      await fs.writeFile(path.join(packagesDir, 'pkg-b', 'package.json'), JSON.stringify(mockPkgB, null, 2), 'utf8');
    }
  });
});
