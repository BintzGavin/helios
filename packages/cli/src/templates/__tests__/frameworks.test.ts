import { describe, it, expect } from 'vitest';
import { REACT_TEMPLATE } from '../react';
import { VUE_TEMPLATE } from '../vue';
import { SVELTE_TEMPLATE } from '../svelte';
import { SOLID_TEMPLATE } from '../solid';
import { VANILLA_TEMPLATE } from '../vanilla';

describe('Framework Templates', () => {
  it('should export REACT_TEMPLATE containing correct properties', () => {
    expect(REACT_TEMPLATE).toBeDefined();
    expect(REACT_TEMPLATE['package.json']).toBeDefined();
    expect(REACT_TEMPLATE['package.json']).toContain('@vitejs/plugin-react');
    expect(() => JSON.parse(REACT_TEMPLATE['package.json'])).not.toThrow();
  });

  it('should export VUE_TEMPLATE containing correct properties', () => {
    expect(VUE_TEMPLATE).toBeDefined();
    expect(VUE_TEMPLATE['package.json']).toBeDefined();
    expect(VUE_TEMPLATE['package.json']).toContain('@vitejs/plugin-vue');
    expect(() => JSON.parse(VUE_TEMPLATE['package.json'])).not.toThrow();
  });

  it('should export SVELTE_TEMPLATE containing correct properties', () => {
    expect(SVELTE_TEMPLATE).toBeDefined();
    expect(SVELTE_TEMPLATE['package.json']).toBeDefined();
    expect(SVELTE_TEMPLATE['package.json']).toContain('@sveltejs/vite-plugin-svelte');
    expect(() => JSON.parse(SVELTE_TEMPLATE['package.json'])).not.toThrow();
  });

  it('should export SOLID_TEMPLATE containing correct properties', () => {
    expect(SOLID_TEMPLATE).toBeDefined();
    expect(SOLID_TEMPLATE['package.json']).toBeDefined();
    expect(SOLID_TEMPLATE['package.json']).toContain('vite-plugin-solid');
    expect(() => JSON.parse(SOLID_TEMPLATE['package.json'])).not.toThrow();
  });

  it('should export VANILLA_TEMPLATE containing correct properties', () => {
    expect(VANILLA_TEMPLATE).toBeDefined();
    expect(VANILLA_TEMPLATE['package.json']).toBeDefined();
    expect(() => JSON.parse(VANILLA_TEMPLATE['package.json'])).not.toThrow();
  });
});
