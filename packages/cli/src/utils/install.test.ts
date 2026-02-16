import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { installComponent } from './install.js';
import { RegistryClient } from '../registry/client.js';
import { loadConfig, saveConfig } from './config.js';
import fs from 'fs';
import path from 'path';

vi.mock('fs');
vi.mock('path');
vi.mock('./config.js');
vi.mock('../registry/client.js');
vi.mock('./package-manager.js');

describe('installComponent', () => {
  const mockCwd = '/test/cwd';
  const mockClient = new RegistryClient();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(path.resolve).mockImplementation((...args) => args.join('/'));
    vi.mocked(path.join).mockImplementation((...args) => args.join('/'));
    vi.mocked(path.dirname).mockImplementation((p) => p.split('/').slice(0, -1).join('/'));

    // Default exist logic
    vi.mocked(fs.existsSync).mockImplementation((path) => {
      // Mock that directories exist, but files don't (unless specified)
      if (typeof path === 'string') {
          if (path.endsWith('package.json')) return true;
          if (path.endsWith('helios.config.json')) return true;
          if (path.endsWith('.tsx')) return false;
      }
      return true;
    });

    vi.mocked(loadConfig).mockReturnValue({
      version: '1.0.0',
      directories: {
        components: 'src/components/helios',
        lib: 'src/lib',
      },
      components: [],
      framework: 'react'
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should install component and its files', async () => {
    const componentDef = {
      name: 'test-comp',
      type: 'react' as const,
      files: [{ name: 'Test.tsx', content: 'content' }],
      dependencies: { 'react': '18.0.0' }
    };

    // Mock resolveComponentTree indirectly via client.findComponent
    // Wait, installComponent calls resolveComponentTree which calls client.findComponent
    // resolveComponentTree is not exported, so we rely on client mock.

    vi.spyOn(mockClient, 'findComponent').mockResolvedValue(componentDef);

    await installComponent(mockCwd, 'test-comp', { install: false, client: mockClient });

    // Verify file write
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      '/test/cwd/src/components/helios/Test.tsx',
      'content'
    );

    // Verify config update
    expect(saveConfig).toHaveBeenCalledWith(expect.objectContaining({
      components: ['test-comp']
    }), mockCwd);
  });

  it('should handle registry dependencies', async () => {
    const parent = {
      name: 'parent',
      type: 'react' as const,
      files: [],
      registryDependencies: ['child']
    };
    const child = {
      name: 'child',
      type: 'react' as const,
      files: [{ name: 'Child.tsx', content: 'child' }]
    };

    vi.spyOn(mockClient, 'findComponent')
      .mockResolvedValueOnce(parent)
      .mockResolvedValueOnce(child);

    await installComponent(mockCwd, 'parent', { install: false, client: mockClient });

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      '/test/cwd/src/components/helios/Child.tsx',
      'child'
    );

    // Config should have both?
    // installComponent adds 'installedComponents' to config.
    // It pushes component.name for each component in `componentsToInstall`.
    expect(saveConfig).toHaveBeenCalledWith(expect.objectContaining({
      components: ['child', 'parent']
    }), mockCwd);
  });
});
