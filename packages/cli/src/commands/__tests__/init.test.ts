import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerInitCommand } from '../init.js';
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import prompts from 'prompts';
import * as examplesUtil from '../../utils/examples.js';
import * as configUtil from '../../utils/config.js';

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    default: {
      ...actual,
      existsSync: vi.fn(),
      mkdirSync: vi.fn(),
      readdirSync: vi.fn(),
      promises: {
        mkdir: vi.fn(),
        writeFile: vi.fn()
      }
    }
  };
});

vi.mock('prompts');
vi.mock('../../utils/examples.js');
vi.mock('../../utils/config.js');

describe('init command', () => {
  let program: Command;
  let exitSpy: any;

  beforeEach(() => {
    program = new Command();
    registerInitCommand(program);
    vi.resetAllMocks();
    exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);

    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fs.readdirSync).mockReturnValue([]);
    vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);

    vi.mocked(configUtil.saveConfig).mockImplementation(() => {});
    (configUtil.DEFAULT_CONFIG as any) = {
      framework: 'react',
      directories: { components: 'src/components', lib: 'src/lib' },
      components: []
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should scaffold default React project with --yes flag', async () => {
    await program.parseAsync(['node', 'test', 'init', '--yes']);

    expect(fs.promises.writeFile).toHaveBeenCalled();
    expect(configUtil.saveConfig).toHaveBeenCalledWith(
      expect.objectContaining({ framework: 'react' }),
      expect.any(String)
    );
  });

  it('should exit if target directory is not empty and user declines', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue(['some-file.txt'] as any);
    vi.mocked(prompts).mockResolvedValueOnce({ continue: false });

    await program.parseAsync(['node', 'test', 'init', 'my-app']);

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(fs.promises.writeFile).not.toHaveBeenCalled();
  });

  it('should proceed if target directory is not empty but user confirms', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue(['some-file.txt'] as any);

    // First prompt: continue? -> yes
    // Second prompt: mode? -> template
    // Third prompt: framework? -> vue
    vi.mocked(prompts)
      .mockResolvedValueOnce({ continue: true })
      .mockResolvedValueOnce({ mode: 'template' })
      .mockResolvedValueOnce({ framework: 'vue' })
      // Since it's not a new empty directory and doesn't have package.json, it will trigger the config prompt if it thinks we are not fully scaffolded or if config doesn't exist
      .mockResolvedValueOnce({ framework: 'vue', components: 'src/components', lib: 'src/lib' });

    // Ensure package.json does not exist to trigger scaffolding
    vi.mocked(fs.existsSync).mockImplementation((p: any) => {
      if (typeof p === 'string' && p.endsWith('package.json')) return false;
      if (typeof p === 'string' && p.endsWith('helios.config.json')) return false;
      return true; // the target directory exists
    });

    await program.parseAsync(['node', 'test', 'init', 'my-app']);

    expect(fs.promises.writeFile).toHaveBeenCalled();
    expect(configUtil.saveConfig).toHaveBeenCalledWith(
      expect.objectContaining({ framework: 'vue' }),
      expect.any(String)
    );
  });

  it('should respect --framework flag', async () => {
    // Mode prompt: template
    // Config prompt: bypassed because framework is provided
    vi.mocked(prompts).mockResolvedValueOnce({ mode: 'template' });

    await program.parseAsync(['node', 'test', 'init', '--framework', 'svelte']);

    expect(fs.promises.writeFile).toHaveBeenCalled();
    expect(configUtil.saveConfig).toHaveBeenCalledWith(
      expect.objectContaining({ framework: 'svelte' }),
      expect.any(String)
    );
  });

  it('should use example flow when --example flag is provided', async () => {
    vi.mocked(examplesUtil.downloadExample).mockResolvedValue(undefined);
    vi.mocked(examplesUtil.transformProject).mockImplementation(() => {});

    await program.parseAsync(['node', 'test', 'init', '--example', 'my-example']);

    expect(examplesUtil.downloadExample).toHaveBeenCalledWith('my-example', expect.any(String), expect.any(String));
    expect(examplesUtil.transformProject).toHaveBeenCalled();
    expect(configUtil.saveConfig).toHaveBeenCalled();
  });

  it('should handle interactive flow correctly', async () => {
    // 1. mode
    // 2. framework
    // Note: Since `isScaffolded` is true, it doesn't prompt for config, it uses default components/lib paths and framework from template
    vi.mocked(prompts)
      .mockResolvedValueOnce({ mode: 'template' })
      .mockResolvedValueOnce({ framework: 'solid' });

    await program.parseAsync(['node', 'test', 'init']);

    expect(fs.promises.writeFile).toHaveBeenCalled();
    expect(configUtil.saveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        framework: 'solid',
        directories: { components: 'src/components', lib: 'src/lib' }
      }),
      expect.any(String)
    );
  });

  it('should fallback to template if fetchExamples returns empty', async () => {
    vi.mocked(prompts)
      .mockResolvedValueOnce({ mode: 'example' }) // choose example
      .mockResolvedValueOnce({ framework: 'react' }) // fallback to template, asks framework
      .mockResolvedValueOnce({ framework: 'react', components: 'src/components', lib: 'src/lib' }); // config prompt

    vi.mocked(examplesUtil.fetchExamples).mockResolvedValue([]);

    await program.parseAsync(['node', 'test', 'init']);

    expect(examplesUtil.fetchExamples).toHaveBeenCalled();
    expect(examplesUtil.downloadExample).not.toHaveBeenCalled();
    expect(fs.promises.writeFile).toHaveBeenCalled(); // Template scaffolding happened
  });

  it('should exit if config file already exists and not scaffolded', async () => {
    // Mock package.json exists to skip scaffolding, and config exists
    vi.mocked(fs.existsSync).mockImplementation((p: any) => {
      if (typeof p === 'string' && p.endsWith('package.json')) return true;
      if (typeof p === 'string' && p.endsWith('helios.config.json')) return true;
      return false;
    });

    await program.parseAsync(['node', 'test', 'init']);

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(configUtil.saveConfig).not.toHaveBeenCalled();
  });
});
