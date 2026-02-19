// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { findAssets, deleteComposition, createComposition, findCompositions, renameComposition, createDirectory } from './discovery';
import fs from 'fs';
import path from 'path';

vi.mock('fs', async (importOriginal) => {
    const actual = await importOriginal<typeof import('fs')>();
    return {
        ...actual,
        default: {
            ...actual,
            existsSync: vi.fn(),
            readdirSync: vi.fn(),
            readFileSync: vi.fn(),
            mkdirSync: vi.fn(),
            writeFileSync: vi.fn(),
            rmSync: vi.fn(),
            renameSync: vi.fn(),
            cpSync: vi.fn(),
            promises: {
                readdir: vi.fn(),
                readFile: vi.fn(),
                access: vi.fn(),
                rename: vi.fn(),
            }
        }
    };
});

describe('findCompositions', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.resetAllMocks();
        process.env = { ...originalEnv, HELIOS_PROJECT_ROOT: path.resolve('/mock/project') };
        vi.mocked(fs.existsSync).mockReturnValue(false);
        vi.mocked(fs.promises.access).mockRejectedValue(new Error('ENOENT'));
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('should find nested compositions', async () => {
        // Mock directory structure:
        // /mock/project/
        //   comp1/ (composition)
        //   folder/
        //     comp2/ (composition)
        //     subfolder/
        //       comp3/ (composition)
        //   node_modules/ (ignored)

        vi.mocked(fs.promises.readdir).mockImplementation(async (dirPath: any) => {
            const dir = path.resolve(dirPath);
            const root = path.resolve('/mock/project');

            if (dir === root) {
                return [
                    { name: 'comp1', isDirectory: () => true, isFile: () => false },
                    { name: 'folder', isDirectory: () => true, isFile: () => false },
                    { name: 'node_modules', isDirectory: () => true, isFile: () => false }, // Should be ignored
                    { name: 'random.txt', isDirectory: () => false, isFile: () => true }
                ] as any;
            }
            if (dir === path.resolve(root, 'comp1')) {
                return [
                     { name: 'composition.html', isDirectory: () => false, isFile: () => true }
                ] as any;
            }
            if (dir === path.resolve(root, 'folder')) {
                return [
                    { name: 'comp2', isDirectory: () => true, isFile: () => false },
                    { name: 'subfolder', isDirectory: () => true, isFile: () => false }
                ] as any;
            }
            if (dir === path.resolve(root, 'folder/comp2')) {
                return [
                     { name: 'composition.html', isDirectory: () => false, isFile: () => true }
                ] as any;
            }
            if (dir === path.resolve(root, 'folder/subfolder')) {
                return [
                    { name: 'comp3', isDirectory: () => true, isFile: () => false }
                ] as any;
            }
            if (dir === path.resolve(root, 'folder/subfolder/comp3')) {
                return [
                     { name: 'composition.html', isDirectory: () => false, isFile: () => true }
                ] as any;
            }
            return [] as any;
        });

        // Implementation for both existsSync and promises.access
        const checkExists = (filePath: any) => {
            const p = path.resolve(filePath);
            const root = path.resolve('/mock/project');

            // Check for composition.html
            if (p === path.resolve(root, 'comp1/composition.html')) return true;
            if (p === path.resolve(root, 'folder/comp2/composition.html')) return true;
            if (p === path.resolve(root, 'folder/subfolder/comp3/composition.html')) return true;

            // Project root exists
            if (p === root) return true;
            return false;
        };

        vi.mocked(fs.existsSync).mockImplementation(checkExists);
        vi.mocked(fs.promises.access).mockImplementation(async (filePath: any) => {
            if (checkExists(filePath)) return undefined; // Resolve (void)
            throw new Error('ENOENT');
        });

        vi.mocked(fs.promises.readFile).mockResolvedValue('{}'); // Mock metadata read

        const compositions = await findCompositions('.');

        const ids = compositions.map(c => c.id).sort();

        expect(ids).toContain('comp1');
        expect(ids).toContain('folder/comp2');
        expect(ids).toContain('folder/subfolder/comp3');
        expect(ids).not.toContain('node_modules');

        // Verify URLs are correct
        const comp2 = compositions.find(c => c.id === 'folder/comp2');
        expect(comp2).toBeDefined();
        // The URL logic uses /@fs prefix
        expect(comp2?.url).toContain('folder/comp2/composition.html');

        // Verify names
        expect(comp2?.name).toBe('Comp2'); // Capitalized

        // Verify description (should contain relative path)
        expect(comp2?.description).toContain('folder/comp2');
    });

    it('should include thumbnailUrl if thumbnail.png exists', async () => {
        const root = path.resolve('/mock/project');

        vi.mocked(fs.promises.readdir).mockImplementation(async (dirPath: any) => {
            const dir = path.resolve(dirPath);
            if (dir === root) {
                return [
                    { name: 'comp-with-thumb', isDirectory: () => true, isFile: () => false }
                ] as any;
            }
            if (dir === path.resolve(root, 'comp-with-thumb')) {
                return [
                    { name: 'composition.html', isDirectory: () => false, isFile: () => true },
                    { name: 'thumbnail.png', isDirectory: () => false, isFile: () => true }
                ] as any;
            }
            return [] as any;
        });

        const checkExists = (filePath: any) => {
            const p = path.resolve(filePath);
            if (p === root) return true;
            if (p === path.resolve(root, 'comp-with-thumb/composition.html')) return true;
            if (p === path.resolve(root, 'comp-with-thumb/thumbnail.png')) return true;
            return false;
        };

        vi.mocked(fs.existsSync).mockImplementation(checkExists);
        vi.mocked(fs.promises.access).mockImplementation(async (filePath: any) => {
            if (checkExists(filePath)) return undefined;
            throw new Error('ENOENT');
        });

        const compositions = await findCompositions('.');
        expect(compositions).toHaveLength(1);
        expect(compositions[0].thumbnailUrl).toContain('comp-with-thumb/thumbnail.png');
    });
});

describe('findAssets', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    // Set explicit project root to control the path
    process.env = { ...originalEnv, HELIOS_PROJECT_ROOT: path.resolve('/mock/project') };
    vi.mocked(fs.existsSync).mockImplementation((p) => p === path.resolve('/mock/project'));
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should discover supported asset types including new extensions and folders', async () => {
    const mockFiles = [
      { name: 'image.png', isDirectory: () => false },
      { name: 'model.glb', isDirectory: () => false },
      { name: 'data.json', isDirectory: () => false },
      { name: 'shader.frag', isDirectory: () => false },
      { name: 'notes.txt', isDirectory: () => false },
      { name: 'subfolder', isDirectory: () => true }, // Directory
    ];

    // Mock fs.promises.readdir
    vi.mocked(fs.promises.readdir).mockImplementation(async (dir) => {
        // Prevent infinite recursion by only returning files for root
        if (dir === path.resolve('/mock/project')) {
            return mockFiles as any;
        }
        return [] as any;
    });

    const assets = await findAssets('.');

    // Verify we found the expected assets with correct types
    const assetNames = assets.map(a => a.name).sort();

    // This expectation defines our goal: finding these new types
    expect(assetNames).toEqual(expect.arrayContaining(['data.json', 'image.png', 'model.glb', 'shader.frag', 'subfolder']));
    expect(assetNames).not.toContain('notes.txt');

    const assetMap = new Map(assets.map(a => [a.name, a.type]));
    expect(assetMap.get('image.png')).toBe('image');
    expect(assetMap.get('model.glb')).toBe('model');
    expect(assetMap.get('data.json')).toBe('json');
    expect(assetMap.get('shader.frag')).toBe('shader');
    expect(assetMap.get('subfolder')).toBe('folder');
  });

  it('should prioritize public directory if it exists and use relative URLs', async () => {
    const root = path.resolve('/mock/project');
    const publicDir = path.resolve(root, 'public');

    vi.mocked(fs.existsSync).mockImplementation((p) => {
        if (p === root) return true;
        if (p === publicDir) return true;
        return false;
    });

    vi.mocked(fs.promises.readdir).mockImplementation(async (dir) => {
        if (dir === publicDir) {
            return [
                { name: 'logo.png', isDirectory: () => false }
            ] as any;
        }
        return [] as any;
    });

    const assets = await findAssets('.');

    expect(assets).toHaveLength(1);
    expect(assets[0].name).toBe('logo.png');
    expect(assets[0].url).toBe('/logo.png');
    expect(assets[0].relativePath).toBe('logo.png');
  });

  it('should fall back to project root if public directory does not exist', async () => {
    const root = path.resolve('/mock/project');
    const publicDir = path.resolve(root, 'public');

    vi.mocked(fs.existsSync).mockImplementation((p) => {
        if (p === root) return true;
        if (p === publicDir) return false;
        return false;
    });

    vi.mocked(fs.promises.readdir).mockImplementation(async (dir) => {
        if (dir === root) {
            return [
                { name: 'root-image.png', isDirectory: () => false }
            ] as any;
        }
        return [] as any;
    });

    const assets = await findAssets('.');

    expect(assets).toHaveLength(1);
    expect(assets[0].name).toBe('root-image.png');
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

describe('renameComposition', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.resetAllMocks();
        process.env = { ...originalEnv, HELIOS_PROJECT_ROOT: path.resolve('/mock/project') };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('should rename a composition directory', async () => {
        const id = 'old-name';
        const newName = 'New Name';
        const projectRoot = path.resolve('/mock/project');
        const sourceDir = path.join(projectRoot, id);
        const targetDir = path.join(projectRoot, 'new-name');

        const checkExists = (p: any) => {
            if (p === projectRoot) return true;
            if (p === sourceDir) return true;
            if (p === targetDir) return false;
            return false;
        };

        // Mock access for async check
        vi.mocked(fs.promises.access).mockImplementation(async (filePath: any) => {
            if (checkExists(filePath)) return undefined;
            throw new Error('ENOENT');
        });

        // Mock rename
        vi.mocked(fs.promises.rename).mockResolvedValue(undefined);

        const result = await renameComposition('.', id, newName);

        expect(fs.promises.rename).toHaveBeenCalledWith(sourceDir, targetDir);
        expect(result.id).toBe('new-name');
        expect(result.name).toBe('New Name');
    });

    it('should fail if target already exists', async () => {
        const id = 'old-name';
        const newName = 'Existing Name';
        const projectRoot = path.resolve('/mock/project');
        const sourceDir = path.join(projectRoot, id);
        const targetDir = path.join(projectRoot, 'existing-name');

        const checkExists = (p: any) => {
             if (p === projectRoot) return true;
             if (p === sourceDir) return true;
             if (p === targetDir) return true; // Target exists
             return false;
        };

        vi.mocked(fs.promises.access).mockImplementation(async (filePath: any) => {
            if (checkExists(filePath)) return undefined;
            throw new Error('ENOENT');
        });

        await expect(renameComposition('.', id, newName)).rejects.toThrow(/already exists/);
    });

    it('should fail if source does not exist', async () => {
        const id = 'missing-comp';
        const newName = 'New Name';
        const projectRoot = path.resolve('/mock/project');

        const checkExists = (p: any) => {
            if (p === projectRoot) return true;
            return false;
        };

        vi.mocked(fs.promises.access).mockImplementation(async (filePath: any) => {
            if (checkExists(filePath)) return undefined;
            throw new Error('ENOENT');
        });

        await expect(renameComposition('.', id, newName)).rejects.toThrow(/not found/);
    });
});

describe('createDirectory', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        vi.resetAllMocks();
        process.env = { ...originalEnv, HELIOS_PROJECT_ROOT: path.resolve('/mock/project') };
        vi.mocked(fs.existsSync).mockReturnValue(false); // Default: doesn't exist
        vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('should create a directory inside public folder if it exists', () => {
        const projectRoot = path.resolve('/mock/project');
        const publicDir = path.join(projectRoot, 'public');

        vi.mocked(fs.existsSync).mockImplementation((p) => {
            if (p === publicDir) return true;
            return false;
        });

        const result = createDirectory('.', 'new-folder');

        const expectedPath = path.join(publicDir, 'new-folder');
        expect(fs.mkdirSync).toHaveBeenCalledWith(expectedPath, { recursive: true });
        expect(result.type).toBe('folder');
        expect(result.name).toBe('new-folder');
        expect(result.url).toBe('/new-folder');
    });

    it('should create a directory inside project root if public folder missing', () => {
        const projectRoot = path.resolve('/mock/project');

        vi.mocked(fs.existsSync).mockReturnValue(false);

        const result = createDirectory('.', 'new-folder');

        const expectedPath = path.join(projectRoot, 'new-folder');
        expect(fs.mkdirSync).toHaveBeenCalledWith(expectedPath, { recursive: true });
        expect(result.url).toBe(`/@fs${expectedPath}`);
    });

    it('should throw if directory already exists', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        expect(() => createDirectory('.', 'existing')).toThrow(/already exists/);
    });

    it('should prevent path traversal', () => {
        const projectRoot = path.resolve('/mock/project');
        // createDirectory sanitizes path, so ../outside becomes just 'outside' inside the root
        // Wait, path.normalize('..') is '..'.
        // createDirectory logic: path.normalize(dirPath).replace(/^(\.\.[\/\\])+/, '');

        // If we pass '../outside', normalize gives '../outside'. Regex removes leading ../
        // So it becomes 'outside'.

        // If we want to test that it throws when trying to write outside, we'd need to bypass that regex or assume regex fails?
        // Actually, the security check is: if (!fullPath.startsWith(scanRoot)).
        // Since we sanitize, fullPath will always be inside scanRoot unless scanRoot itself is weird.

        // Let's test that it creates 'outside' inside root instead of actually going outside

        vi.mocked(fs.existsSync).mockReturnValue(false);
        const result = createDirectory('.', '../outside');

        const expectedPath = path.join(projectRoot, 'outside');
        expect(fs.mkdirSync).toHaveBeenCalledWith(expectedPath, { recursive: true });
    });
});
