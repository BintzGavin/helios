import { describe, it, expect } from 'vitest';
import { Helios } from './Helios.js';

describe('Helios Worker Runtime', () => {
  it('should initialize without DOM access', () => {
    // Ensure document is undefined (Vitest default is node, but let's be sure)
    expect(typeof document).toBe('undefined');

    const helios = new Helios({
      fps: 30,
      duration: 10,
      width: 1920,
      height: 1080
    });

    expect(helios).toBeDefined();
    expect(helios.duration.value).toBe(10);
    expect(helios.fps.value).toBe(30);
  });

  it('should support seek operations without DOM', () => {
    const helios = new Helios({
      fps: 30,
      duration: 10
    });

    helios.seek(15); // Frame 15 (0.5s)
    expect(helios.currentFrame.value).toBe(15);
    expect(helios.currentTime.value).toBe(0.5);
  });

  it('should diagnose environment correctly', async () => {
    const diagnosis = await Helios.diagnose();
    // Vitest (Node) environment might set navigator.userAgent
    expect(diagnosis.userAgent).toMatch(/Node/);
    expect(diagnosis.waapi).toBe(false);
  });
});
