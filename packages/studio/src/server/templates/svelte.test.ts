import { describe, it, expect } from 'vitest';
import { svelteTemplate } from './svelte';

describe('Svelte Template', () => {
  it('should have correct id and label', () => {
    expect(svelteTemplate.id).toBe('svelte');
    expect(svelteTemplate.label).toBe('Svelte');
  });

  it('should generate correct files', () => {
    const files = svelteTemplate.generate('TestSvelte', { width: 1920, height: 1080, fps: 30, duration: 10 });
    expect(files.length).toBe(4);

    expect(files.find(f => f.path === 'composition.html')).toBeDefined();
    expect(files.find(f => f.path === 'main.ts')).toBeDefined();
    expect(files.find(f => f.path === 'App.svelte')).toBeDefined();
    expect(files.find(f => f.path === 'lib/store.ts')).toBeDefined();

    const htmlFile = files.find(f => f.path === 'composition.html');
    expect(htmlFile?.content).toContain('<title>TestSvelte</title>');

    const appFile = files.find(f => f.path === 'App.svelte');
    expect(appFile?.content).toContain('const duration = 10');
    expect(appFile?.content).toContain('const fps = 30');
  });
});
