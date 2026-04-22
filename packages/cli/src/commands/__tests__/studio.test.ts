import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import { registerStudioCommand } from '../studio.js';
import { createServer } from 'vite';
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

vi.mock('../../registry/client.js', () => {
  return {
    RegistryClient: vi.fn().mockImplementation(function() {
      return {
        getComponents: vi.fn().mockResolvedValue([{ name: 'test-comp' }]),
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
});
