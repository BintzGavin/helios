// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Helios } from './Helios.js';

describe('Helios GSAP Sync (Virtual Time)', () => {
  let helios: Helios;

  beforeEach(() => {
    // Mock document.timeline for JSDOM
    if (typeof document !== 'undefined') {
      if (!document.timeline) {
        (document as any).timeline = { currentTime: 0 };
      }
    }

    // Clean up window properties
    if (typeof window !== 'undefined') {
      // We need to be careful not to delete the property if it was defined with defineProperty
      // because 'delete' might not work or throw in strict mode if configurable: false.
      // But Helios sets it as configurable: true.
      delete (window as any).__HELIOS_VIRTUAL_TIME__;
    }
  });

  afterEach(() => {
    if (helios) {
      helios.dispose();
    }
    // Clean up again
    if (typeof window !== 'undefined') {
      delete (window as any).__HELIOS_VIRTUAL_TIME__;
    }
  });

  it('should fire subscribe synchronously when virtual time is set', () => {
    helios = new Helios({
      fps: 30,
      duration: 10,
    });

    let lastFrame = -1;
    let callCount = 0;

    helios.subscribe((state) => {
      lastFrame = state.currentFrame;
      callCount++;
    });

    helios.bindToDocumentTimeline();

    // Initial state (frame 0)
    expect(lastFrame).toBe(0);
    expect(callCount).toBe(1);

    // Simulate SeekTimeDriver setting time to 1.0s (frame 30)
    const virtualTime = 1000;
    (window as any).__HELIOS_VIRTUAL_TIME__ = virtualTime;

    // Should fire synchronously
    expect(lastFrame).toBe(30);
    expect(callCount).toBe(2);
  });

  it('should fire subscribe synchronously for LATE binding', () => {
    // Scenario: Renderer sets time BEFORE Helios binds
    const virtualTime = 2000; // 2.0s = frame 60
    (window as any).__HELIOS_VIRTUAL_TIME__ = virtualTime;

    helios = new Helios({
      fps: 30,
      duration: 10,
    });

    let lastFrame = -1;
    let callCount = 0;

    helios.subscribe((state) => {
      lastFrame = state.currentFrame;
      callCount++;
    });

    // Before binding, it should be at initial frame (0)
    expect(lastFrame).toBe(0);
    expect(callCount).toBe(1);

    // Bind
    helios.bindToDocumentTimeline();

    // Should immediately pick up the existing virtual time
    expect(lastFrame).toBe(60);
    expect(callCount).toBe(2);
  });

  it('should fire subscribe even when setting SAME time (Force Sync)', () => {
    helios = new Helios({
      fps: 30,
      duration: 10,
    });

    let callCount = 0;
    helios.subscribe(() => {
      callCount++;
    });

    helios.bindToDocumentTimeline();
    // callCount = 1 (initial)

    const virtualTime = 1000;
    (window as any).__HELIOS_VIRTUAL_TIME__ = virtualTime;
    // callCount = 2

    expect(callCount).toBe(2);

    // Set same time again
    (window as any).__HELIOS_VIRTUAL_TIME__ = virtualTime;
    // callCount = 3 (should be forced)

    expect(callCount).toBe(3);
  });
});
