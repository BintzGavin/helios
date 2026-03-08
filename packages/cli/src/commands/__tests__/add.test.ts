import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import { registerAddCommand } from '../add.js';
import { getConfigOrThrow } from '../../utils/config.js';
import { RegistryClient } from '../../registry/client.js';
import { installComponent } from '../../utils/install.js';

vi.mock('../../utils/config.js');
vi.mock('../../registry/client.js');
vi.mock('../../utils/install.js');

describe('add command', () => {
  let program: Command;
  const originalExit = process.exit;
  const originalError = console.error;

  beforeEach(() => {
    program = new Command();
    registerAddCommand(program);
    vi.clearAllMocks();

    // Mock exit to prevent process from actually exiting
    (process.exit as unknown as ReturnType<typeof vi.fn>) = vi.fn();
    console.error = vi.fn();
  });

  afterEach(() => {
    process.exit = originalExit;
    console.error = originalError;
  });

  it('installs a component with default options', async () => {
    vi.mocked(getConfigOrThrow).mockReturnValue({
      version: '1.0.0',
      directories: { components: 'src/components', lib: 'src/lib' },
      components: [],
    });

    await program.parseAsync(['node', 'test', 'add', 'button']);

    expect(getConfigOrThrow).toHaveBeenCalledWith(process.cwd());
    expect(RegistryClient).toHaveBeenCalled();
    expect(installComponent).toHaveBeenCalledWith(
      process.cwd(),
      'button',
      expect.objectContaining({ install: true })
    );
  });

  it('respects --no-install flag', async () => {
    vi.mocked(getConfigOrThrow).mockReturnValue({
      version: '1.0.0',
      directories: { components: 'src/components', lib: 'src/lib' },
      components: [],
    });

    await program.parseAsync(['node', 'test', 'add', 'button', '--no-install']);

    expect(installComponent).toHaveBeenCalledWith(
      process.cwd(),
      'button',
      expect.objectContaining({ install: false })
    );
  });

  it('handles errors cleanly and exits with code 1', async () => {
    const errorMsg = 'Config error';
    vi.mocked(getConfigOrThrow).mockImplementation(() => {
      throw new Error(errorMsg);
    });

    await program.parseAsync(['node', 'test', 'add', 'button']);

    expect(console.error).toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
