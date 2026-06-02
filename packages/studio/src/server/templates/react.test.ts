import { describe, it, expect } from 'vitest';
import { reactTemplate } from './react';

describe('React Template', () => {
  it('should have correct id and label', () => {
    expect(reactTemplate.id).toBe('react');
    expect(reactTemplate.label).toBe('React');
  });

  it('should generate correct files', () => {
    const files = reactTemplate.generate('TestReact', { width: 1920, height: 1080, fps: 30, duration: 10 });
    expect(files.length).toBe(2);

    const htmlFile = files.find(f => f.path === 'composition.html');
    expect(htmlFile).toBeDefined();
    expect(htmlFile?.content).toContain('<title>TestReact</title>');

    const indexFile = files.find(f => f.path === 'index.tsx');
    expect(indexFile).toBeDefined();
    expect(indexFile?.content).toContain('duration: 10');
    expect(indexFile?.content).toContain('fps: 30');
  });
});
