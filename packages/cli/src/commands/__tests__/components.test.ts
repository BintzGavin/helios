import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import { registerComponentsCommand } from '../components.js';
import { RegistryClient } from '../../registry/client.js';
import { loadConfig } from '../../utils/config.js';

vi.mock('../../registry/client.js');
vi.mock('../../utils/config.js');

describe('components command', () => {
  let program: Command;
  let consoleSpy: any;

  beforeEach(() => {
    program = new Command();
    registerComponentsCommand(program);
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should list all components when no query is provided', async () => {
    // Mock config
    (loadConfig as any).mockReturnValue({ framework: 'react' });

    // Mock RegistryClient
    const mockComponents = [
      { name: 'Button', type: 'react', description: 'A button component' },
      { name: 'Card', type: 'react', description: 'A card component' }
    ];
    const getComponentsMock = vi.fn().mockResolvedValue(mockComponents);
    (RegistryClient as any).mockImplementation(function() {
      return {
        getComponents: getComponentsMock
      };
    });

    await program.parseAsync(['node', 'helios', 'components']);

    expect(getComponentsMock).toHaveBeenCalledWith('react');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Available components:'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Button'));
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Card'));
  });

  it('should list components matching query', async () => {
    (loadConfig as any).mockReturnValue({ framework: 'react' });
    const mockComponents = [
      { name: 'Button', type: 'react', description: 'A button component' },
      { name: 'Card', type: 'react', description: 'A card component' }
    ];
    const getComponentsMock = vi.fn().mockResolvedValue(mockComponents);
    (RegistryClient as any).mockImplementation(function() {
      return {
        getComponents: getComponentsMock
      };
    });

    await program.parseAsync(['node', 'helios', 'components', 'button']);

    expect(getComponentsMock).toHaveBeenCalledWith('react');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Button'));
    expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('Card'));
  });

  it('should respect --all flag', async () => {
    (loadConfig as any).mockReturnValue({ framework: 'react' });
    const getComponentsMock = vi.fn().mockResolvedValue([]);
    (RegistryClient as any).mockImplementation(function() {
      return {
        getComponents: getComponentsMock
      };
    });

    await program.parseAsync(['node', 'helios', 'components', '--all']);

    expect(getComponentsMock).toHaveBeenCalledWith(undefined);
  });

  it('should respect --framework flag', async () => {
    (loadConfig as any).mockReturnValue({ framework: 'react' });
    const getComponentsMock = vi.fn().mockResolvedValue([]);
    (RegistryClient as any).mockImplementation(function() {
      return {
        getComponents: getComponentsMock
      };
    });

    await program.parseAsync(['node', 'helios', 'components', '--framework', 'vue']);

    expect(getComponentsMock).toHaveBeenCalledWith('vue');
  });

  it('should handle no components found', async () => {
    (loadConfig as any).mockReturnValue({ framework: 'react' });
    const getComponentsMock = vi.fn().mockResolvedValue([]);
    (RegistryClient as any).mockImplementation(function() {
      return {
        getComponents: getComponentsMock
      };
    });

    await program.parseAsync(['node', 'helios', 'components']);

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No components found'));
  });

  it('should print no components found message when query yields empty result', async () => {
    vi.mocked(loadConfig).mockReturnValue({ framework: 'react' } as any);
    const mockClient = { getComponents: vi.fn().mockResolvedValue([{ name: 'foo', description: 'bar', framework: 'react' }]) };
    vi.mocked(RegistryClient).mockImplementation(function() { return mockClient as any; });

    await program.parseAsync(['node', 'test', 'components', 'nonexistent']);

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No components found matching "nonexistent"'));
  });


  it('should not print description if component has no description', async () => {
    (loadConfig as any).mockReturnValue({ framework: 'react' });
    const mockComponents = [
      { name: 'NoDescComponent', type: 'react' }
    ];
    const getComponentsMock = vi.fn().mockResolvedValue(mockComponents);
    (RegistryClient as any).mockImplementation(function() {
      return {
        getComponents: getComponentsMock
      };
    });

    await program.parseAsync(['node', 'helios', 'components']);

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('NoDescComponent'));
    expect(console.log).not.toHaveBeenCalledWith(expect.stringContaining('undefined'));
  });

});
