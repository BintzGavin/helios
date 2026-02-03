import { describe, it, expect, vi, afterEach, beforeAll, afterAll } from 'vitest';
import { Helios } from './Helios.js';

describe('Helios Virtual Time Binding', () => {
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

  it('should return false for isVirtualTimeBound by default', () => {
    const helios = new Helios({ fps: 30, duration: 10 });
    expect(helios.isVirtualTimeBound).toBe(false);
  });

  it('should return true after successful bindToDocumentTimeline', () => {
    const helios = new Helios({ fps: 30, duration: 10 });
    helios.bindToDocumentTimeline();
    expect(helios.isVirtualTimeBound).toBe(true);
    helios.unbindFromDocumentTimeline();
  });

  it('should return false after unbindFromDocumentTimeline', () => {
    const helios = new Helios({ fps: 30, duration: 10 });
    helios.bindToDocumentTimeline();
    expect(helios.isVirtualTimeBound).toBe(true);

    helios.unbindFromDocumentTimeline();
    expect(helios.isVirtualTimeBound).toBe(false);
  });

  it('should return false if bindToDocumentTimeline falls back to polling', () => {
    const helios = new Helios({ fps: 30, duration: 10 });

    // Mock Object.defineProperty to throw an error
    const originalDefineProperty = Object.defineProperty;
    Object.defineProperty = vi.fn(() => {
      throw new Error('Mock error');
    });

    try {
      helios.bindToDocumentTimeline();
      expect(helios.isVirtualTimeBound).toBe(false);
    } finally {
      Object.defineProperty = originalDefineProperty;
    }
  });
});
