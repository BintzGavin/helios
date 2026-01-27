import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Helios, HeliosState, HeliosSubscriber } from './index';
import { TimeDriver, ManualTicker } from './drivers';
import { HeliosError, HeliosErrorCode } from './errors';

describe('Helios Core', () => {
  it('should initialize with correct state', () => {
    const helios = new Helios({ duration: 10, fps: 30 });
    expect(helios.getState()).toEqual({
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
      captions: [],
      activeCaptions: [],
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
      expect(mockDriver.update).toHaveBeenCalledWith(1000, { isPlaying: false, playbackRate: 1, volume: 1, muted: false });
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

        expect(mockDriver.update).toHaveBeenCalledWith(expect.any(Number), { isPlaying: true, playbackRate: 1, volume: 1, muted: false });

        helios.pause();
    });

    it('should call driver.update on play and pause', () => {
        const ticker = new ManualTicker();
        const helios = new Helios({ duration: 10, fps: 30, driver: mockDriver, ticker });

        helios.play();
        expect(mockDriver.update).toHaveBeenCalledWith(0, { isPlaying: true, playbackRate: 1, volume: 1, muted: false });

        helios.pause();
        expect(mockDriver.update).toHaveBeenCalledWith(0, { isPlaying: false, playbackRate: 1, volume: 1, muted: false });
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
        captions: [],
        activeCaptions: []
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
         update: vi.fn()
      };

      new Helios({ duration: 10, fps: 30, initialFrame: 30, driver: mockDriver });

      // 30 frames / 30 fps = 1 second = 1000ms
      expect(mockDriver.update).toHaveBeenCalledWith(1000, expect.objectContaining({
        isPlaying: false
      }));
    });
  });
});
