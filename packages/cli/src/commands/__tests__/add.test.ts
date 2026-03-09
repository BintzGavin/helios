import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerAddCommand } from '../add.js';
import { Command } from 'commander';
import * as configUtil from '../../utils/config.js';
import * as installUtil from '../../utils/install.js';
import { RegistryClient } from '../../registry/client.js';

vi.mock('../../utils/config.js');
vi.mock('../../utils/install.js');
vi.mock('../../registry/client.js');

describe('add command', () => {
  let program: Command;
  let exitSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    program = new Command();
    registerAddCommand(program);
    vi.resetAllMocks();
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.mocked(configUtil.getConfigOrThrow).mockReturnValue({
      framework: 'react',
      directories: { components: 'src/components' },
      components: [],
      registry: 'http://localhost'
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should call installComponent with correct defaults', async () => {
    await program.parseAsync(['node', 'test', 'add', 'button']);
    expect(installUtil.installComponent).toHaveBeenCalledWith(
      expect.any(String),
      'button',
      expect.objectContaining({ install: true })
    );
  });

  it('should pass --no-install flag correctly', async () => {
    await program.parseAsync(['node', 'test', 'add', 'button', '--no-install']);
    expect(installUtil.installComponent).toHaveBeenCalledWith(
      expect.any(String),
      'button',
      expect.objectContaining({ install: false })
    );
  });

  it('should handle configuration errors gracefully', async () => {
    vi.mocked(configUtil.getConfigOrThrow).mockImplementation(() => {
      throw new Error('Configuration file not found. Run "helios init" first.');
    });

    await program.parseAsync(['node', 'test', 'add', 'button']);

    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Configuration file not found'));
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(installUtil.installComponent).not.toHaveBeenCalled();
  });

  it('should handle installation errors gracefully', async () => {
    vi.mocked(installUtil.installComponent).mockRejectedValue(new Error('Component not found'));

    await program.parseAsync(['node', 'test', 'add', 'button']);

    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Component not found'));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
