import { describe, it, expect } from 'vitest';
import { templates } from './index';

describe('Templates Index', () => {
  it('should export all expected templates', () => {
    expect(Object.keys(templates)).toEqual(expect.arrayContaining(['react', 'vue', 'svelte', 'threejs', 'vanilla', 'solid']));
    expect(templates.react).toBeDefined();
    expect(templates.vue).toBeDefined();
    expect(templates.svelte).toBeDefined();
    expect(templates.threejs).toBeDefined();
    expect(templates.vanilla).toBeDefined();
    expect(templates.solid).toBeDefined();
  });
});
