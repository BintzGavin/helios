// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { findAssets, deleteComposition } from './discovery';
import fs from 'fs';
import path from 'path';

vi.mock('fs');

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
