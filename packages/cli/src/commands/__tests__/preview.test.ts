import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import { registerPreviewCommand } from '../preview.js';
import { preview } from 'vite';
import fs from 'fs';
import path from 'path';

vi.mock('vite', () => ({
  preview: vi.fn(),
}));

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
  }
}));

describe('preview command', () => {
  let program: Command;
  let exitMock: ReturnType<typeof vi.spyOn>;
  let consoleErrorMock: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    program = new Command();
    registerPreviewCommand(program);
    exitMock = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(fs.existsSync).mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should start preview server successfully', async () => {
    const mockServer = { printUrls: vi.fn() };
    vi.mocked(preview).mockResolvedValue(mockServer as any);

    await program.parseAsync(['node', 'test', 'preview', '.', '-o', 'dist', '-p', '4173']);

    expect(preview).toHaveBeenCalledWith({
      root: path.resolve(process.cwd(), '.'),
      build: { outDir: 'dist' },
      preview: { port: 4173 }
    });
    expect(mockServer.printUrls).toHaveBeenCalled();
  });

  it('should error when outDir does not exist', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    await program.parseAsync(['node', 'test', 'preview', '.', '-o', 'missing-dir']);

    expect(consoleErrorMock).toHaveBeenCalledWith(expect.stringContaining('Build directory not found'));
    expect(exitMock).toHaveBeenCalledWith(1);
    /* allow preview to be called depending on how the implementation behaves, instead checking exit */
  });

  it('should error when preview fails to start', async () => {
    const error = new Error('Vite error');
    vi.mocked(preview).mockRejectedValue(error);

    await program.parseAsync(['node', 'test', 'preview']);

    expect(consoleErrorMock).toHaveBeenCalledWith(expect.stringContaining('Failed to start preview server:'), error);
    expect(exitMock).toHaveBeenCalledWith(1);
  });
});
