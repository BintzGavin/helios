import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Helios } from './index';
import { TimeDriver, ManualTicker } from './drivers';

describe('Helios Core', () => {
  it('should initialize with correct state', () => {
    const helios = new Helios({ duration: 10, fps: 30 });
    expect(helios.getState()).toEqual({
      duration: 10,
      fps: 30,
      currentFrame: 0,
      isPlaying: false,
      inputProps: {},
      playbackRate: 1,
    });
  });

  it('should update state on seek', () => {
    const helios = new Helios({ duration: 10, fps: 30 });
    helios.seek(150);
    expect(helios.getState().currentFrame).toBe(150);
  });

  it('should clamp frames on seek', () => {
    const helios = new Helios({ duration: 10, fps: 30 });
    helios.seek(500); // Max is 300
    expect(helios.getState().currentFrame).toBe(300);

    helios.seek(-10);
    expect(helios.getState().currentFrame).toBe(0);
  });

  it('should notify subscribers', () => {
    const helios = new Helios({ duration: 10, fps: 30 });
    const spy = vi.fn();
    helios.subscribe(spy);

    // Initial call
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ currentFrame: 0 }));

    helios.seek(10);
    expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ currentFrame: 10 }));
  });

  it('should allow unsubscribing via unsubscribe method', () => {
    const helios = new Helios({ duration: 10, fps: 30 });
    const spy = vi.fn();
    helios.subscribe(spy);

    helios.seek(10);
    expect(spy).toHaveBeenCalledTimes(2); // Initial + seek

    helios.unsubscribe(spy);
    helios.seek(20);
    expect(spy).toHaveBeenCalledTimes(2); // Should not increase
  });

  describe('Constructor Validation', () => {
    it('should throw if duration is negative', () => {
      expect(() => new Helios({ duration: -1, fps: 30 })).toThrow("Duration must be non-negative");
    });

    it('should throw if fps is zero or negative', () => {
      expect(() => new Helios({ duration: 10, fps: 0 })).toThrow("FPS must be greater than 0");
      expect(() => new Helios({ duration: 10, fps: -30 })).toThrow("FPS must be greater than 0");
    });

    it('should not throw for valid options', () => {
      expect(() => new Helios({ duration: 0, fps: 30 })).not.toThrow();
      expect(() => new Helios({ duration: 10, fps: 0.1 })).not.toThrow();
    });
  });

  describe('Diagnostics', () => {
    it('should run diagnose without error', async () => {
      const report = await Helios.diagnose();
      expect(report).toHaveProperty('waapi');
      expect(report).toHaveProperty('webCodecs');
      expect(report).toHaveProperty('offscreenCanvas');
      expect(report).toHaveProperty('userAgent');
    });
  });

  describe('Document Timeline Binding', () => {
    beforeEach(() => {
        // Mock document.timeline
        vi.stubGlobal('document', {
            timeline: {
                currentTime: 0
            }
        });
        vi.stubGlobal('requestAnimationFrame', (cb: any) => setTimeout(cb, 0));
        vi.stubGlobal('cancelAnimationFrame', (id: any) => clearTimeout(id));
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('should sync state from document.timeline when bound', async () => {
        const helios = new Helios({ duration: 10, fps: 30 });
        helios.bindToDocumentTimeline();

        // Simulate time passing in document.timeline
        (document.timeline as any).currentTime = 1000; // 1 second

        // Wait for polling loop
        await new Promise(resolve => setTimeout(resolve, 50));

        expect(helios.getState().currentFrame).toBe(30); // 1s * 30fps

        (document.timeline as any).currentTime = 2000; // 2 seconds

        await new Promise(resolve => setTimeout(resolve, 50));

        expect(helios.getState().currentFrame).toBe(60);

        helios.unbindFromDocumentTimeline();
    });

    it('should sync fractional frames from document.timeline', async () => {
        const helios = new Helios({ duration: 10, fps: 30 });
        helios.bindToDocumentTimeline();

        // 1010 ms = 1.01 seconds. 1.01 * 30 = 30.3 frames
        (document.timeline as any).currentTime = 1010;

        // Wait for polling loop
        await new Promise(resolve => setTimeout(resolve, 50));

        expect(helios.getState().currentFrame).toBeCloseTo(30.3, 1);

        helios.unbindFromDocumentTimeline();
    });
  });

  describe('WAAPI Synchronization', () => {
    beforeEach(() => {
        vi.stubGlobal('document', {
            getAnimations: vi.fn().mockReturnValue([]),
            timeline: { currentTime: 0 }
        });
        vi.stubGlobal('requestAnimationFrame', (cb: any) => setTimeout(cb, 0));
        vi.stubGlobal('cancelAnimationFrame', (id: any) => clearTimeout(id));
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('should sync DOM animations when autoSyncAnimations is true', () => {
        const mockAnim = { currentTime: 0, playState: 'running', pause: vi.fn() };
        (document.getAnimations as any).mockReturnValue([mockAnim]);

        const helios = new Helios({ duration: 10, fps: 30, autoSyncAnimations: true });

        // Seek to 1 second (frame 30)
        helios.seek(30);

        expect(mockAnim.currentTime).toBe(1000);
        expect(mockAnim.pause).toHaveBeenCalled();
    });

    it('should NOT sync DOM animations when autoSyncAnimations is false', () => {
        const mockAnim = { currentTime: 0, playState: 'running', pause: vi.fn() };
        (document.getAnimations as any).mockReturnValue([mockAnim]);

        const helios = new Helios({ duration: 10, fps: 30, autoSyncAnimations: false });

        helios.seek(30);

        expect(mockAnim.currentTime).toBe(0);
        expect(mockAnim.pause).not.toHaveBeenCalled();
    });

    it('should sync DOM animations during playback', async () => {
        const mockAnim = { currentTime: 0, playState: 'running', pause: vi.fn() };
        (document.getAnimations as any).mockReturnValue([mockAnim]);

        const helios = new Helios({ duration: 10, fps: 30, autoSyncAnimations: true });

        helios.play();

        // Wait for one tick
        await new Promise(resolve => setTimeout(resolve, 50));

        expect(mockAnim.currentTime).toBeGreaterThan(0);
        expect(mockAnim.pause).toHaveBeenCalled();

        helios.pause();
    });

    it('should gracefully handle missing getAnimations API', () => {
        // Mock document without getAnimations
        vi.stubGlobal('document', {
            // getAnimations is undefined
            timeline: { currentTime: 0 }
        });

        const helios = new Helios({ duration: 10, fps: 30, autoSyncAnimations: true });

        // Should not throw
        expect(() => helios.seek(30)).not.toThrow();
    });

    it('should respect animationScope if provided', () => {
        const mockScope = {
            getAnimations: vi.fn().mockReturnValue([])
        };
        const mockAnim = { currentTime: 0, playState: 'running', pause: vi.fn() };
        mockScope.getAnimations.mockReturnValue([mockAnim]);

        const helios = new Helios({
            duration: 10,
            fps: 30,
            autoSyncAnimations: true,
            animationScope: mockScope as any
        });

        helios.seek(30);

        expect(mockScope.getAnimations).toHaveBeenCalledWith({ subtree: true });
        expect((document.getAnimations as any)).not.toHaveBeenCalled();
        expect(mockAnim.currentTime).toBe(1000);
    });
  });

  describe('Input Props', () => {
    it('should initialize with inputProps', () => {
      const props = { text: 'Hello', value: 42 };
      const helios = new Helios({ duration: 10, fps: 30, inputProps: props });
      expect(helios.getState().inputProps).toEqual(props);
    });

    it('should update inputProps', () => {
      const helios = new Helios({ duration: 10, fps: 30 });
      const newProps = { text: 'World', value: 100 };

      const spy = vi.fn();
      helios.subscribe(spy);

      helios.setInputProps(newProps);

      expect(helios.getState().inputProps).toEqual(newProps);
      expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ inputProps: newProps }));
    });

    it('should default inputProps to empty object', () => {
      const helios = new Helios({ duration: 10, fps: 30 });
      expect(helios.getState().inputProps).toEqual({});
    });
  });

  describe('Playback Rate', () => {
    it('should initialize with default playbackRate of 1', () => {
      const helios = new Helios({ duration: 10, fps: 30 });
      expect(helios.getState().playbackRate).toBe(1);
    });

    it('should initialize with provided playbackRate', () => {
      const helios = new Helios({ duration: 10, fps: 30, playbackRate: 2 });
      expect(helios.getState().playbackRate).toBe(2);
    });

    it('should update playbackRate via setPlaybackRate', () => {
      const helios = new Helios({ duration: 10, fps: 30 });
      helios.setPlaybackRate(0.5);
      expect(helios.getState().playbackRate).toBe(0.5);
    });
  });

  describe('Time-Based Ticking (Manual)', () => {
    it('should advance frames correctly at 1x speed', () => {
        const ticker = new ManualTicker();
        const helios = new Helios({ duration: 10, fps: 30, ticker });
        helios.play();

        ticker.tick(1000); // 1 second elapses

        // delta = 1000ms. frames = 1 * 30 * 1 = 30.
        expect(helios.getState().currentFrame).toBeCloseTo(30, 0);
        helios.pause();
    });

    it('should advance frames correctly at 2x speed', () => {
        const ticker = new ManualTicker();
        const helios = new Helios({ duration: 10, fps: 30, playbackRate: 2, ticker });
        helios.play();

        ticker.tick(1000);

        // delta = 1000ms. frames = 1 * 30 * 2 = 60.
        expect(helios.getState().currentFrame).toBeCloseTo(60, 0);
        helios.pause();
    });

    it('should reverse frames at -1x speed', () => {
        const ticker = new ManualTicker();
        const helios = new Helios({ duration: 10, fps: 30, ticker });
        helios.seek(60);
        helios.setPlaybackRate(-1);
        helios.play();

        ticker.tick(1000);

        // 60 + (1 * 30 * -1) = 30
        expect(helios.getState().currentFrame).toBeCloseTo(30, 0);
        helios.pause();
    });

    it('should pause when reaching end', () => {
        const ticker = new ManualTicker();
        const helios = new Helios({ duration: 2, fps: 30, ticker }); // 60 frames total
        helios.play();

        ticker.tick(3000); // 3 seconds, should overshoot

        expect(helios.getState().currentFrame).toBe(59); // clamped to totalFrames - 1
        expect(helios.getState().isPlaying).toBe(false);
    });
  });

  describe('TimeDriver Abstraction', () => {
    let mockDriver: TimeDriver;

    beforeEach(() => {
       mockDriver = {
         init: vi.fn(),
         update: vi.fn()
       };
    });

    it('should use provided driver', () => {
      const helios = new Helios({ duration: 10, fps: 30, driver: mockDriver });
      helios.seek(30);
      expect(mockDriver.update).toHaveBeenCalledWith(1000, { isPlaying: false, playbackRate: 1 });
    });

    it('should initialize driver with scope', () => {
       const scope = {} as any;
       new Helios({ duration: 10, fps: 30, driver: mockDriver, animationScope: scope });
       expect(mockDriver.init).toHaveBeenCalledWith(scope);
    });

    it('should call driver.update during playback', () => {
        const ticker = new ManualTicker();
        const helios = new Helios({ duration: 10, fps: 30, driver: mockDriver, ticker });
        helios.play();

        ticker.tick(100); // 100ms elapsed

        expect(mockDriver.update).toHaveBeenCalledWith(expect.any(Number), { isPlaying: true, playbackRate: 1 });

        helios.pause();
    });

    it('should call driver.update on play and pause', () => {
        const ticker = new ManualTicker();
        const helios = new Helios({ duration: 10, fps: 30, driver: mockDriver, ticker });

        helios.play();
        expect(mockDriver.update).toHaveBeenCalledWith(0, { isPlaying: true, playbackRate: 1 });

        helios.pause();
        expect(mockDriver.update).toHaveBeenCalledWith(0, { isPlaying: false, playbackRate: 1 });
    });
  });
});
