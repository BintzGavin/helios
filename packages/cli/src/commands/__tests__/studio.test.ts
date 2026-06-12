import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import { registerStudioCommand } from '../studio.js';
import { createServer } from 'vite';
import fs from 'fs';
import { loadConfig } from '../../utils/config.js';
import { RegistryClient } from '../../registry/client.js';

vi.mock('vite', () => ({
  createServer: vi.fn(),
}));

vi.mock('@helios-project/studio/cli', () => ({
  studioApiPlugin: vi.fn().mockReturnValue({ name: 'mock-studio-plugin' }),
}));

vi.mock('../../utils/config.js', () => ({
  loadConfig: vi.fn(),
}));

vi.mock('../../utils/install.js', () => ({ installComponent: vi.fn() }));
vi.mock('../../utils/uninstall.js', () => ({ uninstallComponent: vi.fn() }));

vi.mock('../../registry/client.js', () => {
  return {
    RegistryClient: vi.fn().mockImplementation(function() {
      return {
        getComponents: vi.fn().mockResolvedValue([{ name: 'test-comp', files: [{name: 'f.ts'}] }]),
      };
    })
  };
});

vi.mock('module', async (importOriginal) => {
    const actual = await importOriginal<typeof import('module')>();
    return {
        ...actual,
        createRequire: vi.fn().mockReturnValue({
            resolve: vi.fn().mockReturnValue('/mock/path/to/studio/cli.js')
        })
    };
});

vi.mock('fs', () => ({
    default: {
        existsSync: vi.fn().mockReturnValue(true)
    }
}));


describe('studio command', () => {
  let program: Command;
  let exitMock: ReturnType<typeof vi.spyOn>;
  let consoleErrorMock: ReturnType<typeof vi.spyOn>;
  let consoleLogMock: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    program = new Command();
    registerStudioCommand(program);
    exitMock = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogMock = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should start studio server successfully', async () => {
    const mockServer = { listen: vi.fn(), printUrls: vi.fn() };
    vi.mocked(createServer).mockResolvedValue(mockServer as any);
    vi.mocked(loadConfig).mockReturnValue({ registry: 'test-reg', framework: 'react' } as any);

    await program.parseAsync(['node', 'test', 'studio', '-p', '5173']);

    expect(loadConfig).toHaveBeenCalled();
    expect(RegistryClient).toHaveBeenCalledWith('test-reg');
    expect(createServer).toHaveBeenCalled();
    expect(mockServer.listen).toHaveBeenCalled();
    expect(mockServer.printUrls).toHaveBeenCalled();
  });

  it('should handle missing config gracefully', async () => {
    const mockServer = { listen: vi.fn(), printUrls: vi.fn() };
    vi.mocked(createServer).mockResolvedValue(mockServer as any);
    vi.mocked(loadConfig).mockReturnValue(null as any);

    await program.parseAsync(['node', 'test', 'studio']);

    expect(loadConfig).toHaveBeenCalled();
    expect(RegistryClient).toHaveBeenCalledWith(undefined);
    expect(createServer).toHaveBeenCalled();
  });

  it('should error when server fails to start', async () => {
    const error = new Error('Server error');
    vi.mocked(createServer).mockRejectedValue(error);
    vi.mocked(loadConfig).mockReturnValue(null as any);

    await program.parseAsync(['node', 'test', 'studio']);

    expect(consoleErrorMock).toHaveBeenCalledWith('Failed to start Studio:', error);
    expect(exitMock).toHaveBeenCalledWith(1);
  });

  it('should handle plugin callbacks', async () => {
    const mockServer = { listen: vi.fn(), printUrls: vi.fn() };
    vi.mocked(createServer).mockResolvedValue(mockServer as any);

    vi.mocked(loadConfig).mockReturnValue({
      directories: { components: 'src/components' },
      components: [{ name: 'test-comp', path: 'src/components/test-comp.tsx' }]
    } as any);

    let pluginConfig: any;
    const { studioApiPlugin } = await import('@helios-project/studio/cli');
    (vi.mocked(studioApiPlugin) as any).mockImplementation((config: any) => {
        pluginConfig = config;
        return { name: 'mock-plugin' };
    });

    await program.parseAsync(['node', 'test', 'studio']);

    expect(pluginConfig).toBeDefined();

    const { installComponent } = await import('../../utils/install.js');
    const installMock = vi.mocked(installComponent).mockResolvedValue(undefined);
    const { uninstallComponent } = await import('../../utils/uninstall.js');
    const uninstallMock = vi.mocked(uninstallComponent).mockResolvedValue(undefined);

    await pluginConfig.onInstallComponent('test');
    expect(installMock).toHaveBeenCalledWith(process.cwd(), 'test', { install: true, client: expect.any(Object) });

    await pluginConfig.onRemoveComponent('test');
    expect(uninstallMock).toHaveBeenCalledWith(process.cwd(), 'test', { removeFiles: true, client: expect.any(Object) });

    await pluginConfig.onUpdateComponent('test');
    expect(installMock).toHaveBeenCalledWith(process.cwd(), 'test', { install: true, overwrite: true, client: expect.any(Object) });

    vi.mocked(fs.existsSync).mockReturnValue(true);
    const isInstalled = await pluginConfig.onCheckInstalled('test-comp');
    expect(isInstalled).toBe(true);

    const isNotInstalled = await pluginConfig.onCheckInstalled('unknown-comp');
    expect(isNotInstalled).toBe(false);
  });

  it('should return false from onCheckInstalled when component is missing', async () => {
    const mockServer = { listen: vi.fn(), printUrls: vi.fn() };
    vi.mocked(createServer).mockResolvedValue(mockServer as any);
    vi.mocked(loadConfig).mockReturnValue({
      directories: { components: 'src/components' },
      components: []
    } as any);

    let pluginConfig: any;
    const { studioApiPlugin } = await import('@helios-project/studio/cli');
    (vi.mocked(studioApiPlugin) as any).mockImplementation((config: any) => {
        pluginConfig = config;
        return { name: 'mock-plugin' };
    });

    await program.parseAsync(['node', 'test', 'studio']);

    const isInstalled = await pluginConfig.onCheckInstalled('missing-comp');
    expect(isInstalled).toBe(false);
  });


  it('should skip printing skillsRoot if it does not exist', async () => {
    const mockServer = { listen: vi.fn(), printUrls: vi.fn() };
    vi.mocked(createServer).mockResolvedValue(mockServer as any);
    vi.mocked(loadConfig).mockReturnValue({ registry: 'test-reg', framework: 'react' } as any);

    // Explicitly return false for existsSync
    vi.mocked(fs.existsSync).mockReturnValue(false);

    await program.parseAsync(['node', 'test', 'studio']);

    // we mock consoleLogMock in beforeEach
    const logCalls = consoleLogMock.mock.calls.map(args => args[0]);
    expect(logCalls.some(arg => typeof arg === 'string' && arg.includes('Skills Root:'))).toBe(false);
  });

  it('should use default components directory if config.directories.components is missing', async () => {
    const mockServer = { listen: vi.fn(), printUrls: vi.fn() };
    vi.mocked(createServer).mockResolvedValue(mockServer as any);

    // Return config WITHOUT directories.components
    vi.mocked(loadConfig).mockReturnValue({} as any);

    let pluginConfig: any;
    const { studioApiPlugin } = await import('@helios-project/studio/cli');
    (vi.mocked(studioApiPlugin) as any).mockImplementation((config: any) => {
        pluginConfig = config;
        return { name: 'mock-plugin' };
    });

    await program.parseAsync(['node', 'test', 'studio']);

    vi.mocked(fs.existsSync).mockReturnValue(true);
    const isInstalled = await pluginConfig.onCheckInstalled('test-comp');
    expect(isInstalled).toBe(true);
  });
});
