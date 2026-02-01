import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Helios, HeliosState, HeliosSubscriber } from './index.js';
import { TimeDriver, ManualTicker } from './drivers/index.js';
import { HeliosError, HeliosErrorCode } from './errors.js';

describe('Helios Core', () => {
  it('should initialize with correct state', () => {
    const helios = new Helios({ duration: 10, fps: 30 });
    expect(helios.getState()).toEqual({
      width: 1920,
      height: 1080,
      duration: 10,
      fps: 30,
      currentFrame: 0,
      currentTime: 0,
      loop: false,
      isPlaying: false,
      inputProps: {},
      playbackRate: 1,
      volume: 1,
      muted: false,
      audioTracks: {},
      availableAudioTracks: [],
      captions: [],
      activeCaptions: [],
      markers: [],
      playbackRange: null,
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
    // Note: Can be called multiple times due to signal dependency graph (frame + time updates)
    expect(spy.mock.calls.length).toBeGreaterThanOrEqual(2);
    const callsBeforeUnsub = spy.mock.calls.length;

    helios.unsubscribe(spy);
    helios.seek(20);
    expect(spy).toHaveBeenCalledTimes(callsBeforeUnsub); // Should not increase
  });

  describe('Constructor Validation', () => {
    it('should throw if duration is negative', () => {
      expect.assertions(2);
      try {
        new Helios({ duration: -1, fps: 30 });
      } catch (e) {
        expect(e).toBeInstanceOf(HeliosError);
        expect((e as HeliosError).code).toBe(HeliosErrorCode.INVALID_DURATION);
      }
    });

    it('should throw if fps is zero or negative', () => {
      expect.assertions(4);
      try {
        new Helios({ duration: 10, fps: 0 });
      } catch (e) {
        expect(e).toBeInstanceOf(HeliosError);
        expect((e as HeliosError).code).toBe(HeliosErrorCode.INVALID_FPS);
      }

      try {
        new Helios({ duration: 10, fps: -30 });
      } catch (e) {
        expect(e).toBeInstanceOf(HeliosError);
        expect((e as HeliosError).code).toBe(HeliosErrorCode.INVALID_FPS);
      }
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
      expect(report).toHaveProperty('webgl');
      expect(report).toHaveProperty('webgl2');
      expect(report).toHaveProperty('webAudio');
      expect(report).toHaveProperty('colorGamut');
      expect(report).toHaveProperty('videoCodecs');
      expect(report.videoCodecs).toHaveProperty('h264');
      expect(report.videoCodecs).toHaveProperty('vp8');
      expect(report.videoCodecs).toHaveProperty('vp9');
      expect(report.videoCodecs).toHaveProperty('av1');
      expect(report).toHaveProperty('audioCodecs');
      expect(report.audioCodecs).toHaveProperty('aac');
      expect(report.audioCodecs).toHaveProperty('opus');
      expect(report).toHaveProperty('videoDecoders');
      expect(report.videoDecoders).toHaveProperty('h264');
      expect(report.videoDecoders).toHaveProperty('vp8');
      expect(report.videoDecoders).toHaveProperty('vp9');
      expect(report.videoDecoders).toHaveProperty('av1');
      expect(report).toHaveProperty('audioDecoders');
      expect(report.audioDecoders).toHaveProperty('aac');
      expect(report.audioDecoders).toHaveProperty('opus');
      expect(report).toHaveProperty('userAgent');
    });

    it('should detect WebAudio support if AudioContext is present', async () => {
      vi.stubGlobal('window', { AudioContext: class {} });
      const report = await Helios.diagnose();
      expect(report.webAudio).toBe(true);
      vi.unstubAllGlobals();
    });

    it('should detect WebGL support if canvas context is available', async () => {
      const mockCanvas = {
        getContext: vi.fn((contextId) => {
          if (contextId === 'webgl') return {};
          return null;
        })
      };
      vi.stubGlobal('document', {
        createElement: vi.fn(() => mockCanvas),
        timeline: {}
      });

      const report = await Helios.diagnose();
      expect(report.webgl).toBe(true);
      vi.unstubAllGlobals();
    });

    it('should handle missing VideoEncoder gracefully', async () => {
      vi.stubGlobal('VideoEncoder', undefined);
      const report = await Helios.diagnose();
      expect(report.webCodecs).toBe(false);
      expect(report.videoCodecs.h264).toBe(false);
      vi.unstubAllGlobals();
    });

    it('should detect video codecs if VideoEncoder is supported', async () => {
      const mockIsConfigSupported = vi.fn().mockResolvedValue({ supported: true });
      vi.stubGlobal('VideoEncoder', {
        isConfigSupported: mockIsConfigSupported
      });

      const report = await Helios.diagnose();
      expect(report.webCodecs).toBe(true);
      expect(report.videoCodecs.h264).toBe(true);
      expect(mockIsConfigSupported).toHaveBeenCalledTimes(4);
      vi.unstubAllGlobals();
    });

    it('should handle missing AudioEncoder gracefully', async () => {
      vi.stubGlobal('AudioEncoder', undefined);
      const report = await Helios.diagnose();
      expect(report.audioCodecs.aac).toBe(false);
      expect(report.audioCodecs.opus).toBe(false);
      vi.unstubAllGlobals();
    });

    it('should detect audio codecs if AudioEncoder is supported', async () => {
      const mockIsConfigSupported = vi.fn().mockResolvedValue({ supported: true });
      vi.stubGlobal('AudioEncoder', {
        isConfigSupported: mockIsConfigSupported
      });

      const report = await Helios.diagnose();
      expect(report.audioCodecs.aac).toBe(true);
      expect(report.audioCodecs.opus).toBe(true);
      expect(mockIsConfigSupported).toHaveBeenCalledTimes(2);
      vi.unstubAllGlobals();
    });

    it('should handle missing VideoDecoder gracefully', async () => {
      vi.stubGlobal('VideoDecoder', undefined);
      const report = await Helios.diagnose();
      expect(report.videoDecoders.h264).toBe(false);
      vi.unstubAllGlobals();
    });

    it('should detect video decoders if VideoDecoder is supported', async () => {
      const mockIsConfigSupported = vi.fn().mockResolvedValue({ supported: true });
      vi.stubGlobal('VideoDecoder', {
        isConfigSupported: mockIsConfigSupported
      });

      const report = await Helios.diagnose();
      expect(report.videoDecoders.h264).toBe(true);
      expect(mockIsConfigSupported).toHaveBeenCalledTimes(4);
      vi.unstubAllGlobals();
    });

    it('should handle missing AudioDecoder gracefully', async () => {
      vi.stubGlobal('AudioDecoder', undefined);
      const report = await Helios.diagnose();
      expect(report.audioDecoders.aac).toBe(false);
      expect(report.audioDecoders.opus).toBe(false);
      vi.unstubAllGlobals();
    });

    it('should detect audio decoders if AudioDecoder is supported', async () => {
      const mockIsConfigSupported = vi.fn().mockResolvedValue({ supported: true });
      vi.stubGlobal('AudioDecoder', {
        isConfigSupported: mockIsConfigSupported
      });

      const report = await Helios.diagnose();
      expect(report.audioDecoders.aac).toBe(true);
      expect(report.audioDecoders.opus).toBe(true);
      expect(mockIsConfigSupported).toHaveBeenCalledTimes(2);
      vi.unstubAllGlobals();
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
        vi.stubGlobal('window', {});
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

    it('should propagate document timeline updates to driver', async () => {
        const mockDriver: TimeDriver = {
           init: vi.fn(),
           update: vi.fn(),
           waitUntilStable: vi.fn().mockResolvedValue(undefined)
        };

        const helios = new Helios({ duration: 10, fps: 30, driver: mockDriver });
        helios.bindToDocumentTimeline();

        // Simulate time passing in document.timeline
        (document.timeline as any).currentTime = 1000; // 1 second

        // Wait for polling loop
        await new Promise(resolve => setTimeout(resolve, 50));

        // Expect driver update to be called with correct time
        expect(mockDriver.update).toHaveBeenCalledWith(1000, expect.objectContaining({
            isPlaying: false
        }));

        helios.unbindFromDocumentTimeline();
    });

    it('should prefer __HELIOS_VIRTUAL_TIME__ when available', async () => {
        const helios = new Helios({ duration: 10, fps: 30 });
        helios.bindToDocumentTimeline();

        (document.timeline as any).currentTime = 1000;

        // Inject virtual time
        (window as any).__HELIOS_VIRTUAL_TIME__ = 5000;

        await new Promise(resolve => setTimeout(resolve, 50));

        expect(helios.getState().currentFrame).toBe(150); // 5000ms * 30fps / 1000 = 150

        // Cleanup
        delete (window as any).__HELIOS_VIRTUAL_TIME__;
        helios.unbindFromDocumentTimeline();
    });

    it('should fall back to document.timeline when virtual time is undefined', async () => {
        const helios = new Helios({ duration: 10, fps: 30 });
        helios.bindToDocumentTimeline();

        (document.timeline as any).currentTime = 1000;

        delete (window as any).__HELIOS_VIRTUAL_TIME__;

        await new Promise(resolve => setTimeout(resolve, 50));

        expect(helios.getState().currentFrame).toBe(30); // 1000ms * 30fps / 1000 = 30

        helios.unbindFromDocumentTimeline();
    });

    it('should fall back if virtual time is infinite', async () => {
        const helios = new Helios({ duration: 10, fps: 30 });
        helios.bindToDocumentTimeline();

        (document.timeline as any).currentTime = 1000;

        (window as any).__HELIOS_VIRTUAL_TIME__ = Infinity;

        await new Promise(resolve => setTimeout(resolve, 50));

        expect(helios.getState().currentFrame).toBe(30);

        delete (window as any).__HELIOS_VIRTUAL_TIME__;
        helios.unbindFromDocumentTimeline();
    });

    it('should update synchronously when setting __HELIOS_VIRTUAL_TIME__', () => {
        const helios = new Helios({ duration: 10, fps: 30 });
        helios.bindToDocumentTimeline();

        // 1000ms = 1 second = 30 frames
        (window as any).__HELIOS_VIRTUAL_TIME__ = 1000;

        // No wait needed!
        expect(helios.getState().currentFrame).toBe(30);

        // 2000ms = 2 seconds = 60 frames
        (window as any).__HELIOS_VIRTUAL_TIME__ = 2000;
        expect(helios.getState().currentFrame).toBe(60);

        helios.unbindFromDocumentTimeline();
        delete (window as any).__HELIOS_VIRTUAL_TIME__;
    });

    it('should restore original __HELIOS_VIRTUAL_TIME__ descriptor on unbind', () => {
        // Define an original property
        Object.defineProperty(window, '__HELIOS_VIRTUAL_TIME__', {
            value: 999,
            configurable: true,
            writable: true,
            enumerable: true
        });

        const helios = new Helios({ duration: 10, fps: 30 });
        helios.bindToDocumentTimeline();

        // Should be hijacked now (getter/setter)
        (window as any).__HELIOS_VIRTUAL_TIME__ = 1000;
        expect(helios.getState().currentFrame).toBe(30);

        helios.unbindFromDocumentTimeline();

        // Should be restored
        const descriptor = Object.getOwnPropertyDescriptor(window, '__HELIOS_VIRTUAL_TIME__');
        expect(descriptor?.value).toBe(999);
        expect((window as any).__HELIOS_VIRTUAL_TIME__).toBe(999);

        // Setting it now should NOT update helios
        (window as any).__HELIOS_VIRTUAL_TIME__ = 2000;
        expect(helios.getState().currentFrame).toBe(30); // Remains 30

        delete (window as any).__HELIOS_VIRTUAL_TIME__;
    });

    it('should sync with pre-existing __HELIOS_VIRTUAL_TIME__ on bind', async () => {
        // Set virtual time BEFORE creating Helios or binding
        (window as any).__HELIOS_VIRTUAL_TIME__ = 5000;

        const helios = new Helios({ duration: 10, fps: 30 });
        helios.bindToDocumentTimeline();

        // Should sync immediately without waiting for poll
        expect(helios.getState().currentFrame).toBe(150); // 5000ms * 30fps / 1000 = 150

        delete (window as any).__HELIOS_VIRTUAL_TIME__;
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

        expect(helios.getState().currentFrame).toBe(60); // clamped to totalFrames (end)
        expect(helios.getState().isPlaying).toBe(false);
    });
  });

  describe('TimeDriver Abstraction', () => {
    let mockDriver: TimeDriver;

    beforeEach(() => {
       mockDriver = {
         init: vi.fn(),
         update: vi.fn(),
         waitUntilStable: vi.fn().mockResolvedValue(undefined)
       };
    });

    it('should use provided driver', () => {
      const helios = new Helios({ duration: 10, fps: 30, driver: mockDriver });
      helios.seek(30);
      expect(mockDriver.update).toHaveBeenCalledWith(1000, expect.objectContaining({ isPlaying: false, playbackRate: 1, volume: 1, muted: false }));
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

        expect(mockDriver.update).toHaveBeenCalledWith(expect.any(Number), expect.objectContaining({ isPlaying: true, playbackRate: 1, volume: 1, muted: false }));

        helios.pause();
    });

    it('should call driver.update on play and pause', () => {
        const ticker = new ManualTicker();
        const helios = new Helios({ duration: 10, fps: 30, driver: mockDriver, ticker });

        helios.play();
        expect(mockDriver.update).toHaveBeenCalledWith(0, expect.objectContaining({ isPlaying: true, playbackRate: 1, volume: 1, muted: false }));

        helios.pause();
        expect(mockDriver.update).toHaveBeenCalledWith(0, expect.objectContaining({ isPlaying: false, playbackRate: 1, volume: 1, muted: false }));
    });
  });

  describe('Type Exports', () => {
    it('should allow usage of exported types', () => {
      const state: HeliosState = {
        width: 1920,
        height: 1080,
        duration: 10,
        fps: 30,
        currentFrame: 0,
        isPlaying: false,
        inputProps: {},
        playbackRate: 1,
        volume: 1,
        muted: false,
        audioTracks: {},
        captions: [],
        activeCaptions: [],
        loop: false,
        markers: [],
        playbackRange: null,
        currentTime: 0
      };

      const subscriber: HeliosSubscriber = (s: HeliosState) => {
        // no-op
      };

      expect(state.duration).toBe(10);
      expect(subscriber).toBeDefined();
    });
  });

  describe('Resource Disposal', () => {
    it('should stop the ticker on dispose', () => {
      const mockTicker = { start: vi.fn(), stop: vi.fn() };
      const helios = new Helios({ duration: 10, fps: 30, ticker: mockTicker });

      helios.play();
      expect(mockTicker.start).toHaveBeenCalled();

      helios.dispose();
      expect(mockTicker.stop).toHaveBeenCalled();
    });

    it('should stop playback on dispose', () => {
      const helios = new Helios({ duration: 10, fps: 30 });
      helios.play();
      expect(helios.getState().isPlaying).toBe(true);

      helios.dispose();
      expect(helios.getState().isPlaying).toBe(false);
    });

    it('should release all subscribers on dispose', () => {
      const helios = new Helios({ duration: 10, fps: 30 });
      const spy = vi.fn();

      helios.subscribe(spy);
      helios.setInputProps({ foo: 'bar' });
      expect(spy).toHaveBeenLastCalledWith(expect.objectContaining({ inputProps: { foo: 'bar' } }));

      helios.dispose();

      // Should not trigger subscriber after dispose
      helios.setInputProps({ foo: 'baz' });
      expect(spy).not.toHaveBeenLastCalledWith(expect.objectContaining({ inputProps: { foo: 'baz' } }));
      // Ensure it wasn't called again (call count check)
      const callsBefore = spy.mock.calls.length;
      helios.setInputProps({ foo: 'qux' });
      expect(spy.mock.calls.length).toBe(callsBefore);
    });

    it('should unbind from document timeline on dispose', async () => {
      vi.stubGlobal('document', {
          timeline: { currentTime: 0 }
      });
      vi.stubGlobal('requestAnimationFrame', (cb: any) => setTimeout(cb, 0));
      vi.stubGlobal('cancelAnimationFrame', (id: any) => clearTimeout(id));

      const helios = new Helios({ duration: 10, fps: 30 });
      helios.bindToDocumentTimeline();

      (document.timeline as any).currentTime = 1000;
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(helios.getState().currentFrame).toBe(30);

      helios.dispose();

      // Change time again
      (document.timeline as any).currentTime = 2000;
      await new Promise(resolve => setTimeout(resolve, 50));

      // Should NOT have updated
      expect(helios.getState().currentFrame).toBe(30);

      vi.unstubAllGlobals();
    });
  });

  describe('Resolution Handling', () => {
    it('should initialize with default resolution (1920x1080)', () => {
      const helios = new Helios({ duration: 10, fps: 30 });
      expect(helios.width.value).toBe(1920);
      expect(helios.height.value).toBe(1080);
      expect(helios.getState().width).toBe(1920);
      expect(helios.getState().height).toBe(1080);
    });

    it('should initialize with provided resolution', () => {
      const helios = new Helios({ duration: 10, fps: 30, width: 1280, height: 720 });
      expect(helios.width.value).toBe(1280);
      expect(helios.height.value).toBe(720);
    });

    it('should throw INVALID_RESOLUTION for non-positive width/height in constructor', () => {
      try {
        new Helios({ duration: 10, fps: 30, width: 0, height: 1080 });
      } catch (e) {
        expect(e).toBeInstanceOf(HeliosError);
        expect((e as HeliosError).code).toBe(HeliosErrorCode.INVALID_RESOLUTION);
      }

      try {
        new Helios({ duration: 10, fps: 30, width: 1920, height: -1 });
      } catch (e) {
        expect(e).toBeInstanceOf(HeliosError);
        expect((e as HeliosError).code).toBe(HeliosErrorCode.INVALID_RESOLUTION);
      }
    });

    it('should update resolution via setSize', () => {
      const helios = new Helios({ duration: 10, fps: 30 });
      helios.setSize(800, 600);
      expect(helios.width.value).toBe(800);
      expect(helios.height.value).toBe(600);
      expect(helios.getState().width).toBe(800);
      expect(helios.getState().height).toBe(600);
    });

    it('should throw INVALID_RESOLUTION for non-positive width/height in setSize', () => {
      const helios = new Helios({ duration: 10, fps: 30 });

      expect(() => helios.setSize(0, 100)).toThrow(HeliosError);
      expect(() => helios.setSize(100, -50)).toThrow(HeliosError);

      try {
        helios.setSize(-100, 100);
      } catch (e) {
        expect(e).toBeInstanceOf(HeliosError);
        expect((e as HeliosError).code).toBe(HeliosErrorCode.INVALID_RESOLUTION);
      }
    });
  });

  describe('Active Captions', () => {
    it('should initialize with empty captions by default', () => {
      const helios = new Helios({ duration: 10, fps: 30 });
      expect(helios.getState().activeCaptions).toEqual([]);
    });

    it('should initialize with provided captions', () => {
      const srt = `1
00:00:01,000 --> 00:00:02,000
Hello`;
      const helios = new Helios({ duration: 10, fps: 30, captions: srt });

      // At 0ms, no caption
      expect(helios.getState().activeCaptions).toEqual([]);

      // At 1500ms (frame 45), caption active
      helios.seek(45);
      const active = helios.getState().activeCaptions;
      expect(active).toHaveLength(1);
      expect(active[0].text).toBe('Hello');
    });

    it('should update active captions when seeking', () => {
      const srt = `1
00:00:01,000 --> 00:00:02,000
One

2
00:00:02,500 --> 00:00:03,500
Two`;
      const helios = new Helios({ duration: 10, fps: 30, captions: srt });

      helios.seek(30); // 1s
      expect(helios.getState().activeCaptions[0].text).toBe('One');

      helios.seek(60); // 2s (end of One)
      expect(helios.getState().activeCaptions[0].text).toBe('One');

      helios.seek(70); // 2.33s (gap)
      expect(helios.getState().activeCaptions).toEqual([]);

      helios.seek(80); // 2.66s (start of Two)
      expect(helios.getState().activeCaptions[0].text).toBe('Two');
    });

    it('should update captions via setCaptions', () => {
      const helios = new Helios({ duration: 10, fps: 30 });
      expect(helios.getState().activeCaptions).toEqual([]);

      const srt = `1
00:00:00,000 --> 00:00:01,000
Dynamic`;

      helios.setCaptions(srt);
      helios.seek(15); // 0.5s

      expect(helios.getState().activeCaptions).toHaveLength(1);
      expect(helios.getState().activeCaptions[0].text).toBe('Dynamic');
    });
  });

  describe('Exposed Captions', () => {
    it('should expose full captions list in state', () => {
      const srt = `1
00:00:01,000 --> 00:00:02,000
First

2
00:00:03,000 --> 00:00:04,000
Second`;
      const helios = new Helios({ duration: 10, fps: 30, captions: srt });

      expect(helios.captions.peek()).toHaveLength(2);
      expect(helios.getState().captions).toHaveLength(2);
      expect(helios.getState().captions[0].text).toBe('First');
      expect(helios.getState().captions[1].text).toBe('Second');
    });

    it('should accept CaptionCue[] in constructor', () => {
      const cues = [
        { id: '1', startTime: 1000, endTime: 2000, text: 'Manual 1' },
        { id: '2', startTime: 3000, endTime: 4000, text: 'Manual 2' }
      ];
      const helios = new Helios({ duration: 10, fps: 30, captions: cues });

      expect(helios.getState().captions).toEqual(cues);
      expect(helios.getState().captions).toHaveLength(2);
    });

    it('should update full captions list via setCaptions', () => {
      const helios = new Helios({ duration: 10, fps: 30 });
      expect(helios.getState().captions).toEqual([]);

      const srt = `1
00:00:01,000 --> 00:00:02,000
Updated`;

      helios.setCaptions(srt);
      expect(helios.getState().captions).toHaveLength(1);
      expect(helios.getState().captions[0].text).toBe('Updated');

      const cues = [
        { id: '1', startTime: 5000, endTime: 6000, text: 'Array' }
      ];
      helios.setCaptions(cues);
      expect(helios.getState().captions).toEqual(cues);
      expect(helios.getState().captions[0].text).toBe('Array');
    });
  });

  describe('Initial Frame', () => {
    it('should initialize with correct initialFrame', () => {
      const helios = new Helios({ duration: 10, fps: 30, initialFrame: 30 });
      expect(helios.currentFrame.peek()).toBe(30);
      expect(helios.getState().currentFrame).toBe(30);
    });

    it('should clamp negative initialFrame to 0', () => {
      const helios = new Helios({ duration: 10, fps: 30, initialFrame: -50 });
      expect(helios.currentFrame.peek()).toBe(0);
    });

    it('should clamp initialFrame to total frames', () => {
      // 10s * 30fps = 300 frames
      const helios = new Helios({ duration: 10, fps: 30, initialFrame: 500 });
      expect(helios.currentFrame.peek()).toBe(300);
    });

    it('should sync driver with initialFrame', () => {
      const mockDriver: TimeDriver = {
         init: vi.fn(),
         update: vi.fn(),
         waitUntilStable: vi.fn().mockResolvedValue(undefined)
      };

      new Helios({ duration: 10, fps: 30, initialFrame: 30, driver: mockDriver });

      // 30 frames / 30 fps = 1 second = 1000ms
      expect(mockDriver.update).toHaveBeenCalledWith(1000, expect.objectContaining({
        isPlaying: false
      }));
    });
  });

  describe('Dynamic Timing', () => {
    it('should update duration via setDuration', () => {
      const helios = new Helios({ duration: 10, fps: 30 });
      helios.setDuration(20);
      expect(helios.duration.value).toBe(20);
      expect(helios.getState().duration).toBe(20);
    });

    it('should throw for invalid duration in setDuration', () => {
      const helios = new Helios({ duration: 10, fps: 30 });
      expect(() => helios.setDuration(-5)).toThrow(HeliosError);
    });

    it('should clamp currentFrame when duration is reduced', () => {
      const helios = new Helios({ duration: 10, fps: 30 }); // 300 frames
      helios.seek(250); // Frame 250 (8.33s)

      // Reduce duration to 5s (150 frames)
      helios.setDuration(5);

      expect(helios.currentFrame.peek()).toBe(150);
      expect(helios.getState().currentFrame).toBe(150);
    });

    it('should not affect currentFrame when duration is increased', () => {
      const helios = new Helios({ duration: 10, fps: 30 });
      helios.seek(150);

      helios.setDuration(20);

      expect(helios.currentFrame.peek()).toBe(150);
    });

    it('should update fps via setFps', () => {
      const helios = new Helios({ duration: 10, fps: 30 });
      helios.setFps(60);
      expect(helios.fps.value).toBe(60);
      expect(helios.getState().fps).toBe(60);
    });

    it('should throw for invalid fps in setFps', () => {
      const helios = new Helios({ duration: 10, fps: 30 });
      expect(() => helios.setFps(0)).toThrow(HeliosError);
      expect(() => helios.setFps(-10)).toThrow(HeliosError);
    });

    it('should adjust currentFrame to preserve time when changing fps', () => {
      const helios = new Helios({ duration: 10, fps: 30 });
      // 1 second in (frame 30)
      helios.seek(30);

      // Change to 60fps
      helios.setFps(60);

      // Should still be 1 second in, so frame should be 60
      expect(helios.currentFrame.peek()).toBe(60);

      // Change to 10fps
      helios.setFps(10);

      // Should still be 1 second in, so frame should be 10
      expect(helios.currentFrame.peek()).toBe(10);
    });

    it('should handle fractional frames when changing fps', () => {
      const helios = new Helios({ duration: 10, fps: 30 });
      // 0.5 seconds (frame 15)
      helios.seek(15);

      // Change to 24fps
      helios.setFps(24);

      // 0.5 * 24 = 12
      expect(helios.currentFrame.peek()).toBe(12);
    });
  });

  describe('Loop Support', () => {
    it('should initialize loop to false by default', () => {
      const helios = new Helios({ duration: 10, fps: 30 });
      expect(helios.loop.peek()).toBe(false);
      expect(helios.getState().loop).toBe(false);
    });

    it('should initialize loop from options', () => {
      const helios = new Helios({ duration: 10, fps: 30, loop: true });
      expect(helios.loop.peek()).toBe(true);
      expect(helios.getState().loop).toBe(true);
    });

    it('should update loop via setLoop', () => {
      const helios = new Helios({ duration: 10, fps: 30 });
      helios.setLoop(true);
      expect(helios.loop.peek()).toBe(true);
      expect(helios.getState().loop).toBe(true);
    });

    it('should loop forward playback', () => {
      const ticker = new ManualTicker();
      const helios = new Helios({ duration: 2, fps: 30, loop: true, ticker }); // 60 frames

      // Seek to near end (frame 59)
      helios.seek(59);
      helios.play();

      // Tick 1 frame (33.33ms)
      ticker.tick(1000 / 30);

      // Should wrap to 0 (approx)
      expect(helios.getState().currentFrame).toBeCloseTo(0, 0);
      expect(helios.getState().isPlaying).toBe(true);
    });

    it('should loop backward playback', () => {
      const ticker = new ManualTicker();
      const helios = new Helios({ duration: 2, fps: 30, loop: true, ticker }); // 60 frames

      // Seek to start
      helios.seek(0);
      helios.setPlaybackRate(-1);
      helios.play();

      // Tick 1 frame
      ticker.tick(1000 / 30);

      // Should wrap to 59 (approx)
      expect(helios.getState().currentFrame).toBeCloseTo(59, 0);
      expect(helios.getState().isPlaying).toBe(true);
    });

    it('should NOT loop when loop is false', () => {
      const ticker = new ManualTicker();
      const helios = new Helios({ duration: 2, fps: 30, loop: false, ticker });

      helios.seek(59);
      helios.play();

      ticker.tick(1000 / 30);

      expect(helios.getState().currentFrame).toBe(60); // Clamped to end
      expect(helios.getState().isPlaying).toBe(false); // Paused
    });

    it('should handle loop with fractional overflow', () => {
      const ticker = new ManualTicker();
      const helios = new Helios({ duration: 2, fps: 30, loop: true, ticker }); // 60 frames

      helios.seek(59.5);
      helios.play();

      // Tick 1 frame (delta = 1) -> 60.5
      ticker.tick(1000 / 30);

      // 60.5 % 60 = 0.5
      expect(helios.getState().currentFrame).toBeCloseTo(0.5, 1);
    });
  });

  describe('Markers', () => {
    it('should initialize with empty markers by default', () => {
      const helios = new Helios({ duration: 10, fps: 30 });
      expect(helios.getState().markers).toEqual([]);
      expect(helios.markers.peek()).toEqual([]);
    });

    it('should initialize with provided markers', () => {
      const markers = [{ id: '1', time: 1.5, label: 'Start' }];
      const helios = new Helios({ duration: 10, fps: 30, markers });
      expect(helios.getState().markers).toHaveLength(1);
      expect(helios.getState().markers[0].label).toBe('Start');
    });

    it('should add valid marker', () => {
      const helios = new Helios({ duration: 10, fps: 30 });
      helios.addMarker({ id: 'm1', time: 5, label: 'Mid' });
      expect(helios.markers.peek()).toHaveLength(1);
      expect(helios.markers.peek()[0].id).toBe('m1');
    });

    it('should throw when adding duplicate marker ID', () => {
      const helios = new Helios({ duration: 10, fps: 30 });
      helios.addMarker({ id: 'm1', time: 5, label: 'Mid' });
      expect(() => helios.addMarker({ id: 'm1', time: 6, label: 'Conflict' })).toThrow(HeliosError);
    });

    it('should remove marker', () => {
      const helios = new Helios({ duration: 10, fps: 30 });
      helios.addMarker({ id: 'm1', time: 5, label: 'Mid' });
      helios.removeMarker('m1');
      expect(helios.markers.peek()).toHaveLength(0);
    });

    it('should seek to marker', () => {
      const helios = new Helios({ duration: 10, fps: 30 });
      helios.addMarker({ id: 'm1', time: 2, label: 'Seek Target' });

      helios.seekToMarker('m1');

      // 2 seconds * 30 fps = 60 frames
      expect(helios.currentFrame.peek()).toBe(60);
    });

    it('should throw when seeking to non-existent marker', () => {
      const helios = new Helios({ duration: 10, fps: 30 });
      expect(() => helios.seekToMarker('ghost')).toThrow(HeliosError);
    });

    it('should sort markers by time when adding', () => {
      const helios = new Helios({ duration: 10, fps: 30 });
      helios.addMarker({ id: 'm2', time: 10, label: 'Late' });
      helios.addMarker({ id: 'm1', time: 1, label: 'Early' });

      const markers = helios.markers.peek();
      expect(markers[0].id).toBe('m1');
      expect(markers[1].id).toBe('m2');
    });
  });

  describe('Playback Range', () => {
    it('should initialize with default null range', () => {
      const helios = new Helios({ duration: 10, fps: 30 });
      expect(helios.playbackRange.peek()).toBeNull();
      expect(helios.getState().playbackRange).toBeNull();
    });

    it('should initialize with provided range', () => {
      const helios = new Helios({ duration: 10, fps: 30, playbackRange: [30, 60] });
      expect(helios.playbackRange.peek()).toEqual([30, 60]);
    });

    it('should throw for invalid range in constructor', () => {
      expect(() => new Helios({ duration: 10, fps: 30, playbackRange: [-10, 20] })).toThrow(HeliosError);
      expect(() => new Helios({ duration: 10, fps: 30, playbackRange: [20, 20] })).toThrow(HeliosError);
      expect(() => new Helios({ duration: 10, fps: 30, playbackRange: [30, 20] })).toThrow(HeliosError);
    });

    it('should update range via setPlaybackRange', () => {
      const helios = new Helios({ duration: 10, fps: 30 });
      helios.setPlaybackRange(10, 20);
      expect(helios.playbackRange.peek()).toEqual([10, 20]);
    });

    it('should throw for invalid range in setPlaybackRange', () => {
      const helios = new Helios({ duration: 10, fps: 30 });
      expect(() => helios.setPlaybackRange(-5, 10)).toThrow(HeliosError);
      expect(() => helios.setPlaybackRange(10, 5)).toThrow(HeliosError);
    });

    it('should clear range via clearPlaybackRange', () => {
      const helios = new Helios({ duration: 10, fps: 30, playbackRange: [10, 20] });
      helios.clearPlaybackRange();
      expect(helios.playbackRange.peek()).toBeNull();
    });

    it('should loop within range', () => {
      const ticker = new ManualTicker();
      const helios = new Helios({ duration: 10, fps: 30, loop: true, playbackRange: [30, 60], ticker });

      // Start just before end of range
      helios.seek(59);
      helios.play();

      // Tick 2 frames (66.6ms) => +2 frames
      ticker.tick(2000 / 30);

      // 59 + 2 = 61.
      // Range duration = 30.
      // 61 >= 60. Overflow = 61 - 30 = 31.
      // 30 + (31 % 30) = 30 + 1 = 31.
      expect(helios.getState().currentFrame).toBeCloseTo(31, 0);
    });

    it('should clamp to end of range when not looping', () => {
      const ticker = new ManualTicker();
      const helios = new Helios({ duration: 10, fps: 30, loop: false, playbackRange: [30, 60], ticker });

      helios.seek(59);
      helios.play();

      ticker.tick(2000 / 30); // +2 frames => 61

      // Should clamp to 60 and pause
      expect(helios.getState().currentFrame).toBe(60);
      expect(helios.getState().isPlaying).toBe(false);
    });

    it('should wrap correctly when playing backwards in range', () => {
        const ticker = new ManualTicker();
        const helios = new Helios({ duration: 10, fps: 30, loop: true, playbackRange: [30, 60], ticker });

        helios.seek(31);
        helios.setPlaybackRate(-1);
        helios.play();

        // Tick 2 frames backwards
        ticker.tick(2000 / 30);

        // 31 - 2 = 29.
        // 29 < 30.
        // Overflow = 29 - 30 = -1.
        // Duration = 30.
        // 30 + (30 + -1) % 30 = 30 + 29 = 59.
        expect(helios.getState().currentFrame).toBeCloseTo(59, 0);
    });

    it('should clamp start when playing backwards without loop', () => {
        const ticker = new ManualTicker();
        const helios = new Helios({ duration: 10, fps: 30, loop: false, playbackRange: [30, 60], ticker });

        helios.seek(31);
        helios.setPlaybackRate(-1);
        helios.play();

        ticker.tick(2000 / 30); // -2 frames => 29

        expect(helios.getState().currentFrame).toBe(30);
        expect(helios.getState().isPlaying).toBe(false);
    });
  });

  describe('Helios Synchronization', () => {
    it('should sync with master', () => {
      const h1 = new Helios({ duration: 10, fps: 30 });
      const h2 = new Helios({ duration: 10, fps: 30 });

      h2.bindTo(h1);
      h1.seek(30); // 1 second

      expect(h2.currentFrame.peek()).toBe(30);
      expect(h2.currentTime.peek()).toBe(1);
    });

    it('should sync playback state', () => {
      const h1 = new Helios({ duration: 10, fps: 30 });
      const h2 = new Helios({ duration: 10, fps: 30 });

      h2.bindTo(h1);

      h1.play();
      expect(h2.isPlaying.peek()).toBe(true);

      h1.pause();
      expect(h2.isPlaying.peek()).toBe(false);

      h1.setPlaybackRate(2);
      expect(h2.playbackRate.peek()).toBe(2);
    });

    it('should stop syncing when unbound', () => {
      const h1 = new Helios({ duration: 10, fps: 30 });
      const h2 = new Helios({ duration: 10, fps: 30 });

      h2.bindTo(h1);
      h1.seek(30);
      expect(h2.currentFrame.peek()).toBe(30);

      h2.unbind();
      h1.seek(60);
      expect(h2.currentFrame.peek()).toBe(30); // Should stay at old frame
    });

    it('should sync with different FPS', () => {
      const h1 = new Helios({ duration: 10, fps: 30 });
      const h2 = new Helios({ duration: 10, fps: 60 }); // Double FPS

      h2.bindTo(h1);
      h1.seek(30); // 1 second

      // h2 should be at 1 second * 60 fps = 60 frames
      expect(h2.currentFrame.peek()).toBe(60);
      expect(h2.currentTime.peek()).toBe(1);
    });

    it('should sync with different FPS (fractional)', () => {
      const h1 = new Helios({ duration: 10, fps: 30 });
      const h2 = new Helios({ duration: 10, fps: 24 });

      h2.bindTo(h1);
      h1.seek(15); // 0.5 seconds

      // h2 should be at 0.5 * 24 = 12 frames
      expect(h2.currentFrame.peek()).toBe(12);
      expect(h2.currentTime.peek()).toBe(0.5);
    });
  });
});
