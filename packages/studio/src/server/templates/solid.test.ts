import { describe, it, expect } from 'vitest';
import { solidTemplate } from './solid';

describe('Solid Template', () => {
  it('should have correct id and label', () => {
    expect(solidTemplate.id).toBe('solid');
    expect(solidTemplate.label).toBe('Solid');
  });

  it('should generate correct files', () => {
    const files = solidTemplate.generate('TestSolid', { width: 1920, height: 1080, fps: 30, duration: 10 });
    expect(files.length).toBe(5);

    expect(files.find(f => f.path === 'composition.html')).toBeDefined();
    expect(files.find(f => f.path === 'main.tsx')).toBeDefined();
    expect(files.find(f => f.path === 'App.tsx')).toBeDefined();
    expect(files.find(f => f.path === 'style.css')).toBeDefined();
    expect(files.find(f => f.path === 'lib/createHeliosSignal.ts')).toBeDefined();

    const htmlFile = files.find(f => f.path === 'composition.html');
    expect(htmlFile?.content).toContain('<title>TestSolid</title>');

    const mainFile = files.find(f => f.path === 'main.tsx');
    expect(mainFile?.content).toContain('const duration = 10');
    expect(mainFile?.content).toContain('const fps = 30');
  });
});
