import { describe, bench, vi } from 'vitest';
import { syncWorkspaceDependencies } from '../../src/governance/sync-workspace.js';
import fs from 'node:fs/promises';

describe('syncWorkspaceDependencies Benchmark', () => {
  const rootDir = '/virtual/repo';

  const mockEntries = [
    { name: 'pkg-a', isDirectory: () => true },
    { name: 'pkg-b', isDirectory: () => true },
  ];

  const mockPkgA = {
    name: '@helios-project/pkg-a',
    version: '1.2.3',
    dependencies: {
      '@helios-project/pkg-b': '^1.0.0', // Needs updating
      'external-pkg': '^2.0.0',
    },
  };

  const mockPkgB = {
    name: '@helios-project/pkg-b',
    version: '2.5.0',
    devDependencies: {
      '@helios-project/pkg-a': 'workspace:*', // Needs updating
    },
  };

  vi.spyOn(fs, 'readdir').mockResolvedValue(mockEntries as any);

  vi.spyOn(fs, 'readFile').mockImplementation((filepath: any) => {
    if (typeof filepath === 'string' && filepath.includes('pkg-a')) {
      return Promise.resolve(JSON.stringify(mockPkgA));
    }
    if (typeof filepath === 'string' && filepath.includes('pkg-b')) {
      return Promise.resolve(JSON.stringify(mockPkgB));
    }
    return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
  });

  const writeFileMock = vi.spyOn(fs, 'writeFile').mockResolvedValue(undefined);

  bench('synchronize dependencies', async () => {
    // Reset writeFile mock to prevent memory leak during bench hot loop
    writeFileMock.mockClear();
    await syncWorkspaceDependencies({ rootDir });
  });
});
