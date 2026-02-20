import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import { fetchExamples, downloadExample, transformProject } from '../examples';
import { downloadTemplate } from 'giget';

// Mock giget
vi.mock('giget', () => ({
  downloadTemplate: vi.fn(),
}));

// Mock fs
vi.mock('fs');

describe('fetchExamples', () => {
  const repoPath = 'owner/repo/examples';

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('should return list of example names', async () => {
    const mockResponse = {
      ok: true,
      json: async () => [
        { name: 'example1', type: 'dir' },
        { name: 'example2', type: 'dir' },
        { name: 'file1', type: 'file' },
      ],
    };

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    const result = await fetchExamples(repoPath);
    expect(result).toEqual(['example1', 'example2']);
    expect(fetch).toHaveBeenCalledWith('https://api.github.com/repos/owner/repo/contents/examples');
  });

  it('should return empty list on fetch error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
    const result = await fetchExamples(repoPath);
    expect(result).toEqual([]);
  });

  it('should return empty list on non-ok response', async () => {
     const mockResponse = {
      ok: false,
      statusText: 'Not Found',
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));
    const result = await fetchExamples(repoPath);
    expect(result).toEqual([]);
  });
});

describe('downloadExample', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should call downloadTemplate with correct arguments', async () => {
    const name = 'example1';
    const targetDir = '/target';
    const repoBase = 'owner/repo/examples';

    await downloadExample(name, targetDir, repoBase);

    expect(downloadTemplate).toHaveBeenCalledWith('github:owner/repo/examples/example1', {
      dir: targetDir,
      force: true,
    });
  });

  it('should handle repoBase ending with slash', async () => {
    const name = 'example1';
    const targetDir = '/target';
    const repoBase = 'owner/repo/examples/';

    await downloadExample(name, targetDir, repoBase);

    expect(downloadTemplate).toHaveBeenCalledWith('github:owner/repo/examples/example1', {
      dir: targetDir,
      force: true,
    });
  });

   it('should handle github: prefix', async () => {
    const name = 'example1';
    const targetDir = '/target';
    const repoBase = 'github:owner/repo/examples';

    await downloadExample(name, targetDir, repoBase);

    expect(downloadTemplate).toHaveBeenCalledWith('github:owner/repo/examples/example1', {
      dir: targetDir,
      force: true,
    });
  });

  it('should throw error if downloadTemplate fails', async () => {
    (downloadTemplate as any).mockRejectedValue(new Error('Download failed'));

    await expect(downloadExample('example1', '/target', 'owner/repo/examples'))
      .rejects.toThrow('Failed to download example');
  });
});

describe('transformProject', () => {
  const targetDir = '/mock/target';

  beforeEach(() => {
    vi.resetAllMocks();
    (fs.existsSync as any).mockReturnValue(true);
    (fs.writeFileSync as any).mockImplementation(() => {});
  });

  it('should transform package.json dependencies', () => {
    const pkgContent = JSON.stringify({
      dependencies: {
        '@helios-project/core': 'file:../../packages/core',
        'react': '^18.0.0',
      },
    });
    (fs.readFileSync as any).mockReturnValue(pkgContent);

    transformProject(targetDir);

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join(targetDir, 'package.json'),
      expect.stringContaining('"@helios-project/core": "latest"')
    );
  });

  it('should transform vite.config.ts', () => {
    const viteContent = `
import { defineConfig, searchForWorkspaceRoot } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd())],
    },
  },
  resolve: {
    alias: {
      '@helios-project/core': resolve(__dirname, '../../packages/core'),
    },
  },
});
    `;
    (fs.readFileSync as any).mockImplementation((p: string) => {
        if (p.endsWith('package.json')) return '{}';
        if (p.endsWith('vite.config.ts')) return viteContent;
        return '';
    });

    transformProject(targetDir);

    // Verify searchForWorkspaceRoot is removed
    const call = (fs.writeFileSync as any).mock.calls.find((call: any) => call[0].endsWith('vite.config.ts'));
    const writtenContent = call[1];

    expect(writtenContent).not.toContain('searchForWorkspaceRoot');
    expect(writtenContent).not.toContain("'@helios-project/core':");
  });
});
