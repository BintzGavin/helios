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
      readFileSync: vi.fn(),
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

  it('should exit when failing to download example', async () => {
    vi.mocked(examplesUtil.downloadExample).mockRejectedValue(new Error('fail'));
    vi.mocked(prompts).mockResolvedValueOnce({ framework: 'react', components: 'c', lib: 'l' });
    await program.parseAsync(['node', 'test', 'init', '--example', 'bad']);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should exit when scaffold fails', async () => {
    vi.mocked(fs.promises.writeFile).mockRejectedValue(new Error('fail'));
    await program.parseAsync(['node', 'test', 'init', '--yes']);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should prompt for config and framework if missing', async () => {
    vi.mocked(prompts)
      .mockResolvedValueOnce({ mode: 'template' })
      .mockResolvedValueOnce({ framework: 'solid' })
      .mockResolvedValueOnce({ framework: 'solid', components: 'c', lib: 'l' });
    await program.parseAsync(['node', 'test', 'init']);
    expect(fs.promises.writeFile).toHaveBeenCalled();
  });

  it('should auto-detect framework from package.json for examples', async () => {
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ dependencies: { "react": "*" } }));
    // We want the script to think package.json is NOT there initially so it enters scaffolding flow,
    // but then we want it to read package.json when auto-detecting framework.
    // However, it calls fs.readFileSync(packageJsonPath) without checking fs.existsSync.
    // The initial fs.existsSync(packageJsonPath) must be FALSE.
    let existsSyncCalls = 0;
    vi.mocked(fs.existsSync).mockImplementation((p: any) => {
      if (typeof p === 'string' && p.endsWith('package.json')) {
        existsSyncCalls++;
        return false;
      }
      return false;
    });

    vi.mocked(prompts).mockResolvedValueOnce({ mode: 'example' }).mockResolvedValueOnce({ example: 'test-example' });
    vi.mocked(examplesUtil.fetchExamples).mockResolvedValue(['test-example']);
    vi.mocked(examplesUtil.downloadExample).mockResolvedValue(undefined);
    vi.mocked(examplesUtil.transformProject).mockImplementation(() => {});

    await program.parseAsync(['node', 'test', 'init']);

    expect(configUtil.saveConfig).toHaveBeenCalledWith(
      expect.objectContaining({ framework: 'react' }),
      expect.any(String)
    );
  });

  it('should exit when saving config fails', async () => {
    vi.mocked(configUtil.saveConfig).mockImplementation(() => { throw new Error('fail'); });
    await program.parseAsync(['node', 'test', 'init', '--yes']);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should auto-detect vue framework from package.json for examples', async () => {
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ dependencies: { "vue": "*" } }));
    vi.mocked(fs.existsSync).mockImplementation((p: any) => {
      if (typeof p === 'string' && p.endsWith('package.json')) return false;
      return false;
    });

    vi.mocked(prompts).mockResolvedValueOnce({ mode: 'example' }).mockResolvedValueOnce({ example: 'test-example' });
    vi.mocked(examplesUtil.fetchExamples).mockResolvedValue(['test-example']);
    vi.mocked(examplesUtil.downloadExample).mockResolvedValue(undefined);

    await program.parseAsync(['node', 'test', 'init']);

    expect(configUtil.saveConfig).toHaveBeenCalledWith(
      expect.objectContaining({ framework: 'vue' }),
      expect.any(String)
    );
  });

  it('should auto-detect svelte framework from package.json for examples', async () => {
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ dependencies: { "svelte": "*" } }));
    vi.mocked(fs.existsSync).mockImplementation((p: any) => {
      if (typeof p === 'string' && p.endsWith('package.json')) return false;
      return false;
    });

    vi.mocked(prompts).mockResolvedValueOnce({ mode: 'example' }).mockResolvedValueOnce({ example: 'test-example' });
    vi.mocked(examplesUtil.fetchExamples).mockResolvedValue(['test-example']);
    vi.mocked(examplesUtil.downloadExample).mockResolvedValue(undefined);

    await program.parseAsync(['node', 'test', 'init']);

    expect(configUtil.saveConfig).toHaveBeenCalledWith(
      expect.objectContaining({ framework: 'svelte' }),
      expect.any(String)
    );
  });

  it('should auto-detect solid framework from package.json for examples', async () => {
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify({ dependencies: { "solid-js": "*" } }));
    vi.mocked(fs.existsSync).mockImplementation((p: any) => {
      if (typeof p === 'string' && p.endsWith('package.json')) return false;
      return false;
    });

    vi.mocked(prompts).mockResolvedValueOnce({ mode: 'example' }).mockResolvedValueOnce({ example: 'test-example' });
    vi.mocked(examplesUtil.fetchExamples).mockResolvedValue(['test-example']);
    vi.mocked(examplesUtil.downloadExample).mockResolvedValue(undefined);

    await program.parseAsync(['node', 'test', 'init']);

    expect(configUtil.saveConfig).toHaveBeenCalledWith(
      expect.objectContaining({ framework: 'solid' }),
      expect.any(String)
    );
  });

  it('should exit if target directory is not empty and user cancels without continue', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue(['some-file.txt'] as any);
    vi.mocked(prompts).mockResolvedValueOnce({}); // user hits ctrl+c

    await program.parseAsync(['node', 'test', 'init', 'my-app']);

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(fs.promises.writeFile).not.toHaveBeenCalled();
  });

  it('should exit if mode prompt cancelled', async () => {
    vi.mocked(fs.existsSync).mockImplementation((p: any) => false);
    vi.mocked(prompts).mockResolvedValueOnce({}); // user hits ctrl+c

    await program.parseAsync(['node', 'test', 'init']);

    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('should exit if framework prompt cancelled', async () => {
    vi.mocked(fs.existsSync).mockImplementation((p: any) => false);
    vi.mocked(prompts)
      .mockResolvedValueOnce({ mode: 'template' })
      .mockResolvedValueOnce({}); // user hits ctrl+c on framework

    await program.parseAsync(['node', 'test', 'init']);

    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('should exit if example select cancelled', async () => {
    vi.mocked(fs.existsSync).mockImplementation((p: any) => false);
    vi.mocked(prompts)
      .mockResolvedValueOnce({ mode: 'example' })
      .mockResolvedValueOnce({}); // user hits ctrl+c on example
    vi.mocked(examplesUtil.fetchExamples).mockResolvedValue(['test-example']);

    await program.parseAsync(['node', 'test', 'init']);

    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('should exit if config prompt cancelled', async () => {
    vi.mocked(fs.existsSync).mockImplementation((p: any) => {
      if (typeof p === 'string' && p.endsWith('package.json')) return true; // simulate existing project
      return false;
    });
    vi.mocked(prompts).mockResolvedValueOnce({}); // user hits ctrl+c on config prompt

    await program.parseAsync(['node', 'test', 'init']);

    expect(exitSpy).toHaveBeenCalledWith(0);
  });


  it('should exit when scaffold fails on writeFile error', async () => {
    vi.mocked(fs.promises.writeFile).mockRejectedValueOnce(new Error('fail writeFile'));
    vi.mocked(prompts).mockResolvedValueOnce({ mode: 'template' }).mockResolvedValueOnce({ framework: 'vue' });
    await program.parseAsync(['node', 'test', 'init']);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

});
