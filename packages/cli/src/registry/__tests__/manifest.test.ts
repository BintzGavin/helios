import { describe, it, expect } from 'vitest';
import { registry, findComponent } from '../manifest.js';

describe('registry manifest', () => {
  it('registry contains expected components', () => {
    const names = registry.map(c => c.name);
    expect(names).toContain('use-video-frame');
    expect(names).toContain('timer');
    expect(names).toContain('progress-bar');
    expect(names).toContain('watermark');
  });

  it('registry entries have correct fields', () => {
    const watermark = registry.find(c => c.name === 'watermark');
    expect(watermark).toBeDefined();
    expect(watermark?.type).toBe('react');
    expect(watermark?.dependencies).toBeDefined();
    expect(watermark?.files.length).toBeGreaterThan(0);
  });

  describe('findComponent', () => {
    it('returns the component if it exists', () => {
      const component = findComponent('use-video-frame');
      expect(component).toBeDefined();
      expect(component?.name).toBe('use-video-frame');
    });

    it('returns undefined if component does not exist', () => {
      const component = findComponent('non-existent-component');
      expect(component).toBeUndefined();
    });
  });
});
