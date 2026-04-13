import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerBuildCommand } from '../build.js';
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { build } from 'vite';

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    default: {
      ...actual,
      existsSync: vi.fn(),
      writeFileSync: vi.fn(),
      renameSync: vi.fn(),
      unlinkSync: vi.fn()
    }
  };
});

vi.mock('vite', () => ({
  build: vi.fn()
}));

describe('build command', () => {
  let program: Command;
  let exitSpy: any;
  let consoleLogSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    program = new Command();
    registerBuildCommand(program);
    // Important: we need to throw an error in process.exit to stop the execution flow in the action handler
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code: number) => { throw new Error(`process.exit: ${code}`); }) as any);
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call vite.build with correct arguments when composition.html exists', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);

    await program.parseAsync(['node', 'test', 'build', '.']);

    expect(build).toHaveBeenCalled();
    const buildArgs = vi.mocked(build).mock.calls[0][0] as any;
    expect(buildArgs.build.outDir).toBe('dist');
    expect(buildArgs.build.rollupOptions.input.main).toContain('.helios-build-entry.html');
    expect(buildArgs.build.rollupOptions.input.composition).toContain('composition.html');
  });

  it('should exit with error if composition.html is missing', async () => {
    vi.mocked(fs.existsSync).mockImplementation((pathStr) => {
        if (typeof pathStr === 'string' && pathStr.includes('composition.html')) {
            return false;
        }
        return true;
    });

    vi.mocked(build).mockClear();

    await expect(program.parseAsync(['node', 'test', 'build', '.'])).rejects.toThrow('process.exit: 1');

    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('composition.html not found'));
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(build).not.toHaveBeenCalled();
  });

  it('should configure Vite build with custom --out-dir', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);

    await program.parseAsync(['node', 'test', 'build', '.', '--out-dir', 'build-out']);

    expect(build).toHaveBeenCalled();
    const buildArgs = vi.mocked(build).mock.calls[0][0] as any;
    expect(buildArgs.build.outDir).toBe('build-out');
  });
});
