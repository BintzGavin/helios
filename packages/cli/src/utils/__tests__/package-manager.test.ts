import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectPackageManager, installPackage } from '../package-manager';
import * as child_process from 'child_process';
import * as fs from 'fs';

vi.mock('child_process');
vi.mock('fs');

describe('package-manager utils', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('detectPackageManager', () => {
    it('detects yarn if yarn.lock exists', () => {
      vi.mocked(fs.existsSync).mockImplementation((path) => String(path).endsWith('yarn.lock'));
      expect(detectPackageManager('/test/dir')).toBe('yarn');
    });

    it('detects pnpm if pnpm-lock.yaml exists', () => {
      vi.mocked(fs.existsSync).mockImplementation((path) => String(path).endsWith('pnpm-lock.yaml'));
      expect(detectPackageManager('/test/dir')).toBe('pnpm');
    });

    it('detects bun if bun.lockb exists', () => {
      vi.mocked(fs.existsSync).mockImplementation((path) => String(path).endsWith('bun.lockb'));
      expect(detectPackageManager('/test/dir')).toBe('bun');
    });

    it('defaults to npm if no lockfile is found', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      expect(detectPackageManager('/test/dir')).toBe('npm');
    });
  });

  describe('installPackage', () => {
    it('installs with npm correctly', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false); // defaults to npm
      const mockSpawn = vi.fn();
      const mockProcess = {
        on: vi.fn((event, cb) => {
          if (event === 'close') cb(0);
        }),
      };
      mockSpawn.mockReturnValue(mockProcess as any);
      vi.mocked(child_process.spawn).mockImplementation(mockSpawn as any);

      await installPackage('/test/dir', ['pkg-a', 'pkg-b'], true);

      const expectedCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      expect(mockSpawn).toHaveBeenCalledWith(expectedCommand, ['install', '--save-dev', 'pkg-a', 'pkg-b'], expect.any(Object));
    });

    it('installs with yarn correctly', async () => {
      vi.mocked(fs.existsSync).mockImplementation((path) => String(path).endsWith('yarn.lock'));
      const mockSpawn = vi.fn();
      const mockProcess = {
        on: vi.fn((event, cb) => {
          if (event === 'close') cb(0);
        }),
      };
      mockSpawn.mockReturnValue(mockProcess as any);
      vi.mocked(child_process.spawn).mockImplementation(mockSpawn as any);

      await installPackage('/test/dir', ['pkg-a', 'pkg-b'], false);

      const expectedCommand = process.platform === 'win32' ? 'yarn.cmd' : 'yarn';
      expect(mockSpawn).toHaveBeenCalledWith(expectedCommand, ['add', 'pkg-a', 'pkg-b'], expect.any(Object));
    });

    it('installs with yarn as dev correctly', async () => {
      vi.mocked(fs.existsSync).mockImplementation((path) => String(path).endsWith('yarn.lock'));
      const mockSpawn = vi.fn();
      const mockProcess = {
        on: vi.fn((event, cb) => {
          if (event === 'close') cb(0);
        }),
      };
      mockSpawn.mockReturnValue(mockProcess as any);
      vi.mocked(child_process.spawn).mockImplementation(mockSpawn as any);

      await installPackage('/test/dir', ['pkg-a', 'pkg-b'], true);

      const expectedCommand = process.platform === 'win32' ? 'yarn.cmd' : 'yarn';
      expect(mockSpawn).toHaveBeenCalledWith(expectedCommand, ['add', '--dev', 'pkg-a', 'pkg-b'], expect.any(Object));
    });

    it('installs with pnpm correctly', async () => {
      vi.mocked(fs.existsSync).mockImplementation((path) => String(path).endsWith('pnpm-lock.yaml'));
      const mockSpawn = vi.fn();
      const mockProcess = {
        on: vi.fn((event, cb) => {
          if (event === 'close') cb(0);
        }),
      };
      mockSpawn.mockReturnValue(mockProcess as any);
      vi.mocked(child_process.spawn).mockImplementation(mockSpawn as any);

      await installPackage('/test/dir', ['pkg-a'], false);

      const expectedCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
      expect(mockSpawn).toHaveBeenCalledWith(expectedCommand, ['add', 'pkg-a'], expect.any(Object));
    });

    it('installs with pnpm as dev correctly', async () => {
      vi.mocked(fs.existsSync).mockImplementation((path) => String(path).endsWith('pnpm-lock.yaml'));
      const mockSpawn = vi.fn();
      const mockProcess = {
        on: vi.fn((event, cb) => {
          if (event === 'close') cb(0);
        }),
      };
      mockSpawn.mockReturnValue(mockProcess as any);
      vi.mocked(child_process.spawn).mockImplementation(mockSpawn as any);

      await installPackage('/test/dir', ['pkg-a'], true);

      const expectedCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
      expect(mockSpawn).toHaveBeenCalledWith(expectedCommand, ['add', '--save-dev', 'pkg-a'], expect.any(Object));
    });

    it('installs with bun correctly', async () => {
      vi.mocked(fs.existsSync).mockImplementation((path) => String(path).endsWith('bun.lockb'));
      const mockSpawn = vi.fn();
      const mockProcess = {
        on: vi.fn((event, cb) => {
          if (event === 'close') cb(0);
        }),
      };
      mockSpawn.mockReturnValue(mockProcess as any);
      vi.mocked(child_process.spawn).mockImplementation(mockSpawn as any);

      await installPackage('/test/dir', ['pkg-a'], false);

      const expectedCommand = process.platform === 'win32' ? 'bun.cmd' : 'bun';
      expect(mockSpawn).toHaveBeenCalledWith(expectedCommand, ['add', 'pkg-a'], expect.any(Object));
    });

    it('installs with bun as dev correctly', async () => {
      vi.mocked(fs.existsSync).mockImplementation((path) => String(path).endsWith('bun.lockb'));
      const mockSpawn = vi.fn();
      const mockProcess = {
        on: vi.fn((event, cb) => {
          if (event === 'close') cb(0);
        }),
      };
      mockSpawn.mockReturnValue(mockProcess as any);
      vi.mocked(child_process.spawn).mockImplementation(mockSpawn as any);

      await installPackage('/test/dir', ['pkg-a'], true);

      const expectedCommand = process.platform === 'win32' ? 'bun.cmd' : 'bun';
      expect(mockSpawn).toHaveBeenCalledWith(expectedCommand, ['add', '--dev', 'pkg-a'], expect.any(Object));
    });

    it('rejects if install fails', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false); // defaults to npm
      const mockSpawn = vi.fn();
      const mockProcess = {
        on: vi.fn((event, cb) => {
          if (event === 'close') cb(1);
        }),
      };
      mockSpawn.mockReturnValue(mockProcess as any);
      vi.mocked(child_process.spawn).mockImplementation(mockSpawn as any);

      await expect(installPackage('/test/dir', ['pkg-a'], false)).rejects.toThrow('Failed to install dependencies with npm');
    });
  });
});
