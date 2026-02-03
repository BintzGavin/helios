import { describe, it, expect, vi, afterEach, beforeAll, afterAll } from 'vitest';
import { Helios } from './Helios.js';

describe('Helios GSAP Sync Reproduction', () => {
  let originalWindow: any;
  let originalDocument: any;

  beforeAll(() => {
    originalWindow = (global as any).window;
    originalDocument = (global as any).document;

    if (typeof window === 'undefined') {
      (global as any).window = {};
    }
    if (typeof document === 'undefined') {
        (global as any).document = {};
    }
    if (typeof document !== 'undefined' && !document.timeline) {
        Object.defineProperty(document, 'timeline', {
            value: { currentTime: 0 },
            writable: true,
            configurable: true
        });
    }
  });

  afterAll(() => {
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
    if (typeof window !== 'undefined') {
      delete (window as any).__HELIOS_VIRTUAL_TIME__;
    }
  });

  it('should fire synchronous updates for rapid virtual time changes', () => {
    const helios = new Helios({ fps: 30, duration: 10 });
    helios.bindToDocumentTimeline();

    expect(helios.isVirtualTimeBound).toBe(true);

    const updates: number[] = [];
    helios.subscribe((state) => {
      updates.push(state.currentFrame);
    });

    // Reset updates (initial state)
    updates.length = 0;

    // Simulate rapid updates (like a render loop)
    const times = [0, 1000, 2000, 2001, 2002, 3000];

    times.forEach(t => {
      (window as any).__HELIOS_VIRTUAL_TIME__ = t;
    });

    // 0ms -> frame 0
    // 1000ms -> frame 30
    // 2000ms -> frame 60
    // 2001ms -> frame 60.03 (approx) -> should trigger update
    // 2002ms -> frame 60.06 (approx) -> should trigger update
    // 3000ms -> frame 90

    // Check if updates match times length
    expect(updates.length).toBe(times.length);

    expect(updates[0]).toBe(0);
    expect(updates[1]).toBe(30);
    expect(updates[2]).toBe(60);
    expect(updates[5]).toBe(90);
  });

  it('should fire synchronous updates even for duplicate frames (forced sync)', () => {
    const helios = new Helios({ fps: 30, duration: 10 });
    helios.bindToDocumentTimeline();

    const updates: number[] = [];
    helios.subscribe((state) => {
      updates.push(state.currentFrame);
    });

    updates.length = 0;

    // Set duplicate time/frame
    (window as any).__HELIOS_VIRTUAL_TIME__ = 1000;
    (window as any).__HELIOS_VIRTUAL_TIME__ = 1000;
    (window as any).__HELIOS_VIRTUAL_TIME__ = 1000;

    // Should fire 3 times because _syncVersion increments
    expect(updates.length).toBe(3);
    expect(updates).toEqual([30, 30, 30]);
  });

  it('should handle initial virtual time capture correctly', () => {
    // Simulate pre-existing virtual time
    (window as any).__HELIOS_VIRTUAL_TIME__ = 5000;

    const helios = new Helios({ fps: 30, duration: 10 });

    // Subscribe BEFORE binding
    const updates: number[] = [];
    helios.subscribe((state) => updates.push(state.currentFrame));

    expect(updates[0]).toBe(0); // Initial

    helios.bindToDocumentTimeline();

    // Should trigger update to 150 (5000ms * 30fps / 1000)
    expect(updates.length).toBe(2);
    expect(updates[1]).toBe(150);
  });
});
