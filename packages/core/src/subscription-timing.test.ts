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

  it('should fire subscribers synchronously for multiple rapid updates', () => {
    const helios = new Helios({
      fps: 30,
      duration: 10
    });

    helios.bindToDocumentTimeline();

    const frames: number[] = [];
    helios.subscribe((state) => {
      frames.push(state.currentFrame);
    });

    // Initial call
    expect(frames).toEqual([0]);

    // Update 1
    (window as any).__HELIOS_VIRTUAL_TIME__ = 1000;
    // Update 2
    (window as any).__HELIOS_VIRTUAL_TIME__ = 2000;
    // Update 3
    (window as any).__HELIOS_VIRTUAL_TIME__ = 3000;

    expect(frames).toEqual([0, 30, 60, 90]);
  });

  it('should block waitUntilStable until virtual time is synced (polling fallback)', async () => {
    const helios = new Helios({
      fps: 30,
      duration: 10
    });

    // Mock defineProperty to fail, forcing polling fallback
    const originalDefineProperty = Object.defineProperty;
    Object.defineProperty = vi.fn(() => { throw new Error('Mock error'); });

    // Mock rAF queue
    const originalRaf = (global as any).requestAnimationFrame;
    const rafQueue: (() => void)[] = [];
    const mockRaf = (cb: any) => {
      rafQueue.push(cb);
      return 1;
    };
    (global as any).requestAnimationFrame = mockRaf;
    if (typeof window !== 'undefined') {
        (window as any).requestAnimationFrame = mockRaf;
    }

    const flushRaf = () => {
        const queue = [...rafQueue];
        rafQueue.length = 0;
        queue.forEach(cb => cb());
    };

    helios.bindToDocumentTimeline();

    // Restore defineProperty
    Object.defineProperty = originalDefineProperty;

    // Set virtual time
    (window as any).__HELIOS_VIRTUAL_TIME__ = 1000;

    // Verify currentFrame hasn't updated yet (because polling hasn't run)
    expect(helios.currentFrame.peek()).toBe(0);

    // Call waitUntilStable - should not resolve yet
    let resolved = false;
    const promise = helios.waitUntilStable().then(() => { resolved = true; });

    // Wait a bit
    await new Promise(r => setTimeout(r, 10));
    expect(resolved).toBe(false);

    // Flush rAF to run polling loop and start checkSync loop
    flushRaf();

    // Helios poll loop should update currentFrame
    expect(helios.currentFrame.peek()).toBe(30);

    // Flush again to allow checkSync to verify and resolve
    flushRaf();

    // We need to wait for promise to resolve
    await promise;
    expect(resolved).toBe(true);

    // Cleanup
    if (originalRaf) {
        (global as any).requestAnimationFrame = originalRaf;
    } else {
        delete (global as any).requestAnimationFrame;
    }
  });

  it('should force subscription update on bind if virtual time is present', () => {
    // Simulate SeekTimeDriver setting virtual time BEFORE bind
    (window as any).__HELIOS_VIRTUAL_TIME__ = 0;

    const helios = new Helios({ fps: 30, duration: 10 });
    const frames: number[] = [];
    helios.subscribe((state) => frames.push(state.currentFrame));

    // Initial state
    expect(frames).toEqual([0]);

    helios.bindToDocumentTimeline();

    // Expect forced update (duplicate 0), ensuring subscribers run and sync
    expect(frames).toEqual([0, 0]);
  });
});
