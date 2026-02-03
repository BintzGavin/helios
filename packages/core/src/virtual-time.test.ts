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

  it('should synchronize multiple instances with virtual time', () => {
    const helios1 = new Helios({ fps: 30, duration: 10 });
    const helios2 = new Helios({ fps: 60, duration: 10 });

    helios1.bindToDocumentTimeline();
    helios2.bindToDocumentTimeline();

    expect(helios1.isVirtualTimeBound).toBe(true);
    expect(helios2.isVirtualTimeBound).toBe(true);

    // Update virtual time (1 second)
    (window as any).__HELIOS_VIRTUAL_TIME__ = 1000;

    expect(helios1.currentTime.value).toBe(1);
    expect(helios2.currentTime.value).toBe(1);
    expect(helios1.currentFrame.value).toBe(30);
    expect(helios2.currentFrame.value).toBe(60);

    // Unbind one
    helios1.unbindFromDocumentTimeline();
    expect(helios1.isVirtualTimeBound).toBe(false);
    expect(helios2.isVirtualTimeBound).toBe(true);

    // Update virtual time again (2 seconds)
    (window as any).__HELIOS_VIRTUAL_TIME__ = 2000;

    // Helios1 should not update (unbound)
    expect(helios1.currentTime.value).toBe(1);
    // Helios2 should update
    expect(helios2.currentTime.value).toBe(2);

    // Unbind second
    helios2.unbindFromDocumentTimeline();
    expect(helios2.isVirtualTimeBound).toBe(false);

    // Check cleanup
    // We expect the property to be deleted or restored.
    // In our test setup, it might be undefined or the original descriptor if present.
    // Since we delete it in afterEach, we just check that setting it doesn't trigger anything.
    // But conceptually, the descriptor should be gone or restored.

    // In our implementation, unbindFromDocumentTimeline checks if registry is empty then tears down.
    // So the property should be gone or reset.
  });
});
