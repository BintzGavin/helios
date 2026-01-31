// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { findAssets, deleteComposition, createComposition, findCompositions } from './discovery';
import fs from 'fs';
import path from 'path';

vi.mock('fs');

describe('findCompositions', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.resetAllMocks();
        process.env = { ...originalEnv, HELIOS_PROJECT_ROOT: path.resolve('/mock/project') };
        vi.mocked(fs.existsSync).mockReturnValue(false);
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('should find nested compositions', () => {
        // Mock directory structure:
        // /mock/project/
        //   comp1/ (composition)
        //   folder/
        //     comp2/ (composition)
        //     subfolder/
        //       comp3/ (composition)
        //   node_modules/ (ignored)

        vi.mocked(fs.readdirSync).mockImplementation((dirPath: any) => {
            const dir = path.resolve(dirPath);
            const root = path.resolve('/mock/project');

            if (dir === root) {
                return [
                    { name: 'comp1', isDirectory: () => true },
                    { name: 'folder', isDirectory: () => true },
                    { name: 'node_modules', isDirectory: () => true }, // Should be ignored
                    { name: 'random.txt', isDirectory: () => false }
                ] as any;
            }
            if (dir === path.resolve(root, 'folder')) {
                return [
                    { name: 'comp2', isDirectory: () => true },
                    { name: 'subfolder', isDirectory: () => true }
                ] as any;
            }
            if (dir === path.resolve(root, 'folder/subfolder')) {
                return [
                    { name: 'comp3', isDirectory: () => true }
                ] as any;
            }
            return [] as any;
        });

        vi.mocked(fs.existsSync).mockImplementation((filePath: any) => {
            const p = path.resolve(filePath);
            const root = path.resolve('/mock/project');

            // Check for composition.html
            if (p === path.resolve(root, 'comp1/composition.html')) return true;
            if (p === path.resolve(root, 'folder/comp2/composition.html')) return true;
            if (p === path.resolve(root, 'folder/subfolder/comp3/composition.html')) return true;

            // Project root exists
            if (p === root) return true;

            return false;
        });

        vi.mocked(fs.readFileSync).mockImplementation(() => '{}'); // Mock metadata read

        const compositions = findCompositions('.');

        const ids = compositions.map(c => c.id).sort();

        expect(ids).toContain('comp1');
        expect(ids).toContain('folder/comp2');
        expect(ids).toContain('folder/subfolder/comp3');
        expect(ids).not.toContain('node_modules');

        // Verify URLs are correct
        const comp2 = compositions.find(c => c.id === 'folder/comp2');
        expect(comp2).toBeDefined();
        // The URL logic uses /@fs prefix
        // On Windows, paths might differ, but our test environment is likely Posix or we used path.join
        // However, findCompositions implementation uses `/@fs${compPath}`.
        // compPath is constructed with path.join.
        // For the test expectation, we can check if it contains the path.
        expect(comp2?.url).toContain('folder/comp2/composition.html');

        // Verify names
        expect(comp2?.name).toBe('Comp2'); // Capitalized

        // Verify description (should contain relative path)
        expect(comp2?.description).toContain('folder/comp2');
    });
});

describe('findAssets', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    // Set explicit project root to control the path
    process.env = { ...originalEnv, HELIOS_PROJECT_ROOT: path.resolve('/mock/project') };
    vi.mocked(fs.existsSync).mockReturnValue(true);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should discover supported asset types including new extensions', () => {
    const mockFiles = [
      { name: 'image.png', isDirectory: () => false },
      { name: 'model.glb', isDirectory: () => false },
      { name: 'data.json', isDirectory: () => false },
      { name: 'shader.frag', isDirectory: () => false },
      { name: 'notes.txt', isDirectory: () => false },
    ];

    // Mock readdirSync
    // We use mockImplementation to handle the path resolution correctly
    vi.mocked(fs.readdirSync).mockImplementation((dir) => {
        // We accept any call because getProjectRoot does some path resolution
        return mockFiles as any;
    });

    const assets = findAssets('.');

    // Verify we found the expected assets with correct types
    const assetNames = assets.map(a => a.name).sort();

    // This expectation defines our goal: finding these new types
    expect(assetNames).toEqual(expect.arrayContaining(['data.json', 'image.png', 'model.glb', 'shader.frag']));
    expect(assetNames).not.toContain('notes.txt');

    const assetMap = new Map(assets.map(a => [a.name, a.type]));
    expect(assetMap.get('image.png')).toBe('image');

    // These assertions will fail until we implement the changes
    expect(assetMap.get('model.glb')).toBe('model');
    expect(assetMap.get('data.json')).toBe('json');
    expect(assetMap.get('shader.frag')).toBe('shader');
  });

  it('should prioritize public directory if it exists and use relative URLs', () => {
    const root = path.resolve('/mock/project');
    const publicDir = path.resolve(root, 'public');

    vi.mocked(fs.existsSync).mockImplementation((p) => {
        if (p === root) return true;
        if (p === publicDir) return true;
        return false;
    });

    vi.mocked(fs.readdirSync).mockImplementation((dir) => {
        if (dir === publicDir) {
            return [
                { name: 'logo.png', isDirectory: () => false }
            ] as any;
        }
        return [] as any;
    });

    const assets = findAssets('.');

    expect(assets).toHaveLength(1);
    expect(assets[0].name).toBe('logo.png');
    // For public assets, URL should be relative (no /@fs)
    expect(assets[0].url).toBe('/logo.png');
    // Relative path should be correct
    expect(assets[0].relativePath).toBe('logo.png');
  });

  it('should fall back to project root if public directory does not exist', () => {
    const root = path.resolve('/mock/project');
    const publicDir = path.resolve(root, 'public');

    vi.mocked(fs.existsSync).mockImplementation((p) => {
        if (p === root) return true;
        if (p === publicDir) return false;
        return false;
    });

    vi.mocked(fs.readdirSync).mockImplementation((dir) => {
        if (dir === root) {
            return [
                { name: 'root-image.png', isDirectory: () => false }
            ] as any;
        }
        return [] as any;
    });

    const assets = findAssets('.');

    expect(assets).toHaveLength(1);
    expect(assets[0].name).toBe('root-image.png');
    // For root assets, URL should use /@fs
    expect(assets[0].url).toContain('/@fs');
    expect(assets[0].url).toContain('root-image.png');
    expect(assets[0].relativePath).toBe('root-image.png');
  });
});

describe('deleteComposition', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv, HELIOS_PROJECT_ROOT: path.resolve('/mock/project') };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should delete a valid composition directory', () => {
    const compId = 'my-composition';
    const compPath = path.resolve('/mock/project', compId);

    // Mock existsSync
    vi.mocked(fs.existsSync).mockImplementation((p) => {
        // Project root check
        if (p === path.resolve('/mock/project')) return true;
        // Composition check
        if (p === compPath) return true;
        // composition.html check
        if (p === path.join(compPath, 'composition.html')) return true;
        return false;
    });

    // Mock rmSync
    vi.mocked(fs.rmSync).mockReturnValue(undefined);

    deleteComposition('.', compId);

    expect(fs.rmSync).toHaveBeenCalledWith(compPath, { recursive: true, force: true });
  });

  it('should throw error if composition does not exist', () => {
     vi.mocked(fs.existsSync).mockImplementation((p) => {
        if (p === path.resolve('/mock/project')) return true;
        return false;
     });

     expect(() => deleteComposition('.', 'unknown-comp')).toThrow(/not found/);
  });

  it('should throw error if access denied (outside project root)', () => {
     expect(() => deleteComposition('.', '../outside')).toThrow(/Access denied/);
  });
});

describe('createComposition', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv, HELIOS_PROJECT_ROOT: path.resolve('/mock/project') };
    vi.mocked(fs.existsSync).mockReturnValue(false); // Default to not existing
    vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
    vi.mocked(fs.writeFileSync).mockReturnValue(undefined);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should create a directory with -solid suffix for Solid template if missing', () => {
    const name = 'My Composition';
    const expectedPath = path.resolve('/mock/project', 'my-composition-solid');

    createComposition('.', name, 'solid');

    expect(fs.mkdirSync).toHaveBeenCalledWith(expectedPath, { recursive: true });
    // Also verify files are written
    expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('my-composition-solid'),
        expect.any(String)
    );
  });

  it('should not double append -solid suffix if already present', () => {
    const name = 'My Composition Solid';
    const expectedPath = path.resolve('/mock/project', 'my-composition-solid');

    createComposition('.', name, 'solid');

    expect(fs.mkdirSync).toHaveBeenCalledWith(expectedPath, { recursive: true });
  });

  it('should not append suffix for other templates', () => {
    const name = 'My Composition';
    const expectedPath = path.resolve('/mock/project', 'my-composition');

    createComposition('.', name, 'vanilla');

    expect(fs.mkdirSync).toHaveBeenCalledWith(expectedPath, { recursive: true });
  });
});
