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

  it('findComponent should return undefined for unknown components', () => {
    const comp = findComponent('does-not-exist');
    expect(comp).toBeUndefined();
  });
});
