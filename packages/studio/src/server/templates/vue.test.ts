import { describe, it, expect } from 'vitest';
import { vueTemplate } from './vue';

describe('Vue Template', () => {
  it('should have correct id and label', () => {
    expect(vueTemplate.id).toBe('vue');
    expect(vueTemplate.label).toBe('Vue');
  });

  it('should generate correct files', () => {
    const files = vueTemplate.generate('TestVue', { width: 1920, height: 1080, fps: 30, duration: 10 });
    expect(files.length).toBe(4);

    expect(files.find(f => f.path === 'composition.html')).toBeDefined();
    expect(files.find(f => f.path === 'main.ts')).toBeDefined();
    expect(files.find(f => f.path === 'App.vue')).toBeDefined();
    expect(files.find(f => f.path === 'composables/useVideoFrame.ts')).toBeDefined();

    const htmlFile = files.find(f => f.path === 'composition.html');
    expect(htmlFile?.content).toContain('<title>TestVue</title>');

    const appFile = files.find(f => f.path === 'App.vue');
    expect(appFile?.content).toContain('duration = 10');
    expect(appFile?.content).toContain('fps = 30');
  });
});
