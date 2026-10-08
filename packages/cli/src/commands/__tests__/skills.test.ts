import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import { registerSkillsCommand } from '../skills.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    cpSync: vi.fn(),
    rmSync: vi.fn(),
  }
}));

describe('skills command', () => {
  let program: Command;
  let exitMock: ReturnType<typeof vi.spyOn>;
  let consoleErrorMock: ReturnType<typeof vi.spyOn>;
  let consoleLogMock: ReturnType<typeof vi.spyOn>;
  let consoleWarnMock: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    program = new Command();
    registerSkillsCommand(program);
    exitMock = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogMock = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnMock = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should install skills successfully when target does not exist', async () => {
    vi.mocked(fs.existsSync).mockImplementation((path: any) => path.includes('skills')); // Mock source exists, target doesn't

    await program.parseAsync(['node', 'test', 'skills', 'install']);

    expect(fs.mkdirSync).toHaveBeenCalled();
    expect(fs.cpSync).toHaveBeenCalled();
    expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('Skills installed successfully!'));
  });

  it('copies the bundled skills into .agents/skills/helios of the current project', async () => {
    vi.mocked(fs.existsSync).mockImplementation((p: any) => !String(p).includes('.agents'));

    await program.parseAsync(['node', 'test', 'skills', 'install']);

    const [source, target] = vi.mocked(fs.cpSync).mock.lastCall!;
    expect(path.basename(String(source))).toBe('skills');
    expect(target).toBe(path.resolve(process.cwd(), '.agents/skills/helios'));
  });

  it('should overwrite target directory if it exists', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true); // Both source and target exist

    await program.parseAsync(['node', 'test', 'skills', 'install']);

    expect(consoleWarnMock).toHaveBeenCalledWith(expect.stringContaining('already exists. Overwriting...'));
    expect(fs.rmSync).toHaveBeenCalled();
    expect(fs.mkdirSync).toHaveBeenCalled();
    expect(fs.cpSync).toHaveBeenCalled();
  });

  it('should error when bundled skills directory is missing', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false); // Source missing

    await program.parseAsync(['node', 'test', 'skills', 'install']);

    expect(consoleErrorMock).toHaveBeenCalledWith(expect.stringContaining('Skills directory not found'));
    expect(exitMock).toHaveBeenCalledWith(1);
    /* fs.cpSync may be called internally */
  });

  it('should error when copying fails', async () => {
    vi.mocked(fs.existsSync).mockImplementation((path: any) => path.includes('skills')); // Source exists
    const error = new Error('Copy failed');
    vi.mocked(fs.cpSync).mockImplementation(() => { throw error; });

    await program.parseAsync(['node', 'test', 'skills', 'install']);

    expect(consoleErrorMock).toHaveBeenCalledWith(expect.stringContaining('Failed to install skills:'), error);
    expect(exitMock).toHaveBeenCalledWith(1);
  });
});

// scripts/bundle-skills.js builds dist/skills from these repo paths, and Studio's assistant
// reads core, renderer, player and studio from it. Moving them breaks both quietly.
describe('bundled skill sources', () => {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');

  it.each([
    'plugins/helios/skills/make-video/SKILL.md',
    'skills/core/SKILL.md',
    'skills/renderer/SKILL.md',
    'skills/player/SKILL.md',
    'skills/studio/SKILL.md',
    'skills/LICENSE',
  ])('%s exists', async (relativePath) => {
    const realFs = await vi.importActual<typeof import('fs')>('fs');
    expect(realFs.existsSync(path.join(repoRoot, relativePath))).toBe(true);
  });
});
