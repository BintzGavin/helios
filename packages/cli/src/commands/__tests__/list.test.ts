import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import { registerListCommand } from '../list.js';
import { loadConfig } from '../../utils/config.js';

vi.mock('../../utils/config.js', () => ({
  loadConfig: vi.fn(),
}));

describe('registerListCommand', () => {
  let program: Command;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    program = new Command();
    program.exitOverride();
    registerListCommand(program);

    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: number) => {
      throw new Error(`process.exit called with code ${code}`);
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should exit with code 1 when no config is found', async () => {
    vi.mocked(loadConfig).mockReturnValue(null);

    const outputArgs = ['node', 'test', 'list'];
    await expect(program.parseAsync(outputArgs)).rejects.toThrow('process.exit called with code 1');

    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('No helios.config.json found'));
  });

  it('should log warning when components list is empty or undefined', async () => {
    vi.mocked(loadConfig).mockReturnValue({
      version: '1',
      directories: { components: 'components', lib: 'lib' },
      components: [],
    });

    const outputArgs = ['node', 'test', 'list'];
    await program.parseAsync(outputArgs);

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No components installed yet.'));
  });

  it('should log installed components when they exist', async () => {
    vi.mocked(loadConfig).mockReturnValue({
      version: '1',
      directories: { components: 'components', lib: 'lib' },
      components: ['button', 'card'],
    });

    const outputArgs = ['node', 'test', 'list'];
    await program.parseAsync(outputArgs);

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Installed components:'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('button'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('card'));
  });

  it('should handle runtime errors gracefully', async () => {
    vi.mocked(loadConfig).mockImplementation(() => {
      throw new Error('Runtime error reading config');
    });

    const outputArgs = ['node', 'test', 'list'];
    await expect(program.parseAsync(outputArgs)).rejects.toThrow('process.exit called with code 1');

    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Runtime error reading config'));
  });
});
