// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DomDriver } from './DomDriver';

describe('DomDriver', () => {
  let driver: DomDriver;
  let scope: HTMLElement;

  beforeEach(() => {
    driver = new DomDriver();
    scope = document.createElement('div');
    driver.init(scope);

    // Mock getAnimations since JSDOM might not implement it fully or we want to control it
    scope.getAnimations = vi.fn().mockReturnValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should sync WAAPI animations', () => {
    const mockAnim = {
      currentTime: 0,
      playState: 'running',
      pause: vi.fn(),
    } as unknown as Animation;

    scope.getAnimations = vi.fn().mockReturnValue([mockAnim]);

    driver.update(1000);

    expect(mockAnim.currentTime).toBe(1000);
    expect(mockAnim.pause).toHaveBeenCalled();
  });

  it('should sync media elements when scrubbing (not playing)', async () => {
    const mockAudio = document.createElement('audio');
    // Mock properties/methods that might not work in JSDOM
    Object.defineProperty(mockAudio, 'duration', { value: 100, writable: true });
    Object.defineProperty(mockAudio, 'currentTime', { value: 0, writable: true });
    Object.defineProperty(mockAudio, 'paused', { value: false, writable: true }); // Simulate playing
    mockAudio.pause = vi.fn();
    mockAudio.play = vi.fn();

    scope.appendChild(mockAudio);
    await new Promise(resolve => setTimeout(resolve, 0));

    driver.update(2000, { isPlaying: false, playbackRate: 1 });

    expect(mockAudio.pause).toHaveBeenCalled();
    expect(mockAudio.currentTime).toBe(2);
  });

  it('should sync media elements when playing', async () => {
    const mockVideo = document.createElement('video');
    Object.defineProperty(mockVideo, 'currentTime', { value: 0, writable: true });
    Object.defineProperty(mockVideo, 'paused', { value: true, writable: true });
    mockVideo.play = vi.fn().mockResolvedValue(undefined);
    mockVideo.pause = vi.fn();

    scope.appendChild(mockVideo);
    await new Promise(resolve => setTimeout(resolve, 0));

    // 0.5s is > 0.25s drift from 0s, so it should seek
    driver.update(500, { isPlaying: true, playbackRate: 1 });

    expect(mockVideo.play).toHaveBeenCalled();
    expect(mockVideo.currentTime).toBe(0.5);
  });

  it('should NOT sync media elements when playing if drift is small', async () => {
    const mockVideo = document.createElement('video');
    Object.defineProperty(mockVideo, 'currentTime', { value: 1.0, writable: true }); // 1.0s
    Object.defineProperty(mockVideo, 'paused', { value: false, writable: true });
    mockVideo.play = vi.fn();

    scope.appendChild(mockVideo);
    await new Promise(resolve => setTimeout(resolve, 0));

    // Update to 1.1s (diff 0.1s < 0.25s tolerance)
    driver.update(1100, { isPlaying: true, playbackRate: 1 });

    expect(mockVideo.currentTime).toBe(1.0); // Should not have changed
  });

  it('should sync playbackRate', async () => {
    const mockAudio = document.createElement('audio');
    mockAudio.play = vi.fn().mockResolvedValue(undefined);
    scope.appendChild(mockAudio);
    await new Promise(resolve => setTimeout(resolve, 0));

    driver.update(0, { isPlaying: true, playbackRate: 2 });

    expect(mockAudio.playbackRate).toBe(2);
  });

  it('should sync volume', async () => {
    const mockAudio = document.createElement('audio');
    Object.defineProperty(mockAudio, 'volume', { value: 1, writable: true });
    scope.appendChild(mockAudio);
    await new Promise(resolve => setTimeout(resolve, 0));

    driver.update(0, { isPlaying: false, playbackRate: 1, volume: 0.5 });

    expect(mockAudio.volume).toBe(0.5);
  });

  it('should sync muted state', async () => {
    const mockAudio = document.createElement('audio');
    Object.defineProperty(mockAudio, 'muted', { value: false, writable: true });
    scope.appendChild(mockAudio);
    await new Promise(resolve => setTimeout(resolve, 0));

    driver.update(0, { isPlaying: false, playbackRate: 1, muted: true });

    expect(mockAudio.muted).toBe(true);
  });

  it('should not update volume if not provided', async () => {
    const mockAudio = document.createElement('audio');
    Object.defineProperty(mockAudio, 'volume', { value: 1, writable: true });
    scope.appendChild(mockAudio);
    await new Promise(resolve => setTimeout(resolve, 0));

    driver.update(0, { isPlaying: false, playbackRate: 1 });

    expect(mockAudio.volume).toBe(1);
  });

  // New Tests for Relative Volume/Mute Logic

  it('should handle relative volume mixing', async () => {
    const mockAudio = document.createElement('audio');
    Object.defineProperty(mockAudio, 'volume', { value: 0.5, writable: true });
    scope.appendChild(mockAudio);
    await new Promise(resolve => setTimeout(resolve, 0));

    // Master volume 0.5 * Base 0.5 = 0.25
    driver.update(0, { isPlaying: false, playbackRate: 1, volume: 0.5 });

    expect(mockAudio.volume).toBe(0.25);
  });

  it('should respect external volume changes', async () => {
    const mockAudio = document.createElement('audio');
    Object.defineProperty(mockAudio, 'volume', { value: 1.0, writable: true });
    scope.appendChild(mockAudio);
    await new Promise(resolve => setTimeout(resolve, 0));

    // Initial update: master 1.0 -> effective 1.0
    driver.update(0, { isPlaying: false, playbackRate: 1, volume: 1.0 });
    expect(mockAudio.volume).toBe(1.0);

    // User changes volume to 0.8 externally
    mockAudio.volume = 0.8;

    // Next update: master 0.5 -> effective 0.4 (assuming base became 0.8)
    driver.update(0, { isPlaying: false, playbackRate: 1, volume: 0.5 });

    expect(mockAudio.volume).toBe(0.4);
  });

  it('should handle relative mute logic', async () => {
     const mockAudio = document.createElement('audio');
     Object.defineProperty(mockAudio, 'muted', { value: false, writable: true }); // Unmuted
     scope.appendChild(mockAudio);
     await new Promise(resolve => setTimeout(resolve, 0));

     // Master muted
     driver.update(0, { isPlaying: false, playbackRate: 1, muted: true });
     expect(mockAudio.muted).toBe(true);

     // Master unmuted
     driver.update(0, { isPlaying: false, playbackRate: 1, muted: false });
     expect(mockAudio.muted).toBe(false); // Should return to base (false)
  });

  it('should respect external mute changes', async () => {
     const mockAudio = document.createElement('audio');
     Object.defineProperty(mockAudio, 'muted', { value: false, writable: true });
     scope.appendChild(mockAudio);
     await new Promise(resolve => setTimeout(resolve, 0));

     // Master unmuted
     driver.update(0, { isPlaying: false, playbackRate: 1, muted: false });
     expect(mockAudio.muted).toBe(false);

     // User manually mutes
     mockAudio.muted = true;

     // Master still unmuted
     driver.update(0, { isPlaying: false, playbackRate: 1, muted: false });

     // Should stay muted (user override)
     expect(mockAudio.muted).toBe(true);
  });

  it('should preserve element mute state when master is toggled', async () => {
     const mockAudio = document.createElement('audio');
     Object.defineProperty(mockAudio, 'muted', { value: true, writable: true }); // Muted by default
     scope.appendChild(mockAudio);
     await new Promise(resolve => setTimeout(resolve, 0));

     // Master unmuted
     driver.update(0, { isPlaying: false, playbackRate: 1, muted: false });
     expect(mockAudio.muted).toBe(true); // Should stay muted

     // Master muted
     driver.update(0, { isPlaying: false, playbackRate: 1, muted: true });
     expect(mockAudio.muted).toBe(true);

     // Master unmuted again
     driver.update(0, { isPlaying: false, playbackRate: 1, muted: false });
     expect(mockAudio.muted).toBe(true); // Should return to base (true)
  });

  // MutationObserver Tests
  it('should detect added media elements', async () => {
    const mockAudio = document.createElement('audio');
    Object.defineProperty(mockAudio, 'volume', { value: 1, writable: true });
    scope.appendChild(mockAudio);

    // Wait for observer
    await new Promise(resolve => setTimeout(resolve, 20));

    // Update with volume 0.5
    driver.update(0, { isPlaying: false, playbackRate: 1, volume: 0.5 });

    expect(mockAudio.volume).toBe(0.5);
  });

  it('should detect removed media elements', async () => {
     const mockAudio = document.createElement('audio');
     Object.defineProperty(mockAudio, 'volume', { value: 1, writable: true });
     scope.appendChild(mockAudio);

     await new Promise(resolve => setTimeout(resolve, 20));

     driver.update(0, { isPlaying: false, playbackRate: 1, volume: 0.5 });
     expect(mockAudio.volume).toBe(0.5);

     scope.removeChild(mockAudio);
     await new Promise(resolve => setTimeout(resolve, 20));

     // Update with volume 1.0. The removed element should NOT be touched.
     driver.update(0, { isPlaying: false, playbackRate: 1, volume: 1.0 });

     expect(mockAudio.volume).toBe(0.5);
  });

  it('should detect nested media elements', async () => {
      const container = document.createElement('div');
      const mockVideo = document.createElement('video');
      Object.defineProperty(mockVideo, 'volume', { value: 1, writable: true });
      container.appendChild(mockVideo);

      scope.appendChild(container);

      await new Promise(resolve => setTimeout(resolve, 20));

      driver.update(0, { isPlaying: false, playbackRate: 1, volume: 0.5 });

      expect(mockVideo.volume).toBe(0.5);
  });

  it('should dispose observer and clear elements', async () => {
      const mockAudio = document.createElement('audio');
      Object.defineProperty(mockAudio, 'volume', { value: 1, writable: true });
      scope.appendChild(mockAudio);
      await new Promise(resolve => setTimeout(resolve, 20));

      driver.dispose();

      // Add another element - should NOT be detected
      const newAudio = document.createElement('audio');
      Object.defineProperty(newAudio, 'volume', { value: 1, writable: true });
      scope.appendChild(newAudio);
      await new Promise(resolve => setTimeout(resolve, 20));

      driver.update(0, { isPlaying: false, playbackRate: 1, volume: 0.5 });

      // Assuming original volume was 1
      expect(mockAudio.volume).toBe(1);
      expect(newAudio.volume).toBe(1);
  });

  describe('waitUntilStable', () => {
    beforeEach(() => {
      // Mock document.fonts
      // @ts-ignore
      document.fonts = {
        ready: Promise.resolve() as any,
      };
    });

    afterEach(() => {
      // @ts-ignore
      delete document.fonts;
    });

    it('should resolve immediately if no media', async () => {
      await expect(driver.waitUntilStable()).resolves.toBeUndefined();
    });

    it('should wait for media elements to be ready (seeked)', async () => {
      const mockVideo = document.createElement('video');
      Object.defineProperty(mockVideo, 'seeking', { value: true, writable: true });
      Object.defineProperty(mockVideo, 'readyState', { value: 1, writable: true }); // HAVE_METADATA

      // Add event listeners support
      const listeners: Record<string, Function[]> = {};
      mockVideo.addEventListener = vi.fn((event, callback) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(callback as Function);
      });
      mockVideo.removeEventListener = vi.fn((event, callback) => {
        if (!listeners[event]) return;
        listeners[event] = listeners[event].filter((cb) => cb !== callback);
      });

      scope.appendChild(mockVideo);
      await new Promise((resolve) => setTimeout(resolve, 20)); // Let observer pick it up

      const promise = driver.waitUntilStable();
      let resolved = false;
      promise.then(() => {
        resolved = true;
      });

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(resolved).toBe(false);

      // Simulate seeked
      Object.defineProperty(mockVideo, 'seeking', { value: false });
      Object.defineProperty(mockVideo, 'readyState', { value: 2 }); // HAVE_CURRENT_DATA
      listeners['seeked']?.forEach((cb) => cb());

      await promise;
      expect(resolved).toBe(true);
    });

    it('should wait for media elements to be ready (canplay)', async () => {
      const mockVideo = document.createElement('video');
      Object.defineProperty(mockVideo, 'seeking', { value: false, writable: true });
      Object.defineProperty(mockVideo, 'readyState', { value: 0, writable: true }); // HAVE_NOTHING

      // Add event listeners support
      const listeners: Record<string, Function[]> = {};
      mockVideo.addEventListener = vi.fn((event, callback) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(callback as Function);
      });
      mockVideo.removeEventListener = vi.fn((event, callback) => {
        if (!listeners[event]) return;
        listeners[event] = listeners[event].filter((cb) => cb !== callback);
      });

      scope.appendChild(mockVideo);
      await new Promise((resolve) => setTimeout(resolve, 20)); // Let observer pick it up

      const promise = driver.waitUntilStable();
      let resolved = false;
      promise.then(() => {
        resolved = true;
      });

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(resolved).toBe(false);

      // Simulate canplay
      Object.defineProperty(mockVideo, 'readyState', { value: 2 }); // HAVE_CURRENT_DATA
      listeners['canplay']?.forEach((cb) => cb());

      await promise;
      expect(resolved).toBe(true);
    });

    it('should resolve if image decoding fails', async () => {
      const mockImg = document.createElement('img');
      Object.defineProperty(mockImg, 'complete', { value: false });
      mockImg.decode = vi.fn().mockRejectedValue(new Error('Decode failed'));

      // Mock querySelectorAll for images on scope
      scope.querySelectorAll = vi.fn((selector) => {
        if (selector === 'img') return [mockImg] as any;
        return [] as any;
      });

      const promise = driver.waitUntilStable();
      await expect(promise).resolves.toBeUndefined();
    });
  });
});
