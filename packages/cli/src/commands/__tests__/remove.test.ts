import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerRemoveCommand } from '../remove.js';
import { Command } from 'commander';
import fs from 'fs';
import prompts from 'prompts';
import * as configUtil from '../../utils/config.js';
import * as uninstallUtil from '../../utils/uninstall.js';
import { RegistryClient } from '../../registry/client.js';

vi.mock('fs');
vi.mock('prompts');
vi.mock('../../utils/config.js');
vi.mock('../../utils/uninstall.js');
vi.mock('../../registry/client.js');

describe('remove command', () => {
  let program: Command;
  let exitSpy: any;

  beforeEach(() => {
    program = new Command();
    registerRemoveCommand(program);
    vi.resetAllMocks();
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);

    vi.mocked(configUtil.loadConfig).mockReturnValue({
      framework: 'react',
      directories: { components: 'src/components' },
      components: ['test-component'],
      registry: 'http://localhost'
    } as any);

    vi.mocked(RegistryClient.prototype.findComponent).mockResolvedValue({
      name: 'test-component',
      files: [{ name: 'TestComponent.tsx' }]
    } as any);

    // Mock fs.existsSync to be false by default
    vi.mocked(fs.existsSync).mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should bypass removal with --keep-files', async () => {
    await program.parseAsync(['node', 'test', 'remove', 'test-component', '--keep-files']);
    expect(uninstallUtil.uninstallComponent).toHaveBeenCalledWith(
      expect.any(String),
      'test-component',
      expect.objectContaining({ removeFiles: false })
    );
  });

  it('should proceed without prompts if component is not in config', async () => {
    vi.mocked(configUtil.loadConfig).mockReturnValue({
      components: []
    } as any);
    await program.parseAsync(['node', 'test', 'remove', 'not-in-config']);
    expect(uninstallUtil.uninstallComponent).toHaveBeenCalledWith(
      expect.any(String),
      'not-in-config',
      expect.objectContaining({ removeFiles: true })
    );
    expect(prompts).not.toHaveBeenCalled();
  });

  it('should proceed without prompts if files do not exist', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    await program.parseAsync(['node', 'test', 'remove', 'test-component']);
    expect(uninstallUtil.uninstallComponent).toHaveBeenCalledWith(
      expect.any(String),
      'test-component',
      expect.objectContaining({ removeFiles: true })
    );
    expect(prompts).not.toHaveBeenCalled();
  });

  it('should abort removal if user cancels prompt', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(prompts).mockResolvedValue({ value: false });
    await program.parseAsync(['node', 'test', 'remove', 'test-component']);
    expect(prompts).toHaveBeenCalled();
    expect(uninstallUtil.uninstallComponent).not.toHaveBeenCalled();
  });

  it('should proceed with removal if user confirms prompt', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(prompts).mockResolvedValue({ value: true });
    await program.parseAsync(['node', 'test', 'remove', 'test-component']);
    expect(prompts).toHaveBeenCalled();
    expect(uninstallUtil.uninstallComponent).toHaveBeenCalledWith(
      expect.any(String),
      'test-component',
      expect.objectContaining({ removeFiles: true })
    );
  });

  it('should skip confirmation with --yes flag', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    await program.parseAsync(['node', 'test', 'remove', 'test-component', '--yes']);
    expect(prompts).not.toHaveBeenCalled();
    expect(uninstallUtil.uninstallComponent).toHaveBeenCalledWith(
      expect.any(String),
      'test-component',
      expect.objectContaining({ removeFiles: true })
    );
  });

  it('should handle config load failure', async () => {
    vi.mocked(configUtil.loadConfig).mockReturnValue(null as any);
    await program.parseAsync(['node', 'test', 'remove', 'test-component']);
    expect(uninstallUtil.uninstallComponent).toHaveBeenCalledWith(
      expect.any(String),
      'test-component',
      expect.objectContaining({ removeFiles: true })
    );
  });
});
