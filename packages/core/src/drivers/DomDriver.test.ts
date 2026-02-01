// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DomDriver } from './DomDriver.js';

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

  describe('Media Offset and Seek', () => {
    it('should respect data-helios-offset', async () => {
      const mockVideo = document.createElement('video');
      mockVideo.setAttribute('data-helios-offset', '2'); // Starts at 2s
      Object.defineProperty(mockVideo, 'currentTime', { value: 0, writable: true });

      // Smart mock for paused state
      let isPaused = true;
      Object.defineProperty(mockVideo, 'paused', { get: () => isPaused });

      mockVideo.play = vi.fn().mockImplementation(async () => { isPaused = false; });
      mockVideo.pause = vi.fn().mockImplementation(() => { isPaused = true; });

      scope.appendChild(mockVideo);
      await new Promise(resolve => setTimeout(resolve, 20));

      // START PLAYING
      // We start in a paused state.
      // Time 1s: < offset 2s. Should force pause (or ensure it stays paused).
      // Since it is already paused, pause() might NOT be called depending on implementation optimization.
      // But we verify it does NOT play.
      driver.update(1000, { isPlaying: true, playbackRate: 1 });
      expect(mockVideo.play).not.toHaveBeenCalled();
      expect(mockVideo.currentTime).toBe(0);

      // Verify it is indeed paused
      expect(mockVideo.paused).toBe(true);

      // Time 3s: > offset 2s. Effective time = 3 - 2 = 1s.
      driver.update(3000, { isPlaying: true, playbackRate: 1 });
      expect(mockVideo.play).toHaveBeenCalled();
      expect(mockVideo.currentTime).toBe(1);
      expect(mockVideo.paused).toBe(false);
    });

    it('should respect data-helios-seek', async () => {
      const mockVideo = document.createElement('video');
      mockVideo.setAttribute('data-helios-seek', '5'); // Starts from 5s mark
      Object.defineProperty(mockVideo, 'currentTime', { value: 0, writable: true });
      Object.defineProperty(mockVideo, 'paused', { value: true, writable: true });
      mockVideo.play = vi.fn().mockResolvedValue(undefined);
      mockVideo.pause = vi.fn();

      scope.appendChild(mockVideo);
      await new Promise(resolve => setTimeout(resolve, 20));

      // Time 1s. Effective time = 1 + 5 = 6s.
      driver.update(1000, { isPlaying: true, playbackRate: 1 });
      expect(mockVideo.play).toHaveBeenCalled();
      expect(mockVideo.currentTime).toBe(6);
    });

    it('should respect both offset and seek', async () => {
      const mockVideo = document.createElement('video');
      mockVideo.setAttribute('data-helios-offset', '2'); // Start at 2s
      mockVideo.setAttribute('data-helios-seek', '10'); // Skip first 10s of source
      Object.defineProperty(mockVideo, 'currentTime', { value: 0, writable: true });

      // Smart mock
      let isPaused = true;
      Object.defineProperty(mockVideo, 'paused', { get: () => isPaused });
      mockVideo.play = vi.fn().mockImplementation(async () => { isPaused = false; });
      mockVideo.pause = vi.fn().mockImplementation(() => { isPaused = true; });

      scope.appendChild(mockVideo);
      await new Promise(resolve => setTimeout(resolve, 20));

      // Time 1s (< 2s). Should be paused at seek time (10s).
      driver.update(1000, { isPlaying: true, playbackRate: 1 });
      expect(mockVideo.play).not.toHaveBeenCalled();
      expect(mockVideo.currentTime).toBe(10);
      expect(mockVideo.paused).toBe(true);

      // Time 4s (> 2s). Effective = 4 - 2 + 10 = 12s.
      driver.update(4000, { isPlaying: true, playbackRate: 1 });
      expect(mockVideo.play).toHaveBeenCalled();
      expect(mockVideo.currentTime).toBe(12);
      expect(mockVideo.paused).toBe(false);
    });
  });

  describe('Shadow DOM Support', () => {
    it('should sync animations inside Shadow DOM', async () => {
      const host = document.createElement('div');
      scope.appendChild(host);

      const shadow = host.attachShadow({ mode: 'open' });
      const innerDiv = document.createElement('div');
      shadow.appendChild(innerDiv);

      const mockAnim = {
        currentTime: 0,
        playState: 'running',
        pause: vi.fn(),
      } as unknown as Animation;

      // JSDOM might not put getAnimations on ShadowRoot by default or implement it fully
      // so we mock it.
      (shadow as any).getAnimations = vi.fn().mockReturnValue([mockAnim]);

      // Trigger mutation observer (async)
      await new Promise(resolve => setTimeout(resolve, 20));

      driver.update(1500);

      expect((shadow as any).getAnimations).toHaveBeenCalled();
      expect(mockAnim.currentTime).toBe(1500);
      expect(mockAnim.pause).toHaveBeenCalled();
    });

    it('should discover media elements inside Shadow DOM', async () => {
      const host = document.createElement('div');
      scope.appendChild(host);

      const shadow = host.attachShadow({ mode: 'open' });
      const mockVideo = document.createElement('video');
      Object.defineProperty(mockVideo, 'currentTime', { value: 0, writable: true });
      Object.defineProperty(mockVideo, 'paused', { value: true, writable: true });
      mockVideo.play = vi.fn().mockResolvedValue(undefined);
      mockVideo.pause = vi.fn();

      shadow.appendChild(mockVideo);

      // Wait for observer
      await new Promise(resolve => setTimeout(resolve, 20));

      // Update
      driver.update(2000, { isPlaying: true, playbackRate: 1 });

      expect(mockVideo.play).toHaveBeenCalled();
      expect(mockVideo.currentTime).toBe(2);
    });

    it('should recursively discover nested Shadow DOMs', async () => {
        const host1 = document.createElement('div');
        scope.appendChild(host1);
        const shadow1 = host1.attachShadow({ mode: 'open' });

        const host2 = document.createElement('div');
        shadow1.appendChild(host2);
        const shadow2 = host2.attachShadow({ mode: 'open' });

        const mockVideo = document.createElement('video');
        Object.defineProperty(mockVideo, 'currentTime', { value: 0, writable: true });
        Object.defineProperty(mockVideo, 'paused', { value: true, writable: true });
        mockVideo.play = vi.fn().mockResolvedValue(undefined);
        mockVideo.pause = vi.fn();

        shadow2.appendChild(mockVideo);

        await new Promise(resolve => setTimeout(resolve, 20));

        driver.update(3000, { isPlaying: true, playbackRate: 1 });

        expect(mockVideo.play).toHaveBeenCalled();
        expect(mockVideo.currentTime).toBe(3);
    });

    it('should detect dynamic additions inside Shadow DOM', async () => {
        const host = document.createElement('div');
        scope.appendChild(host);
        const shadow = host.attachShadow({ mode: 'open' });

        // Wait for host detection
        await new Promise(resolve => setTimeout(resolve, 20));

        // Now append video to shadow
        const mockVideo = document.createElement('video');
        Object.defineProperty(mockVideo, 'volume', { value: 1, writable: true });
        shadow.appendChild(mockVideo);

        // Wait for shadow detection (MutationObserver on shadow root)
        await new Promise(resolve => setTimeout(resolve, 20));

        driver.update(0, { isPlaying: false, playbackRate: 1, volume: 0.5 });

        expect(mockVideo.volume).toBe(0.5);
    });
  });

  describe('Audio Tracks', () => {
    it('should apply track volume from data-helios-track-id', async () => {
      const mockAudio = document.createElement('audio');
      Object.defineProperty(mockAudio, 'volume', { value: 1, writable: true });
      mockAudio.setAttribute('data-helios-track-id', 'bgm');
      scope.appendChild(mockAudio);
      await new Promise(resolve => setTimeout(resolve, 20));

      driver.update(0, {
        isPlaying: false, playbackRate: 1, volume: 1,
        audioTracks: {
          'bgm': { volume: 0.5, muted: false }
        }
      });

      expect(mockAudio.volume).toBe(0.5);
    });

    it('should mix master volume and track volume', async () => {
      const mockAudio = document.createElement('audio');
      Object.defineProperty(mockAudio, 'volume', { value: 1, writable: true });
      mockAudio.setAttribute('data-helios-track-id', 'voice');
      scope.appendChild(mockAudio);
      await new Promise(resolve => setTimeout(resolve, 20));

      // Master 0.5 * Track 0.5 = 0.25
      driver.update(0, {
        isPlaying: false, playbackRate: 1, volume: 0.5,
        audioTracks: {
          'voice': { volume: 0.5, muted: false }
        }
      });

      expect(mockAudio.volume).toBe(0.25);
    });

    it('should apply track mute from data-helios-track-id', async () => {
      const mockAudio = document.createElement('audio');
      Object.defineProperty(mockAudio, 'muted', { value: false, writable: true });
      mockAudio.setAttribute('data-helios-track-id', 'sfx');
      scope.appendChild(mockAudio);
      await new Promise(resolve => setTimeout(resolve, 20));

      driver.update(0, {
        isPlaying: false, playbackRate: 1,
        audioTracks: {
          'sfx': { volume: 1, muted: true }
        }
      });

      expect(mockAudio.muted).toBe(true);
    });

    it('should NOT affect elements without track ID', async () => {
      const mockAudio = document.createElement('audio');
      Object.defineProperty(mockAudio, 'volume', { value: 1, writable: true });
      scope.appendChild(mockAudio);
      await new Promise(resolve => setTimeout(resolve, 20));

      driver.update(0, {
        isPlaying: false, playbackRate: 1, volume: 1,
        audioTracks: {
          'bgm': { volume: 0.1, muted: true }
        }
      });

      expect(mockAudio.volume).toBe(1);
    });
  });

  describe('Audio Fading', () => {
    it('should fade in audio', async () => {
      const mockAudio = document.createElement('audio');
      Object.defineProperty(mockAudio, 'volume', { value: 1, writable: true });
      mockAudio.setAttribute('data-helios-fade-in', '2'); // 2s fade in
      scope.appendChild(mockAudio);
      await new Promise(resolve => setTimeout(resolve, 20));

      // 0s: Should be 0 volume
      driver.update(0, { isPlaying: false, playbackRate: 1, volume: 1 });
      expect(mockAudio.volume).toBe(0);

      // 1s: Should be 0.5 volume
      driver.update(1000, { isPlaying: false, playbackRate: 1, volume: 1 });
      expect(mockAudio.volume).toBe(0.5);

      // 2s: Should be 1 volume
      driver.update(2000, { isPlaying: false, playbackRate: 1, volume: 1 });
      expect(mockAudio.volume).toBe(1);

      // 3s: Should be 1 volume
      driver.update(3000, { isPlaying: false, playbackRate: 1, volume: 1 });
      expect(mockAudio.volume).toBe(1);
    });

    it('should fade out audio', async () => {
      const mockAudio = document.createElement('audio');
      Object.defineProperty(mockAudio, 'volume', { value: 1, writable: true });
      Object.defineProperty(mockAudio, 'duration', { value: 10, writable: true }); // 10s duration
      mockAudio.setAttribute('data-helios-fade-out', '2'); // 2s fade out
      scope.appendChild(mockAudio);
      await new Promise(resolve => setTimeout(resolve, 20));

      // 7s: Should be 1 volume (3s remaining)
      driver.update(7000, { isPlaying: false, playbackRate: 1, volume: 1 });
      expect(mockAudio.volume).toBe(1);

      // 9s: Should be 0.5 volume (1s remaining)
      driver.update(9000, { isPlaying: false, playbackRate: 1, volume: 1 });
      expect(mockAudio.volume).toBe(0.5);

      // 10s: Should be 0 volume (0s remaining)
      driver.update(10000, { isPlaying: false, playbackRate: 1, volume: 1 });
      expect(mockAudio.volume).toBe(0);
    });

    it('should handle overlapping fades', async () => {
      const mockAudio = document.createElement('audio');
      Object.defineProperty(mockAudio, 'volume', { value: 1, writable: true });
      Object.defineProperty(mockAudio, 'duration', { value: 4, writable: true });
      mockAudio.setAttribute('data-helios-fade-in', '3'); // Fade in over 3s
      mockAudio.setAttribute('data-helios-fade-out', '3'); // Fade out last 3s
      // Overlap from 1s to 3s
      scope.appendChild(mockAudio);
      await new Promise(resolve => setTimeout(resolve, 20));

      // 2s (Midpoint):
      // Fade in (2/3) = 0.66
      // Fade out (2/3 remaining) = 0.66
      // Total = 0.66 * 0.66 = 0.44
      driver.update(2000, { isPlaying: false, playbackRate: 1, volume: 1 });
      expect(mockAudio.volume).toBeCloseTo(0.444, 2);
    });

    it('should default to no fade if attributes are missing', async () => {
      const mockAudio = document.createElement('audio');
      Object.defineProperty(mockAudio, 'volume', { value: 1, writable: true });
      scope.appendChild(mockAudio);
      await new Promise(resolve => setTimeout(resolve, 20));

      driver.update(0, { isPlaying: false, playbackRate: 1, volume: 1 });
      expect(mockAudio.volume).toBe(1);
    });

    it('should respect offset when fading in', async () => {
      const mockAudio = document.createElement('audio');
      Object.defineProperty(mockAudio, 'volume', { value: 1, writable: true });
      mockAudio.setAttribute('data-helios-fade-in', '2');
      mockAudio.setAttribute('data-helios-offset', '1'); // Starts at 1s
      scope.appendChild(mockAudio);
      await new Promise(resolve => setTimeout(resolve, 20));

      // 0.5s: Before start, volume should be 0 (clamped)
      driver.update(500, { isPlaying: false, playbackRate: 1, volume: 1 });
      expect(mockAudio.volume).toBe(0);

      // 2s: 1s into playback. Fade in is 2s. So 0.5.
      driver.update(2000, { isPlaying: false, playbackRate: 1, volume: 1 });
      expect(mockAudio.volume).toBe(0.5);
    });

    it('should handle zero duration fades', async () => {
      const mockAudio = document.createElement('audio');
      Object.defineProperty(mockAudio, 'volume', { value: 1, writable: true });
      mockAudio.setAttribute('data-helios-fade-in', '0');
      scope.appendChild(mockAudio);
      await new Promise(resolve => setTimeout(resolve, 20));

      // 0s: Should be 1 volume (immediate)
      driver.update(0, { isPlaying: false, playbackRate: 1, volume: 1 });
      expect(mockAudio.volume).toBe(1);
    });

    it('should NOT suffer from volume feedback loop during continuous updates', async () => {
      const mockAudio = document.createElement('audio');
      Object.defineProperty(mockAudio, 'volume', { value: 1, writable: true });
      mockAudio.setAttribute('data-helios-fade-in', '2'); // 2s fade in
      scope.appendChild(mockAudio);
      await new Promise(resolve => setTimeout(resolve, 20));

      // 1s: Fade should be 0.5. Volume becomes 0.5.
      driver.update(1000, { isPlaying: false, playbackRate: 1, volume: 1 });
      expect(mockAudio.volume).toBe(0.5);

      // 1.1s: Fade should be 0.55.
      // If feedback loop existed, baseVol would be 0.5, so 0.5 * 0.55 = 0.275.
      // If correct, baseVol is restored to 1, so 1 * 0.55 = 0.55.
      driver.update(1100, { isPlaying: false, playbackRate: 1, volume: 1 });
      expect(mockAudio.volume).toBeCloseTo(0.55, 2);

      // 1.2s: Fade should be 0.6.
      driver.update(1200, { isPlaying: false, playbackRate: 1, volume: 1 });
      expect(mockAudio.volume).toBeCloseTo(0.6, 2);
    });
  });
});
