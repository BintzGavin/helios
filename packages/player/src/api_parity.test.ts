// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HeliosPlayer } from './index';
import { CueClass } from './features/text-tracks';

// Mock ResizeObserver
global.ResizeObserver = class {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
} as any;

describe('HeliosPlayer API Parity', () => {
  let player: HeliosPlayer;

  beforeEach(() => {
    document.body.innerHTML = '';
    player = new HeliosPlayer();
    document.body.appendChild(player);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should reflect src attribute as property', () => {
    player.setAttribute('src', 'test.html');
    expect(player.src).toBe('test.html');

    player.src = 'other.html';
    expect(player.getAttribute('src')).toBe('other.html');
  });

  it('should reflect autoplay attribute as boolean property', () => {
    expect(player.autoplay).toBe(false);

    player.setAttribute('autoplay', '');
    expect(player.autoplay).toBe(true);

    player.removeAttribute('autoplay');
    expect(player.autoplay).toBe(false);

    player.autoplay = true;
    expect(player.hasAttribute('autoplay')).toBe(true);

    player.autoplay = false;
    expect(player.hasAttribute('autoplay')).toBe(false);
  });

  it('should reflect loop attribute as boolean property', () => {
    expect(player.loop).toBe(false);

    player.setAttribute('loop', '');
    expect(player.loop).toBe(true);

    player.loop = true;
    expect(player.hasAttribute('loop')).toBe(true);

    player.loop = false;
    expect(player.hasAttribute('loop')).toBe(false);
  });

  it('should reflect controls attribute as boolean property', () => {
    expect(player.controls).toBe(false);

    player.setAttribute('controls', '');
    expect(player.controls).toBe(true);

    player.controls = true;
    expect(player.hasAttribute('controls')).toBe(true);

    player.controls = false;
    expect(player.hasAttribute('controls')).toBe(false);
  });

  it('should reflect poster attribute as property', () => {
    player.setAttribute('poster', 'image.jpg');
    expect(player.poster).toBe('image.jpg');

    player.poster = 'other.jpg';
    expect(player.getAttribute('poster')).toBe('other.jpg');
  });

  it('should reflect preload attribute as property', () => {
    // Default is usually auto, but let's check what attribute says
    expect(player.preload).toBe('auto'); // Assuming default return if missing

    player.setAttribute('preload', 'none');
    expect(player.preload).toBe('none');

    player.preload = 'auto';
    expect(player.getAttribute('preload')).toBe('auto');
  });

  it('should support videoWidth and videoHeight', () => {
    // Default 0
    expect(player.videoWidth).toBe(0);
    expect(player.videoHeight).toBe(0);

    // Fallback to attributes
    player.setAttribute('width', '1920');
    player.setAttribute('height', '1080');
    expect(player.videoWidth).toBe(1920);
    expect(player.videoHeight).toBe(1080);

    // Controller state should take precedence
    const mockController = {
      getState: () => ({ width: 1280, height: 720 }),
      pause: vi.fn(),
      dispose: vi.fn(),
    };
    (player as any).controller = mockController;
    expect(player.videoWidth).toBe(1280);
    expect(player.videoHeight).toBe(720);
  });

  it('should support buffered and seekable', () => {
    const buffered = player.buffered;
    expect(buffered).toBeDefined();
    // Initially duration is 0, so length is 0 (StaticTimeRange logic: endVal > 0 ? 1 : 0)
    expect(buffered.length).toBe(0);

    const seekable = player.seekable;
    expect(seekable).toBeDefined();
    expect(seekable.length).toBe(0);

    // Mock duration via controller
    const mockController = {
      getState: () => ({ duration: 10, width: 0, height: 0 }),
      pause: vi.fn(),
      dispose: vi.fn(),
    };
    (player as any).controller = mockController;

    expect(player.buffered.length).toBe(1);
    expect(player.buffered.start(0)).toBe(0);
    expect(player.buffered.end(0)).toBe(10);

    expect(player.seekable.length).toBe(1);
    expect(player.seekable.start(0)).toBe(0);
    expect(player.seekable.end(0)).toBe(10);
  });

  it('should support played property', () => {
    const played = player.played;
    expect(played).toBeDefined();
    expect(played.length).toBe(0);

    // Mock duration via controller
    const mockController = {
      getState: () => ({ duration: 10, width: 0, height: 0 }),
      pause: vi.fn(),
      dispose: vi.fn(),
    };
    (player as any).controller = mockController;

    expect(player.played.length).toBe(1);
    expect(player.played.start(0)).toBe(0);
    expect(player.played.end(0)).toBe(10);
  });

  it('should support seeking property', () => {
    expect(player.seeking).toBe(false);

    // Simulate scrubbing
    (player as any).isScrubbing = true;
    expect(player.seeking).toBe(true);
  });

  it('should dispatch seeking and seeked events during scrubbing', () => {
    const seekingSpy = vi.fn();
    const seekedSpy = vi.fn();
    player.addEventListener('seeking', seekingSpy);
    player.addEventListener('seeked', seekedSpy);

    const mockController = {
      getState: () => ({ isPlaying: false }),
      pause: vi.fn(),
      play: vi.fn(),
      dispose: vi.fn(),
    };
    (player as any).controller = mockController;

    // Simulate start scrub
    (player as any).handleScrubStart();
    expect(seekingSpy).toHaveBeenCalledTimes(1);
    expect(player.seeking).toBe(true);

    // Simulate end scrub
    (player as any).handleScrubEnd();
    expect(seekedSpy).toHaveBeenCalledTimes(1);
    expect(player.seeking).toBe(false);
  });

  it('should dispatch seeking and seeked events during programmatic seek', async () => {
    const seekingSpy = vi.fn();
    const seekedSpy = vi.fn();
    player.addEventListener('seeking', seekingSpy);
    player.addEventListener('seeked', seekedSpy);

    const mockController = {
      getState: () => ({ fps: 30, duration: 10 }),
      seek: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      dispose: vi.fn(),
    };
    (player as any).controller = mockController;

    player.currentTime = 5;
    // Wait for promise chain (microtasks)
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(seekingSpy).toHaveBeenCalledTimes(1);
    expect(mockController.seek).toHaveBeenCalledWith(150); // 5 * 30
    expect(seekedSpy).toHaveBeenCalledTimes(1);

    player.currentFrame = 10;
    // Wait for promise chain
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(seekingSpy).toHaveBeenCalledTimes(2);
    expect(mockController.seek).toHaveBeenCalledWith(10);
    expect(seekedSpy).toHaveBeenCalledTimes(2);
  });

  it('should support currentSrc property', () => {
    player.src = 'test.html';
    expect(player.currentSrc).toBe('test.html');
  });

  it('should support error property', () => {
    expect(player.error).toBeNull();

    // Mock controller error
    const mockController = {
      getState: () => ({ duration: 10, fps: 30, isPlaying: false }),
      pause: vi.fn(),
      play: vi.fn(),
      dispose: vi.fn(),
      subscribe: vi.fn(() => vi.fn()),
      onError: vi.fn((cb) => {
        // Trigger error immediately
        cb({ message: "Test Error" });
        return vi.fn();
      }),
      setInputProps: vi.fn(), setCaptions: vi.fn(),
      setAudioMuted: vi.fn(),
      setAudioVolume: vi.fn(),
      setPlaybackRate: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn(),
    };
    (player as any).setController(mockController);

    expect(player.error).not.toBeNull();
    expect(player.error?.message).toBe("Test Error");
    expect(player.error?.code).toBe(4);

    // Should clear on load
    (player as any).loadIframe("new.html");
    expect(player.error).toBeNull();
  });

  it('should support getSchema', async () => {
    const mockSchema = { prop: { type: 'string' } };
    const mockController = {
        getState: () => ({}),
        pause: vi.fn(),
        dispose: vi.fn(),
        getSchema: vi.fn().mockResolvedValue(mockSchema)
    };
    (player as any).controller = mockController;

    const schema = await player.getSchema();
    expect(schema).toBe(mockSchema);
    expect(mockController.getSchema).toHaveBeenCalled();
  });

  it('should support defaultMuted property', () => {
    expect(player.defaultMuted).toBe(false);

    player.defaultMuted = true;
    expect(player.hasAttribute('muted')).toBe(true);
    expect(player.defaultMuted).toBe(true);

    player.defaultMuted = false;
    expect(player.hasAttribute('muted')).toBe(false);
    expect(player.defaultMuted).toBe(false);
  });

  it('should support defaultPlaybackRate property', () => {
    const rateSpy = vi.fn();
    player.addEventListener('ratechange', rateSpy);

    expect(player.defaultPlaybackRate).toBe(1.0);

    player.defaultPlaybackRate = 2.0;
    expect(player.defaultPlaybackRate).toBe(2.0);
    expect(rateSpy).toHaveBeenCalledTimes(1);

    // Setting same value should not dispatch event
    player.defaultPlaybackRate = 2.0;
    expect(rateSpy).toHaveBeenCalledTimes(1);
  });

  it('should support preservesPitch property', () => {
    expect(player.preservesPitch).toBe(true);

    player.preservesPitch = false;
    expect(player.preservesPitch).toBe(false);
  });

  it('should support srcObject property', () => {
    const consoleSpy = vi.spyOn(console, 'warn');
    expect(player.srcObject).toBeNull();

    player.srcObject = {} as any;
    expect(consoleSpy).toHaveBeenCalledWith("HeliosPlayer does not support srcObject");
    expect(player.srcObject).toBeNull();
  });

  it('should support crossOrigin property', () => {
    expect(player.crossOrigin).toBeNull();

    player.crossOrigin = "anonymous";
    expect(player.getAttribute("crossorigin")).toBe("anonymous");
    expect(player.crossOrigin).toBe("anonymous");

    player.crossOrigin = null;
    expect(player.hasAttribute("crossorigin")).toBe(false);
    expect(player.crossOrigin).toBeNull();
  });

  it('should support canPlayType method', () => {
    expect(player.canPlayType("video/mp4")).toBe("");
    expect(player.canPlayType("application/json")).toBe("");
  });

  it('should support textTracks API', () => {
    expect(player.textTracks).toBeDefined();
    expect(player.textTracks.length).toBe(0);

    const track = player.addTextTrack("captions", "English", "en");
    expect(player.textTracks.length).toBe(1);
    expect(track.kind).toBe("captions");
    expect(track.label).toBe("English");
    expect(track.language).toBe("en");
    expect(track.mode).toBe("disabled");
  });

  it('should update controller when text track mode changes', () => {
     const mockController = {
        getState: () => ({}),
        pause: vi.fn(),
        dispose: vi.fn(),
        setCaptions: vi.fn(),
        subscribe: vi.fn(),
        onError: vi.fn(),
     };
     (player as any).controller = mockController;

     const track = player.addTextTrack("captions", "English", "en");
     track.addCue(new CueClass(0, 5, "Hello"));

     // Initially disabled, setCaptions not called
     expect(mockController.setCaptions).not.toHaveBeenCalled();

     // Show track
     track.mode = "showing";
     expect(mockController.setCaptions).toHaveBeenCalledWith([
         expect.objectContaining({ text: "Hello", startTime: 0, endTime: 5000 })
     ]);

     // Hide track
     mockController.setCaptions.mockClear();
     track.mode = "hidden";
     expect(mockController.setCaptions).toHaveBeenCalledWith([]);
  });

  it('should enforce mutual exclusivity for caption tracks', () => {
      const mockController = {
        getState: () => ({}),
        pause: vi.fn(),
        dispose: vi.fn(),
        setCaptions: vi.fn(),
        subscribe: vi.fn(),
        onError: vi.fn(),
     };
     (player as any).controller = mockController;

     const track1 = player.addTextTrack("captions", "English", "en");
     const track2 = player.addTextTrack("captions", "Spanish", "es");

     track1.mode = "showing";
     expect(track1.mode).toBe("showing");
     expect(track2.mode).toBe("disabled");

     track2.mode = "showing";
     expect(track2.mode).toBe("showing");
     expect(track1.mode).toBe("hidden"); // Our logic sets it to hidden
  });

  it('should reload current src when load() is called', () => {
    player.src = 'test.html';
    // Accessing private method via (player as any)
    const loadIframeSpy = vi.spyOn(player as any, 'loadIframe');

    player.load();
    expect(loadIframeSpy).toHaveBeenCalledWith('test.html');
  });

  it('should support standard TextTrackCue and TextTrackCueList', () => {
    const track = player.addTextTrack("captions", "English", "en");
    expect(track.cues).toBeDefined();
    // Check it's iterable
    expect(typeof track.cues[Symbol.iterator]).toBe('function');

    const cue = new CueClass(0, 1, "Hello");
    cue.id = "cue1";
    track.addCue(cue);

    // Check list access
    expect(track.cues.length).toBe(1);
    expect(track.cues[0]).toBe(cue);

    // Check getCueById
    expect(track.cues.getCueById("cue1")).toBe(cue);
    expect(track.cues.getCueById("missing")).toBeNull();

    // Check cue properties
    expect(cue.track).toBe(track);
    expect(cue.pauseOnExit).toBe(false);
    cue.pauseOnExit = true;
    expect(cue.pauseOnExit).toBe(true);

    // Check removing cue clears track
    track.removeCue(cue);
    expect(cue.track).toBeNull();
    expect(track.cues.length).toBe(0);
  });

  it('should support videoTracks API', () => {
    expect(player.videoTracks).toBeDefined();
    expect(player.videoTracks.length).toBeGreaterThanOrEqual(1);

    const track = player.videoTracks[0];
    expect(track.kind).toBe("main");
    expect(track.selected).toBe(true);

    track.selected = false;
    expect(track.selected).toBe(false);
    expect(player.videoTracks.selectedIndex).toBe(-1);
  });
});
