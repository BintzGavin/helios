import { describe, it, expect } from 'vitest';
import { threejsTemplate } from './threejs';

describe('Three.js Template', () => {
  it('should have correct id and label', () => {
    expect(threejsTemplate.id).toBe('threejs');
    expect(threejsTemplate.label).toBe('Three.js');
  });

  it('should generate correct files', () => {
    const files = threejsTemplate.generate('TestThreeJS', { width: 1920, height: 1080, fps: 30, duration: 10 });
    expect(files.length).toBe(1);

    const htmlFile = files.find(f => f.path === 'composition.html');
    expect(htmlFile).toBeDefined();
    expect(htmlFile?.content).toContain('<title>TestThreeJS</title>');
    expect(htmlFile?.content).toContain('duration: 10');
    expect(htmlFile?.content).toContain('fps: 30');
  });
});
