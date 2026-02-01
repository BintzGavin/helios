import { describe, it, expect, vi, afterEach, beforeAll, afterAll } from 'vitest';
import { Helios } from './Helios.js';

describe('Helios Subscription Timing', () => {
  let originalWindow: any;
  let originalDocument: any;

  beforeAll(() => {
    // Save original globals
    originalWindow = (global as any).window;
    originalDocument = (global as any).document;

    // Mock window if not available (Node environment)
    if (typeof window === 'undefined') {
      (global as any).window = {};
    }

    // Mock document if not available
    if (typeof document === 'undefined') {
        (global as any).document = {};
    }

    // Mock document.timeline
    if (typeof document !== 'undefined' && !document.timeline) {
        Object.defineProperty(document, 'timeline', {
            value: { currentTime: 0 },
            writable: true,
            configurable: true
        });
    }
  });

  afterAll(() => {
    // Restore globals
    if (originalWindow === undefined) {
        delete (global as any).window;
    } else {
        (global as any).window = originalWindow;
    }

    if (originalDocument === undefined) {
        delete (global as any).document;
    } else {
        (global as any).document = originalDocument;
    }
  });

  afterEach(() => {
    // Cleanup window properties
    if (typeof window !== 'undefined') {
      delete (window as any).__HELIOS_VIRTUAL_TIME__;
    }
  });

  it('should fire subscribe callback synchronously after seek()', () => {
    const helios = new Helios({
      fps: 30,
      duration: 10
    });

    let lastFrame = -1;
    const spy = vi.fn((state) => {
      lastFrame = state.currentFrame;
    });

    helios.subscribe(spy);

    expect(spy).toHaveBeenCalledTimes(1); // Initial call
    expect(lastFrame).toBe(0);

    helios.seek(30); // 1 second

    expect(spy).toHaveBeenCalledTimes(2);
    expect(lastFrame).toBe(30);
  });

  it('should fire subscribe callback synchronously after virtual time update', () => {
    const helios = new Helios({
      fps: 30,
      duration: 10
    });

    helios.bindToDocumentTimeline();

    let lastFrame = -1;
    const spy = vi.fn((state) => {
      lastFrame = state.currentFrame;
    });

    helios.subscribe(spy);

    expect(spy).toHaveBeenCalledTimes(1);
    expect(lastFrame).toBe(0);

    // Simulate virtual time update
    const timeInMs = 1000;
    (window as any).__HELIOS_VIRTUAL_TIME__ = timeInMs;

    // The setter in bindToDocumentTimeline should trigger update immediately

    expect(spy).toHaveBeenCalledTimes(2);
    expect(lastFrame).toBe(30); // 1000ms * 30fps / 1000 = 30 frames
  });
});
