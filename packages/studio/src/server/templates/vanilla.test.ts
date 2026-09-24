import { describe, it, expect } from 'vitest';
import { vanillaTemplate } from './vanilla';

describe('Vanilla JS Template', () => {
  it('should have correct id and label', () => {
    expect(vanillaTemplate.id).toBe('vanilla');
    expect(vanillaTemplate.label).toBe('Vanilla JS');
  });

  it('should generate correct files', () => {
    const files = vanillaTemplate.generate('TestVanilla', { width: 1920, height: 1080, fps: 30, duration: 10 });
    expect(files.length).toBe(1);

    const htmlFile = files.find(f => f.path === 'composition.html');
    expect(htmlFile).toBeDefined();
    expect(htmlFile?.content).toContain('<title>TestVanilla</title>');
    expect(htmlFile?.content).toContain('duration: 10');
    expect(htmlFile?.content).toContain('fps: 30');
  });
});
