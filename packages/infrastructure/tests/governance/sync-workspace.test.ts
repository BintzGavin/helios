import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncWorkspaceDependencies } from '../../src/governance/sync-workspace.js';
import fs from 'node:fs/promises';
import path from 'node:path';

// Mock fs/promises
vi.mock('node:fs/promises', () => {
  return {
    default: {
      readdir: vi.fn(),
      readFile: vi.fn(),
      writeFile: vi.fn(),
    },
  };
});

describe('syncWorkspaceDependencies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should synchronize versions correctly based on package.json files found in rootDir/packages', async () => {
    const rootDir = '/virtual/repo';

    const mockEntries = [
      { name: 'pkg-a', isDirectory: () => true },
      { name: 'pkg-b', isDirectory: () => true },
      { name: 'not-a-dir', isDirectory: () => false },
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

    // Setup mocks
    (fs.readdir as any).mockResolvedValue(mockEntries);

    (fs.readFile as any).mockImplementation((filepath: string) => {
      if (filepath.includes('pkg-a')) {
        return Promise.resolve(JSON.stringify(mockPkgA));
      }
      if (filepath.includes('pkg-b')) {
        return Promise.resolve(JSON.stringify(mockPkgB));
      }
      return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    });

    await syncWorkspaceDependencies({ rootDir });

    expect(fs.readdir).toHaveBeenCalledWith(path.join(rootDir, 'packages'), { withFileTypes: true });

    expect(fs.writeFile).toHaveBeenCalledTimes(2);

    // Verify pkg-a write
    const writeA = (fs.writeFile as any).mock.calls.find((call: any[]) => call[0].includes('pkg-a'));
    expect(writeA).toBeDefined();
    const updatedPkgA = JSON.parse(writeA[1]);
    expect(updatedPkgA.dependencies['@helios-project/pkg-b']).toBe('^2.5.0');
    expect(updatedPkgA.dependencies['external-pkg']).toBe('^2.0.0');

    // Verify pkg-b write
    const writeB = (fs.writeFile as any).mock.calls.find((call: any[]) => call[0].includes('pkg-b'));
    expect(writeB).toBeDefined();
    const updatedPkgB = JSON.parse(writeB[1]);
    expect(updatedPkgB.devDependencies['@helios-project/pkg-a']).toBe('^1.2.3');
  });

  it('should do nothing if packages directory does not exist', async () => {
    const rootDir = '/empty/repo';

    (fs.readdir as any).mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

    await syncWorkspaceDependencies({ rootDir });

    expect(fs.readdir).toHaveBeenCalled();
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('should throw an error if readdir throws a non-ENOENT error', async () => {
    const rootDir = '/error/repo';

    const error = new Error('EACCES');
    (error as any).code = 'EACCES';
    (fs.readdir as any).mockRejectedValue(error);

    await expect(syncWorkspaceDependencies({ rootDir })).rejects.toThrow('EACCES');
  });

  it('should throw an error if readFile throws a non-ENOENT error', async () => {
    const rootDir = '/virtual/repo';

    const mockEntries = [
      { name: 'pkg-a', isDirectory: () => true },
    ];

    (fs.readdir as any).mockResolvedValue(mockEntries);

    const error = new Error('EACCES');
    (error as any).code = 'EACCES';
    (fs.readFile as any).mockRejectedValue(error);

    await expect(syncWorkspaceDependencies({ rootDir })).rejects.toThrow('EACCES');
  });

  it('should not process a package.json missing name or version', async () => {
    const rootDir = '/virtual/repo';

    const mockEntries = [
      { name: 'pkg-a', isDirectory: () => true },
    ];

    const mockPkgA = {
      // missing name and version
      dependencies: {
        'external-pkg': '^2.0.0',
      },
    };

    (fs.readdir as any).mockResolvedValue(mockEntries);

    (fs.readFile as any).mockImplementation((filepath: string) => {
      if (filepath.includes('pkg-a')) {
        return Promise.resolve(JSON.stringify(mockPkgA));
      }
      return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    });

    await syncWorkspaceDependencies({ rootDir });

    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('should not write file if dependencies are already matched', async () => {
    const rootDir = '/virtual/repo';

    const mockEntries = [
      { name: 'pkg-a', isDirectory: () => true },
      { name: 'pkg-b', isDirectory: () => true },
    ];

    const mockPkgA = {
      name: '@helios-project/pkg-a',
      version: '1.2.3',
      dependencies: {
        '@helios-project/pkg-b': '^2.5.0', // Already matching
      },
    };

    const mockPkgB = {
      name: '@helios-project/pkg-b',
      version: '2.5.0',
    };

    (fs.readdir as any).mockResolvedValue(mockEntries);

    (fs.readFile as any).mockImplementation((filepath: string) => {
      if (filepath.includes('pkg-a')) {
        return Promise.resolve(JSON.stringify(mockPkgA));
      }
      if (filepath.includes('pkg-b')) {
        return Promise.resolve(JSON.stringify(mockPkgB));
      }
      return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    });

    await syncWorkspaceDependencies({ rootDir });

    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('should throw an error if JSON.parse throws a non-ENOENT error inside the discovery loop', async () => {
    const rootDir = '/virtual/repo';

    const mockEntries = [
      { name: 'pkg-a', isDirectory: () => true },
    ];

    (fs.readdir as any).mockResolvedValue(mockEntries);

    (fs.readFile as any).mockImplementation((filepath: string) => {
      if (filepath.includes('pkg-a')) {
        return Promise.resolve('{ invalid json');
      }
      return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    });

    await expect(syncWorkspaceDependencies({ rootDir })).rejects.toThrow();
  });

  it('should ignore ENOENT error inside the discovery loop', async () => {
    const rootDir = '/virtual/repo';

    const mockEntries = [
      { name: 'pkg-a', isDirectory: () => true }, // Missing package.json
      { name: 'pkg-b', isDirectory: () => true }, // Has package.json
    ];

    const mockPkgB = {
      name: '@helios-project/pkg-b',
      version: '2.5.0',
    };

    (fs.readdir as any).mockResolvedValue(mockEntries);

    (fs.readFile as any).mockImplementation((filepath: string) => {
      if (filepath.includes('pkg-b')) {
        return Promise.resolve(JSON.stringify(mockPkgB));
      }
      return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    });

    await syncWorkspaceDependencies({ rootDir });

    // Ensure it continued to process pkg-b despite pkg-a throwing ENOENT
    expect(fs.writeFile).not.toHaveBeenCalled(); // nothing to update, but no error thrown
  });

  it('should throw an error if readFile throws a non-ENOENT error inside the discovery loop', async () => {
    const rootDir = '/virtual/repo';

    const mockEntries = [
      { name: 'pkg-a', isDirectory: () => true },
    ];

    (fs.readdir as any).mockResolvedValue(mockEntries);

    (fs.readFile as any).mockImplementation((filepath: string) => {
      if (filepath.includes('pkg-a')) {
        const error = new Error('EPERM');
        (error as any).code = 'EPERM';
        return Promise.reject(error);
      }
      return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    });

    await expect(syncWorkspaceDependencies({ rootDir })).rejects.toThrow('EPERM');
  });
});
