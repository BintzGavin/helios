// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { Helios } from './index';

describe('Helios - Node Runtime Support', () => {
  it('should initialize without crashing in Node environment', () => {
    expect(typeof requestAnimationFrame).toBe('undefined');

    const helios = new Helios({
      duration: 5,
      fps: 30
    });

    expect(helios).toBeDefined();
    expect(helios.fps).toBe(30);
  });

  it('should play using TimeoutTicker in Node environment', async () => {
    expect(typeof requestAnimationFrame).toBe('undefined');

    const helios = new Helios({
      duration: 5,
      fps: 30
    });

    helios.play();

    // Wait a bit for the ticker to run
    await new Promise(resolve => setTimeout(resolve, 100));

    const frame = helios.currentFrame.value;
    expect(frame).toBeGreaterThan(0);
    expect(helios.isPlaying.value).toBe(true);

    helios.pause();
    expect(helios.isPlaying.value).toBe(false);
  });
});
