import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import { registerAddCommand } from '../add.js';
import { installComponent } from '../../utils/install.js';
import { getConfigOrThrow } from '../../utils/config.js';
import { RegistryClient } from '../../registry/client.js';

vi.mock('../../utils/install.js', () => ({
  installComponent: vi.fn(),
}));

vi.mock('../../utils/config.js', () => ({
  getConfigOrThrow: vi.fn(),
}));

vi.mock('../../registry/client.js', () => ({
  RegistryClient: vi.fn(),
}));

describe('add command', () => {
  let program: Command;
  let exitMock: ReturnType<typeof vi.spyOn>;
  let errorMock: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    program = new Command();
    registerAddCommand(program);
    exitMock = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    errorMock = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should call installComponent with correct arguments on normal installation', async () => {
    const mockConfig = { registry: 'http://test-registry.com' };
    vi.mocked(getConfigOrThrow).mockReturnValue(mockConfig as any);

    await program.parseAsync(['node', 'test', 'add', 'button']);

    expect(getConfigOrThrow).toHaveBeenCalledWith(process.cwd());
    expect(RegistryClient).toHaveBeenCalledWith(mockConfig.registry);
    expect(installComponent).toHaveBeenCalledWith(
      process.cwd(),
      'button',
      { install: true, client: expect.any(Object) }
    );
    expect(exitMock).not.toHaveBeenCalled();
    expect(errorMock).not.toHaveBeenCalled();
  });

  it('should call installComponent with install: false when --no-install flag is provided', async () => {
    const mockConfig = { registry: 'http://test-registry.com' };
    vi.mocked(getConfigOrThrow).mockReturnValue(mockConfig as any);

    await program.parseAsync(['node', 'test', 'add', 'button', '--no-install']);

    expect(installComponent).toHaveBeenCalledWith(
      process.cwd(),
      'button',
      { install: false, client: expect.any(Object) }
    );
  });

  it('should log error and exit when getConfigOrThrow throws', async () => {
    const error = new Error('Config not found');
    vi.mocked(getConfigOrThrow).mockImplementation(() => {
      throw error;
    });

    await program.parseAsync(['node', 'test', 'add', 'button']);

    expect(errorMock).toHaveBeenCalledWith(expect.stringContaining('Config not found'));
    expect(exitMock).toHaveBeenCalledWith(1);
    expect(installComponent).not.toHaveBeenCalled();
  });

  it('should log error and exit when installComponent throws', async () => {
    const mockConfig = { registry: 'http://test-registry.com' };
    vi.mocked(getConfigOrThrow).mockReturnValue(mockConfig as any);

    const error = new Error('Component not found');
    vi.mocked(installComponent).mockRejectedValue(error);

    await program.parseAsync(['node', 'test', 'add', 'button']);

    expect(errorMock).toHaveBeenCalledWith(expect.stringContaining('Component not found'));
    expect(exitMock).toHaveBeenCalledWith(1);
  });
});
