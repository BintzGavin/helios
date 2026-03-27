import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import { registerDiffCommand } from '../diff.js';
import { RegistryClient } from '../../registry/client.js';
import { loadConfig } from '../../utils/config.js';
import fs from 'fs';
import path from 'path';
import * as diff from 'diff';

vi.mock('../../registry/client.js', () => ({
  RegistryClient: vi.fn()
}));
vi.mock('../../utils/config.js');
vi.mock('fs');
vi.mock('path', async () => {
  const actual = await vi.importActual<typeof import('path')>('path');
  return {
    ...actual,
    default: {
      ...actual,
      resolve: vi.fn((...args) => actual.resolve(...args)),
      join: vi.fn((...args) => actual.join(...args))
    }
  };
});
vi.mock('diff');

describe('diff command', () => {
  let program: Command;
  let consoleErrorSpy: any;
  let consoleLogSpy: any;
  let exitSpy: any;

  beforeEach(() => {
    program = new Command();
    registerDiffCommand(program);
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // We need to throw an error in process.exit to stop execution flow
    // like the actual process.exit does.
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code: number) => {
      throw new Error(`process.exit(${code})`);
    }) as any);
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleLogSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('should exit if no config is found', async () => {
    (loadConfig as any).mockReturnValue(null);

    await expect(program.parseAsync(['node', 'helios', 'diff', 'button'])).rejects.toThrow('process.exit(1)');

    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('No helios.config.json found.'));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should exit if component is not found in registry', async () => {
    (loadConfig as any).mockReturnValue({
      registry: 'https://registry.example.com',
      framework: 'react',
      directories: { components: 'src/components' }
    });

    const findComponentMock = vi.fn().mockResolvedValue(null);
    (RegistryClient as any).mockImplementation(function() {
      return { findComponent: findComponentMock };
    });

    await expect(program.parseAsync(['node', 'helios', 'diff', 'button'])).rejects.toThrow('process.exit(1)');

    expect(findComponentMock).toHaveBeenCalledWith('button', 'react');
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Component "button" not found in registry.'));
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should indicate new file if local file is missing', async () => {
    (loadConfig as any).mockReturnValue({
      registry: 'https://registry.example.com',
      framework: 'react',
      directories: { components: 'src/components' }
    });

    const mockRemoteComponent = {
      files: [{ name: 'button.tsx', content: 'remote content' }]
    };
    const findComponentMock = vi.fn().mockResolvedValue(mockRemoteComponent);
    (RegistryClient as any).mockImplementation(function() {
      return { findComponent: findComponentMock };
    });

    (path.resolve as any).mockReturnValue('/mock/project/src/components');
    (path.join as any).mockReturnValue('/mock/project/src/components/button.tsx');
    (fs.existsSync as any).mockReturnValue(false);

    await program.parseAsync(['node', 'helios', 'diff', 'button']);

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('New file in registry: button.tsx'));
  });

  it('should show no differences when local matches remote', async () => {
    (loadConfig as any).mockReturnValue({
      registry: 'https://registry.example.com',
      framework: 'react',
      directories: { components: 'src/components' }
    });

    const mockRemoteComponent = {
      files: [{ name: 'button.tsx', content: 'same content\r\n' }]
    };
    const findComponentMock = vi.fn().mockResolvedValue(mockRemoteComponent);
    (RegistryClient as any).mockImplementation(function() {
      return { findComponent: findComponentMock };
    });

    (path.resolve as any).mockReturnValue('/mock/project/src/components');
    (path.join as any).mockReturnValue('/mock/project/src/components/button.tsx');
    (fs.existsSync as any).mockReturnValue(true);
    (fs.readFileSync as any).mockReturnValue('same content\n');

    await program.parseAsync(['node', 'helios', 'diff', 'button']);

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No differences found.'));
  });

  it('should show patch when local differs from remote', async () => {
    (loadConfig as any).mockReturnValue({
      registry: 'https://registry.example.com',
      framework: 'react',
      directories: { components: 'src/components' }
    });

    const mockRemoteComponent = {
      files: [{ name: 'button.tsx', content: 'remote content' }]
    };
    const findComponentMock = vi.fn().mockResolvedValue(mockRemoteComponent);
    (RegistryClient as any).mockImplementation(function() {
      return { findComponent: findComponentMock };
    });

    (path.resolve as any).mockReturnValue('/mock/project/src/components');
    (path.join as any).mockReturnValue('/mock/project/src/components/button.tsx');
    (fs.existsSync as any).mockReturnValue(true);
    (fs.readFileSync as any).mockReturnValue('local content');

    const mockPatch = 'Index: button.tsx\n===================================================================\n--- button.tsx\n+++ button.tsx\n@@ -1,1 +1,1 @@\n-remote content\n+local content';
    (diff.createTwoFilesPatch as any).mockReturnValue(mockPatch);

    await program.parseAsync(['node', 'helios', 'diff', 'button']);

    expect(diff.createTwoFilesPatch).toHaveBeenCalledWith(
      'button.tsx',
      'button.tsx',
      'remote content',
      'local content',
      'Registry',
      'Local'
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('+local content'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('-remote content'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('@@ -1,1 +1,1 @@'));
  });
});
