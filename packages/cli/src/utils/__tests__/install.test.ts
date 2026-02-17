import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';
import { installComponent, resolveComponentTree } from '../install';
import { loadConfig, saveConfig } from '../config';
import { installPackage } from '../package-manager';

// Mock dependencies
vi.mock('fs');
vi.mock('../config');
vi.mock('../package-manager');
// We don't need to mock RegistryClient completely if we inject a mock object,
// but installComponent imports it. However, the function accepts an optional client.
// We will test by injecting a mock client.

describe('resolveComponentTree', () => {
  const mockClient = {
    findComponent: vi.fn(),
  } as any;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should resolve a single component', async () => {
    const component = { name: 'comp', dependencies: {}, files: [] };
    mockClient.findComponent.mockResolvedValue(component);

    const result = await resolveComponentTree(mockClient, 'comp', 'react');
    expect(result).toEqual([component]);
    expect(mockClient.findComponent).toHaveBeenCalledWith('comp', 'react');
  });

  it('should recursively resolve registry dependencies', async () => {
    const parent = { name: 'parent', registryDependencies: ['child'], files: [] };
    const child = { name: 'child', registryDependencies: [], files: [] };

    mockClient.findComponent
      .mockResolvedValueOnce(parent)
      .mockResolvedValueOnce(child);

    const result = await resolveComponentTree(mockClient, 'parent', 'react');
    // Order: child first (depth-first resolution pushes to array)
    // Wait, let's check implementation order.
    // implementation:
    // 1. push child components
    // 2. push self
    expect(result).toEqual([child, parent]);
  });

  it('should handle cycles gracefully', async () => {
    // A -> B -> A
    const compA = { name: 'A', registryDependencies: ['B'], files: [] };
    const compB = { name: 'B', registryDependencies: ['A'], files: [] };

    mockClient.findComponent.mockImplementation(async (name: string) => {
      if (name === 'A') return compA;
      if (name === 'B') return compB;
      return null;
    });

    const result = await resolveComponentTree(mockClient, 'A', 'react');

    // Result should contain B then A.
    // Trace:
    // resolve(A): visited={A}
    //   resolve(B): visited={A, B}
    //     resolve(A): visited={A, B} -> returns []
    //   push B
    // push A
    expect(result).toEqual([compB, compA]);
  });

  it('should throw if component not found', async () => {
    mockClient.findComponent.mockResolvedValue(null);
    await expect(resolveComponentTree(mockClient, 'missing', 'react'))
      .rejects.toThrow('Component "missing" not found');
  });
});

describe('installComponent', () => {
  const mockRootDir = '/mock/root';
  const mockConfig = {
    version: '1.0.0',
    directories: {
      components: 'src/components/helios',
      lib: 'src/lib',
    },
    components: [],
    framework: 'react',
  };

  const mockComponent = {
    name: 'test-component',
    type: 'component',
    files: [
      { name: 'TestComponent.tsx', content: '// test content' },
    ],
    dependencies: {
      'react': '^18.0.0',
    },
    registryDependencies: ['child-component'],
  };

  const mockChildComponent = {
    name: 'child-component',
    type: 'component',
    files: [
      { name: 'ChildComponent.tsx', content: '// child content' },
    ],
    dependencies: {},
    registryDependencies: [],
  };

  beforeEach(() => {
    vi.resetAllMocks();
    (loadConfig as any).mockReturnValue({ ...mockConfig });
    // Default: directories exist, files don't
    (fs.existsSync as any).mockImplementation((p: string) => {
        if (p === mockRootDir) return true;
        return false;
    });
    (fs.mkdirSync as any).mockImplementation(() => {});
    (fs.writeFileSync as any).mockImplementation(() => {});
    (fs.readFileSync as any).mockImplementation(() => '{}');
    (installPackage as any).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should throw error if config is missing', async () => {
    (loadConfig as any).mockReturnValue(null);
    await expect(installComponent(mockRootDir, 'test-component'))
      .rejects.toThrow('Configuration file not found');
  });

  it('should install component and update config', async () => {
    const mockClient = {
      findComponent: vi.fn().mockResolvedValue(mockComponent),
    } as any;

    await installComponent(mockRootDir, 'test-component', { install: true, client: mockClient });

    // Verify component fetch
    expect(mockClient.findComponent).toHaveBeenCalledWith('test-component', 'react');

    // Verify file creation
    const targetDir = path.resolve(mockRootDir, 'src/components/helios');
    const filePath = path.join(targetDir, 'TestComponent.tsx');

    // mkdirSync should be called for the component directory
    expect(fs.mkdirSync).toHaveBeenCalledWith(targetDir, { recursive: true });
    expect(fs.writeFileSync).toHaveBeenCalledWith(filePath, '// test content');

    // Verify config update
    expect(saveConfig).toHaveBeenCalledWith(expect.objectContaining({
      components: expect.arrayContaining(['test-component']),
    }), mockRootDir);
  });

  it('should recursively install dependencies', async () => {
    const mockClient = {
      findComponent: vi.fn().mockImplementation((name) => {
        if (name === 'test-component') return Promise.resolve(mockComponent);
        if (name === 'child-component') return Promise.resolve(mockChildComponent);
        return Promise.resolve(null);
      }),
    } as any;

    await installComponent(mockRootDir, 'test-component', { install: true, client: mockClient });

    // Verify both components fetched
    expect(mockClient.findComponent).toHaveBeenCalledWith('test-component', 'react');
    expect(mockClient.findComponent).toHaveBeenCalledWith('child-component', 'react');

    // Verify both files written
    const targetDir = path.resolve(mockRootDir, 'src/components/helios');
    expect(fs.writeFileSync).toHaveBeenCalledWith(path.join(targetDir, 'TestComponent.tsx'), expect.any(String));
    expect(fs.writeFileSync).toHaveBeenCalledWith(path.join(targetDir, 'ChildComponent.tsx'), expect.any(String));

    // Verify config update includes both
    expect(saveConfig).toHaveBeenCalledWith(expect.objectContaining({
      components: expect.arrayContaining(['child-component', 'test-component']),
    }), mockRootDir);
  });

  it('should skip existing files if overwrite is false', async () => {
     const mockClient = {
      findComponent: vi.fn().mockResolvedValue(mockComponent),
    } as any;

    // Simulate file exists
    (fs.existsSync as any).mockReturnValue(true);

    await installComponent(mockRootDir, 'test-component', { install: true, overwrite: false, client: mockClient });

    // Should verify it exists (mocked above) but NOT write
    // Note: The implementation checks fs.existsSync(filePath).
    // If it returns true and !overwrite, it skips write.
    // However, mkdirSync might still be called, which is fine.

    // We check that writeFileSync was NOT called for the component file
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });

  it('should overwrite existing files if overwrite is true', async () => {
     const mockClient = {
      findComponent: vi.fn().mockResolvedValue(mockComponent),
    } as any;

    // Simulate file exists
    (fs.existsSync as any).mockReturnValue(true);

    await installComponent(mockRootDir, 'test-component', { install: true, overwrite: true, client: mockClient });

    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  it('should install npm dependencies', async () => {
    const mockClient = {
      findComponent: vi.fn().mockResolvedValue(mockComponent),
    } as any;

    // Mock package.json reading to return empty deps
    (fs.readFileSync as any).mockReturnValue('{}');

    await installComponent(mockRootDir, 'test-component', { install: true, client: mockClient });

    expect(installPackage).toHaveBeenCalledWith(
      mockRootDir,
      ['react@^18.0.0']
    );
  });

  it('should not install npm dependencies if options.install is false', async () => {
    const mockClient = {
      findComponent: vi.fn().mockResolvedValue(mockComponent),
    } as any;

    (fs.readFileSync as any).mockReturnValue('{}');

    await installComponent(mockRootDir, 'test-component', { install: false, client: mockClient });

    expect(installPackage).not.toHaveBeenCalled();
  });
});
