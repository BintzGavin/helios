import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { registry, findComponent } from '../manifest.js';

describe('Registry Manifest', () => {
  it('should export a registry array with default components', () => {
    expect(registry.length).toBeGreaterThan(0);
    const names = registry.map(c => c.name);
    expect(names).toContain('use-video-frame');
    expect(names).toContain('timer');
    expect(names).toContain('progress-bar');
    expect(names).toContain('watermark');
    expect(names).toContain('shaders');
    expect(names).toContain('beat-clock');
    expect(names).toContain('cursor');
  });

  it('should have valid ComponentDefinition structure for each component', () => {
    registry.forEach(component => {
      expect(component.name).toBeDefined();
      expect(typeof component.name).toBe('string');

      expect(component.type).toBeDefined();
      expect(typeof component.type).toBe('string');

      expect(component.files).toBeDefined();
      expect(Array.isArray(component.files)).toBe(true);
      expect(component.files.length).toBeGreaterThan(0);

      component.files.forEach(file => {
        expect(file.name).toBeDefined();
        expect(typeof file.name).toBe('string');
        expect(file.content).toBeDefined();
        expect(typeof file.content).toBe('string');
      });
    });
  });

  it('findComponent should return the correct component', () => {
    const comp = findComponent('timer');
    expect(comp).toBeDefined();
    expect(comp?.name).toBe('timer');
  });

  it('installs the same Shaders adapter the shaders-animation example runs', () => {
    const example = readFileSync(new URL('../../../../../examples/shaders-animation/src/heliosShader.ts', import.meta.url), 'utf8');
    expect(findComponent('shaders')?.files[0].content).toBe(example);
  });

  it.each([
    ['beat-clock', 'beatClock.ts'],
    ['cursor', 'cursor.ts'],
  ])('installs the tested source of %s, with nothing else to install', (name, file) => {
    const component = findComponent(name);
    expect(component).toMatchObject({ name, type: 'vanilla' });
    expect(component?.files.map((f) => f.name)).toEqual([file]);
    const source = readFileSync(new URL(`../components/${file}`, import.meta.url), 'utf8');
    expect(component?.files[0].content).toBe(source);
    // Framework-free: no npm packages, no other components, no imports.
    expect(component?.dependencies).toBeUndefined();
    expect(component?.registryDependencies).toBeUndefined();
    expect(source).not.toMatch(/^import /m);
  });

  it('findComponent should return undefined for unknown components', () => {
    const comp = findComponent('does-not-exist');
    expect(comp).toBeUndefined();
  });
});
