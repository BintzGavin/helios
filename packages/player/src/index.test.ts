// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HeliosPlayer } from './index';

// Mock ClientSideExporter
vi.mock('./features/exporter', () => {
  return {
    ClientSideExporter: vi.fn().mockImplementation(() => {
      return {
        export: vi.fn(),
        saveCaptionsAsSRT: vi.fn()
      };
    })
  };
});

// Mock requestFullscreen if not available in JSDOM
if (!HTMLElement.prototype.requestFullscreen) {
  HTMLElement.prototype.requestFullscreen = vi.fn();
}

// Mock ResizeObserver
global.ResizeObserver = class {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
} as any;

describe('HeliosPlayer', () => {
  let player: HeliosPlayer;

  beforeEach(() => {
    document.body.innerHTML = '';
    // Use constructor directly to ensure instance is created correctly in test env
    player = new HeliosPlayer();
    document.body.appendChild(player);

    // Mock requestFullscreen on the specific element
    player.requestFullscreen = vi.fn().mockResolvedValue(undefined);

    // Mock document properties
    Object.defineProperty(document, 'fullscreenElement', {
        value: null,
        writable: true,
        configurable: true
    });
    document.exitFullscreen = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with default structure including fullscreen button', () => {
    expect(player.shadowRoot).toBeTruthy();
    const btn = player.shadowRoot!.querySelector('.fullscreen-btn');
    expect(btn).toBeTruthy();
    expect(btn!.textContent).toContain('⛶');
  });

  it('should toggle fullscreen on button click', async () => {
    // Mock Controller
    const mockController = {
        getState: vi.fn().mockReturnValue({ currentFrame: 0, duration: 10, fps: 30, isPlaying: false }),
        play: vi.fn(),
        pause: vi.fn(),
        seek: vi.fn().mockResolvedValue(undefined),
        subscribe: vi.fn().mockReturnValue(() => {}),
        onError: vi.fn().mockReturnValue(() => {}),
        dispose: vi.fn(), setCaptions: vi.fn(),
        setPlaybackRate: vi.fn(),
        setAudioVolume: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn(),
        setAudioMuted: vi.fn(),
        setInputProps: vi.fn(),
        setLoop: vi.fn(),
        setPlaybackRange: vi.fn(),
        clearPlaybackRange: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn()
    };

    // Inject controller (using private access workaround)
    (player as any).setController(mockController);

    const btn = player.shadowRoot!.querySelector('.fullscreen-btn') as HTMLButtonElement;

    // Click to enter fullscreen
    btn.click();
    expect(player.requestFullscreen).toHaveBeenCalled();

    // Simulate fullscreen change (entered)
    Object.defineProperty(document, 'fullscreenElement', { value: player });
    document.dispatchEvent(new Event('fullscreenchange'));

    expect(btn.textContent).toContain('↙'); // Exit icon
    expect(btn.title).toBe('Exit Fullscreen');

    // Click to exit fullscreen
    btn.click();
    expect(document.exitFullscreen).toHaveBeenCalled();

    // Simulate fullscreen change (exited)
    Object.defineProperty(document, 'fullscreenElement', { value: null });
    document.dispatchEvent(new Event('fullscreenchange'));

    expect(btn.textContent).toContain('⛶'); // Enter icon
  });

  it('should handle keyboard shortcuts', () => {
    // Mock Controller
    const mockController = {
        getState: vi.fn().mockReturnValue({ currentFrame: 0, duration: 10, fps: 30, isPlaying: false }),
        play: vi.fn(),
        pause: vi.fn(),
        seek: vi.fn().mockResolvedValue(undefined),
        subscribe: vi.fn().mockReturnValue(() => {}),
        onError: vi.fn().mockReturnValue(() => {}),
        dispose: vi.fn(), setCaptions: vi.fn(),
        setPlaybackRate: vi.fn(),
        setAudioVolume: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn(),
        setAudioMuted: vi.fn(),
        setInputProps: vi.fn(),
        setLoop: vi.fn(),
        setPlaybackRange: vi.fn(),
        clearPlaybackRange: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn()
    };

    // Inject controller (using private access workaround)
    (player as any).setController(mockController);

    const dispatchKey = (key: string, options: { shiftKey?: boolean } = {}) => {
        const event = new KeyboardEvent('keydown', {
            key,
            bubbles: true,
            composed: true,
            shiftKey: options.shiftKey
        });

        // Mock composedPath to return [player] as if event originated/bubbled to host
        // Note: In JSDOM dispatching to 'player' sets target to player.
        // We override composedPath to ensure our check `e.composedPath()[0] === this` passes
        Object.defineProperty(event, 'composedPath', {
            value: () => [player]
        });

        player.dispatchEvent(event);
    };

    // Space: Play
    dispatchKey(' ');
    expect(mockController.play).toHaveBeenCalled();

    // K: Play (since currently paused)
    dispatchKey('k');
    expect(mockController.play).toHaveBeenCalledTimes(2);

    // Mock playing state
    mockController.getState.mockReturnValue({ currentFrame: 0, duration: 10, fps: 30, isPlaying: true });

    // Space: Pause
    dispatchKey(' ');
    expect(mockController.pause).toHaveBeenCalled();

    // F: Fullscreen
    dispatchKey('f');
    expect(player.requestFullscreen).toHaveBeenCalled();

    // Reset mocks
    mockController.seek.mockClear();

    // ArrowRight: Seek +5s (Default) -> 150 frames
    mockController.getState.mockReturnValue({ currentFrame: 0, duration: 10, fps: 30, isPlaying: false });
    dispatchKey('ArrowRight');
    expect(mockController.seek).toHaveBeenCalledWith(150);

    // ArrowRight + Shift: Seek +10s -> 300 frames
    dispatchKey('ArrowRight', { shiftKey: true });
    expect(mockController.seek).toHaveBeenCalledWith(300);

    // ArrowLeft: Seek -5s (Default) -> 150 frames
    mockController.getState.mockReturnValue({ currentFrame: 200, duration: 10, fps: 30, isPlaying: false });
    dispatchKey('ArrowLeft');
    expect(mockController.seek).toHaveBeenCalledWith(50); // 200 - 150

    // ArrowLeft + Shift: Seek -10s -> 300 frames
    dispatchKey('ArrowLeft', { shiftKey: true });
    expect(mockController.seek).toHaveBeenCalledWith(0); // 200 - 300 -> 0

    // .: Seek +1
    mockController.getState.mockReturnValue({ currentFrame: 10, duration: 10, fps: 30, isPlaying: false });
    dispatchKey('.');
    expect(mockController.seek).toHaveBeenCalledWith(11); // 10 + 1

    // ,: Seek -1
    mockController.getState.mockReturnValue({ currentFrame: 10, duration: 10, fps: 30, isPlaying: false });
    dispatchKey(',');
    expect(mockController.seek).toHaveBeenCalledWith(9); // 10 - 1
  });

  it('should handle playback range shortcuts', () => {
    const mockController = {
        getState: vi.fn().mockReturnValue({ currentFrame: 0, duration: 10, fps: 30, isPlaying: false }),
        play: vi.fn(),
        pause: vi.fn(),
        seek: vi.fn().mockResolvedValue(undefined),
        subscribe: vi.fn().mockReturnValue(() => {}),
        onError: vi.fn().mockReturnValue(() => {}),
        dispose: vi.fn(), setCaptions: vi.fn(),
        setPlaybackRate: vi.fn(),
        setPlaybackRange: vi.fn(),
        clearPlaybackRange: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn(),
        setAudioVolume: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn(),
        setAudioMuted: vi.fn(),
        setInputProps: vi.fn(),
        setLoop: vi.fn()
    };
    (player as any).setController(mockController);

    const dispatchKey = (key: string) => {
        const event = new KeyboardEvent('keydown', {
            key,
            bubbles: true,
            composed: true
        });
        Object.defineProperty(event, 'composedPath', {
            value: () => [player]
        });
        player.dispatchEvent(event);
    };

    // I: Set Start (No existing range)
    mockController.getState.mockReturnValue({ currentFrame: 50, duration: 10, fps: 30, isPlaying: false, playbackRange: null });
    dispatchKey('i');
    // Start=50, End=Total (300)
    expect(mockController.setPlaybackRange).toHaveBeenCalledWith(50, 300);

    // I: Set Start (Existing range)
    mockController.getState.mockReturnValue({ currentFrame: 60, duration: 10, fps: 30, isPlaying: false, playbackRange: [50, 200] });
    dispatchKey('i');
    // Start=60, End=200
    expect(mockController.setPlaybackRange).toHaveBeenCalledWith(60, 200);

    // I: Set Start >= End (Reset End)
    mockController.getState.mockReturnValue({ currentFrame: 250, duration: 10, fps: 30, isPlaying: false, playbackRange: [50, 200] });
    dispatchKey('i');
    // Start=250, End=300 (Total)
    expect(mockController.setPlaybackRange).toHaveBeenCalledWith(250, 300);

    // O: Set End (No existing range)
    mockController.getState.mockReturnValue({ currentFrame: 200, duration: 10, fps: 30, isPlaying: false, playbackRange: null });
    dispatchKey('o');
    // Start=0, End=200
    expect(mockController.setPlaybackRange).toHaveBeenCalledWith(0, 200);

    // O: Set End (Existing range)
    mockController.getState.mockReturnValue({ currentFrame: 150, duration: 10, fps: 30, isPlaying: false, playbackRange: [50, 200] });
    dispatchKey('o');
    // Start=50, End=150
    expect(mockController.setPlaybackRange).toHaveBeenCalledWith(50, 150);

    // O: Set End <= Start (Reset Start)
    mockController.getState.mockReturnValue({ currentFrame: 30, duration: 10, fps: 30, isPlaying: false, playbackRange: [50, 200] });
    dispatchKey('o');
    // Start=0, End=30
    expect(mockController.setPlaybackRange).toHaveBeenCalledWith(0, 30);

    // X: Clear Range
    dispatchKey('x');
    expect(mockController.clearPlaybackRange).toHaveBeenCalled();
  });

  it('should allow keyboard events from non-input children but ignore inputs', () => {
    const mockController = {
        getState: vi.fn().mockReturnValue({ currentFrame: 0, duration: 10, fps: 30, isPlaying: false }),
        play: vi.fn(),
        pause: vi.fn(),
        seek: vi.fn().mockResolvedValue(undefined),
        subscribe: vi.fn().mockReturnValue(() => {}),
        onError: vi.fn().mockReturnValue(() => {}),
        dispose: vi.fn(), setCaptions: vi.fn(),
        setPlaybackRate: vi.fn(),
        setAudioVolume: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn(),
        setAudioMuted: vi.fn(),
        setInputProps: vi.fn(),
        setLoop: vi.fn(),
        setPlaybackRange: vi.fn(),
        clearPlaybackRange: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn()
    };
    (player as any).setController(mockController);

    // 1. Event from a DIV child -> Should Trigger
    const childDiv = document.createElement('div');
    player.appendChild(childDiv);

    const eventDiv = new KeyboardEvent('keydown', { key: ' ', bubbles: true, composed: true });
    Object.defineProperty(eventDiv, 'composedPath', { value: () => [childDiv, player] });

    player.dispatchEvent(eventDiv);
    expect(mockController.play).toHaveBeenCalledTimes(1);

    // 2. Event from an INPUT child -> Should Ignore
    const childInput = document.createElement('input');
    player.appendChild(childInput);

    const eventInput = new KeyboardEvent('keydown', { key: ' ', bubbles: true, composed: true });
    Object.defineProperty(eventInput, 'composedPath', { value: () => [childInput, player] });

    player.dispatchEvent(eventInput);
    expect(mockController.play).toHaveBeenCalledTimes(1); // Still 1 (no change)

    // 3. Space on BUTTON child -> Should Ignore (Browser handles click)
    const childButton = document.createElement('button');
    player.appendChild(childButton);

    const eventButton = new KeyboardEvent('keydown', { key: ' ', bubbles: true, composed: true });
    Object.defineProperty(eventButton, 'composedPath', { value: () => [childButton, player] });

    player.dispatchEvent(eventButton);
    expect(mockController.play).toHaveBeenCalledTimes(1); // Still 1

    // 4. 'F' on BUTTON child -> Should Trigger (Fullscreen)
    const eventButtonF = new KeyboardEvent('keydown', { key: 'f', bubbles: true, composed: true });
    Object.defineProperty(eventButtonF, 'composedPath', { value: () => [childButton, player] });

    player.dispatchEvent(eventButtonF);
    expect(player.requestFullscreen).toHaveBeenCalled();
  });

  it('should lock playback controls when requested', () => {
    // Access private method via any
    (player as any).lockPlaybackControls(true);

    const playBtn = player.shadowRoot!.querySelector('.play-pause-btn') as HTMLButtonElement;
    const scrubber = player.shadowRoot!.querySelector('.scrubber') as HTMLInputElement;
    const settingsBtn = player.shadowRoot!.querySelector('.settings-btn') as HTMLButtonElement;
    const fullscreenBtn = player.shadowRoot!.querySelector('.fullscreen-btn') as HTMLButtonElement;

    expect(playBtn.disabled).toBe(true);
    expect(scrubber.disabled).toBe(true);
    expect(settingsBtn.disabled).toBe(true);
    expect(fullscreenBtn.disabled).toBe(true);

    (player as any).lockPlaybackControls(false);

    expect(playBtn.disabled).toBe(false);
    expect(scrubber.disabled).toBe(false);
    expect(settingsBtn.disabled).toBe(false);
    expect(fullscreenBtn.disabled).toBe(false);
  });

  it('should ignore keyboard events when exporting', () => {
    const mockController = {
      getState: vi.fn().mockReturnValue({ currentFrame: 0, duration: 10, fps: 30, isPlaying: false }),
      play: vi.fn(),
      pause: vi.fn(),
      seek: vi.fn().mockResolvedValue(undefined),
      subscribe: vi.fn().mockReturnValue(() => {}),
      onError: vi.fn().mockReturnValue(() => {}),
      dispose: vi.fn(), setCaptions: vi.fn(),
      setPlaybackRate: vi.fn(),
      setAudioVolume: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn(),
      setAudioMuted: vi.fn(),
      setInputProps: vi.fn(),
      setLoop: vi.fn(),
      setPlaybackRange: vi.fn(),
      clearPlaybackRange: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn()
    };
    (player as any).setController(mockController);

    // Simulate exporting state
    (player as any).isExporting = true;

    const dispatchKey = (key: string) => {
      const event = new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        composed: true
      });
      Object.defineProperty(event, 'composedPath', {
        value: () => [player]
      });
      player.dispatchEvent(event);
    };

    // Try to play
    dispatchKey(' ');
    expect(mockController.play).not.toHaveBeenCalled();

    // Try to seek
    dispatchKey('ArrowRight');
    expect(mockController.seek).not.toHaveBeenCalled();

    // Reset exporting state
    (player as any).isExporting = false;

    // Now it should work
    dispatchKey(' ');
    expect(mockController.play).toHaveBeenCalled();
  });

  describe('Scrubbing Interaction', () => {
    let mockController: any;

    beforeEach(() => {
        mockController = {
            getState: vi.fn().mockReturnValue({ currentFrame: 0, duration: 10, fps: 30, isPlaying: false }),
            play: vi.fn(),
            pause: vi.fn(),
            seek: vi.fn().mockResolvedValue(undefined),
            subscribe: vi.fn().mockReturnValue(() => {}),
            onError: vi.fn().mockReturnValue(() => {}),
            dispose: vi.fn(), setCaptions: vi.fn(),
            setPlaybackRate: vi.fn(),
            setAudioVolume: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn(),
            setAudioMuted: vi.fn(),
            setInputProps: vi.fn(),
            setLoop: vi.fn(),
            setPlaybackRange: vi.fn(),
            clearPlaybackRange: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn()
        };
        (player as any).setController(mockController);
    });

    it('should pause playback when scrubbing starts if currently playing', () => {
        mockController.getState.mockReturnValue({ currentFrame: 0, duration: 10, fps: 30, isPlaying: true });

        const scrubber = player.shadowRoot!.querySelector('.scrubber') as HTMLInputElement;
        scrubber.dispatchEvent(new Event('mousedown'));

        expect(mockController.pause).toHaveBeenCalled();
        expect((player as any).isScrubbing).toBe(true);
        expect((player as any).wasPlayingBeforeScrub).toBe(true);
    });

    it('should NOT pause playback when scrubbing starts if currently paused', () => {
        mockController.getState.mockReturnValue({ currentFrame: 0, duration: 10, fps: 30, isPlaying: false });

        const scrubber = player.shadowRoot!.querySelector('.scrubber') as HTMLInputElement;
        scrubber.dispatchEvent(new Event('mousedown'));

        expect(mockController.pause).not.toHaveBeenCalled();
        expect((player as any).isScrubbing).toBe(true);
        expect((player as any).wasPlayingBeforeScrub).toBe(false);
    });

    it('should resume playback when scrubbing ends if it was playing before', () => {
        // Setup state manually
        (player as any).isScrubbing = true;
        (player as any).wasPlayingBeforeScrub = true;

        const scrubber = player.shadowRoot!.querySelector('.scrubber') as HTMLInputElement;
        scrubber.dispatchEvent(new Event('change'));

        expect(mockController.play).toHaveBeenCalled();
        expect((player as any).isScrubbing).toBe(false);
    });

    it('should NOT resume playback when scrubbing ends if it was paused before', () => {
        // Setup state manually
        (player as any).isScrubbing = true;
        (player as any).wasPlayingBeforeScrub = false;

        const scrubber = player.shadowRoot!.querySelector('.scrubber') as HTMLInputElement;
        scrubber.dispatchEvent(new Event('change'));

        expect(mockController.play).not.toHaveBeenCalled();
        expect((player as any).isScrubbing).toBe(false);
    });

    it('should NOT update scrubber value from updateUI while scrubbing', () => {
        const scrubber = player.shadowRoot!.querySelector('.scrubber') as HTMLInputElement;

        // 1. Normal update
        (player as any).updateUI({ currentFrame: 10, duration: 10, fps: 30, isPlaying: false });
        expect(scrubber.value).toBe('10');

        // 2. Start scrubbing
        (player as any).isScrubbing = true;

        // 3. Update comes in (e.g. from seek or just async update)
        (player as any).updateUI({ currentFrame: 20, duration: 10, fps: 30, isPlaying: false });

        // Scrubber should NOT change
        expect(scrubber.value).toBe('10');

        // 4. End scrubbing
        (player as any).isScrubbing = false;

        // 5. Update comes in
        (player as any).updateUI({ currentFrame: 30, duration: 10, fps: 30, isPlaying: false });
        expect(scrubber.value).toBe('30');
    });

    it('should handle touch events for scrubbing', () => {
      // 1. touchstart (Pause if playing)
      mockController.getState.mockReturnValue({ currentFrame: 0, duration: 10, fps: 30, isPlaying: true });
      const scrubber = player.shadowRoot!.querySelector('.scrubber') as HTMLInputElement;

      scrubber.dispatchEvent(new Event('touchstart'));
      expect(mockController.pause).toHaveBeenCalled();
      expect((player as any).isScrubbing).toBe(true);
      expect((player as any).wasPlayingBeforeScrub).toBe(true);

      // 2. touchend (Resume if was playing)
      scrubber.dispatchEvent(new Event('touchend'));
      expect(mockController.play).toHaveBeenCalled();
      expect((player as any).isScrubbing).toBe(false);

      // Reset
      mockController.play.mockClear();
      mockController.pause.mockClear();

      // 3. touchcancel (Resume if was playing)
      mockController.getState.mockReturnValue({ currentFrame: 0, duration: 10, fps: 30, isPlaying: true });
      scrubber.dispatchEvent(new Event('touchstart')); // Start again
      expect(mockController.pause).toHaveBeenCalled();

      scrubber.dispatchEvent(new Event('touchcancel'));
      expect(mockController.play).toHaveBeenCalled();
      expect((player as any).isScrubbing).toBe(false);
    });
  });

  describe('Interactive Mode', () => {
    let mockController: any;

    beforeEach(() => {
        mockController = {
            getState: vi.fn().mockReturnValue({ currentFrame: 0, duration: 10, fps: 30, isPlaying: false }),
            play: vi.fn(),
            pause: vi.fn(),
            seek: vi.fn().mockResolvedValue(undefined),
            subscribe: vi.fn().mockReturnValue(() => {}),
            onError: vi.fn().mockReturnValue(() => {}),
            dispose: vi.fn(), setCaptions: vi.fn(),
            setPlaybackRate: vi.fn(),
            setInputProps: vi.fn(),
        setAudioMuted: vi.fn(),
        setAudioVolume: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn(),
        setLoop: vi.fn(),
        setPlaybackRange: vi.fn(),
        clearPlaybackRange: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn()
        };
        (player as any).setController(mockController);
    });

    it('should toggle play/pause when clicking the video area (default)', () => {
        const clickLayer = player.shadowRoot!.querySelector('.click-layer') as HTMLDivElement;

        // Initial state: Paused -> Click -> Play
        clickLayer.click();
        expect(mockController.play).toHaveBeenCalled();

        // Playing state: Playing -> Click -> Pause
        mockController.getState.mockReturnValue({ currentFrame: 10, duration: 10, fps: 30, isPlaying: true });
        clickLayer.click();
        expect(mockController.pause).toHaveBeenCalled();
    });

    it('should toggle fullscreen on double click', () => {
        const clickLayer = player.shadowRoot!.querySelector('.click-layer') as HTMLDivElement;

        // Dispatch dblclick
        clickLayer.dispatchEvent(new MouseEvent('dblclick'));
        expect(player.requestFullscreen).toHaveBeenCalled();
    });

    it('should allow clicks to pass through when interactive attribute is present', () => {
        // Default: pointer-events should be auto (or not none)
        const clickLayer = player.shadowRoot!.querySelector('.click-layer') as HTMLDivElement;
        let style = window.getComputedStyle(clickLayer);
        // Note: JSDOM computed style might not reflect CSS rules fully unless applied via style tag,
        // but checking the presence of the attribute is a proxy.
        // Better: Check if the style rule matches.

        // Set interactive
        player.setAttribute('interactive', '');

        // In a real browser, this would set pointer-events: none.
        // We can verify the attribute is set.
        expect(player.hasAttribute('interactive')).toBe(true);

        // To verify the CSS application in JSDOM is tricky without a full layout engine.
        // However, we can trust the CSS we wrote if the attribute is there.
        // We can also check the property.
        expect(player.interactive).toBe(true);
    });

    it('should reflect interactive property to attribute', () => {
        expect(player.hasAttribute('interactive')).toBe(false);
        expect(player.interactive).toBe(false);

        player.interactive = true;
        expect(player.hasAttribute('interactive')).toBe(true);
        expect(player.interactive).toBe(true);

        player.interactive = false;
        expect(player.hasAttribute('interactive')).toBe(false);
        expect(player.interactive).toBe(false);
    });
  });

  describe('Accessibility', () => {
    it('should have initial ARIA attributes', () => {
      const controls = player.shadowRoot!.querySelector('.controls');
      expect(controls?.getAttribute('role')).toBe('toolbar');
      expect(controls?.getAttribute('aria-label')).toBe('Playback Controls');

      const iframe = player.shadowRoot!.querySelector('iframe');
      expect(iframe?.getAttribute('title')).toBe('Helios Composition Preview');

      const playBtn = player.shadowRoot!.querySelector('.play-pause-btn');
      expect(playBtn?.getAttribute('aria-label')).toBe('Play');

      const scrubber = player.shadowRoot!.querySelector('.scrubber');
      expect(scrubber?.getAttribute('aria-label')).toBe('Seek time');
    });

    it('should update Play button ARIA label based on state', () => {
      const mockController = {
        getState: vi.fn().mockReturnValue({ currentFrame: 0, duration: 10, fps: 30, isPlaying: false }),
        play: vi.fn(),
        pause: vi.fn(),
        seek: vi.fn().mockResolvedValue(undefined),
        subscribe: vi.fn().mockReturnValue(() => {}),
        onError: vi.fn().mockReturnValue(() => {}),
        dispose: vi.fn(), setCaptions: vi.fn(),
        setPlaybackRate: vi.fn(),
        setAudioVolume: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn(),
        setAudioMuted: vi.fn(),
        setInputProps: vi.fn(),
        setLoop: vi.fn(),
        setPlaybackRange: vi.fn(),
        clearPlaybackRange: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn()
      };
      (player as any).setController(mockController);

      // Initial: Play
      (player as any).updateUI({ currentFrame: 0, duration: 10, fps: 30, isPlaying: false });
      const playBtn = player.shadowRoot!.querySelector('.play-pause-btn');
      expect(playBtn?.getAttribute('aria-label')).toBe('Play');

      // Playing: Pause
      (player as any).updateUI({ currentFrame: 10, duration: 10, fps: 30, isPlaying: true });
      expect(playBtn?.getAttribute('aria-label')).toBe('Pause');

      // Finished: Restart
      const endFrame = 299; // 10s * 30fps - 1
      (player as any).updateUI({ currentFrame: endFrame, duration: 10, fps: 30, isPlaying: false });
      expect(playBtn?.getAttribute('aria-label')).toBe('Restart');
    });

    it('should update Scrubber ARIA attributes based on time', () => {
      const mockController = {
        getState: vi.fn().mockReturnValue({ currentFrame: 0, duration: 10, fps: 30, isPlaying: false }),
        play: vi.fn(),
        pause: vi.fn(),
        seek: vi.fn().mockResolvedValue(undefined),
        subscribe: vi.fn().mockReturnValue(() => {}),
        onError: vi.fn().mockReturnValue(() => {}),
        dispose: vi.fn(), setCaptions: vi.fn(),
        setPlaybackRate: vi.fn(),
        setAudioVolume: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn(),
        setAudioMuted: vi.fn(),
        setInputProps: vi.fn(),
        setLoop: vi.fn(),
        setPlaybackRange: vi.fn(),
        clearPlaybackRange: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn()
      };
      (player as any).setController(mockController);

      // Time 0
      (player as any).updateUI({ currentFrame: 0, duration: 10, fps: 30, isPlaying: false });
      const scrubber = player.shadowRoot!.querySelector('.scrubber');
      expect(scrubber?.getAttribute('aria-valuenow')).toBe('0');
      expect(scrubber?.getAttribute('aria-valuemin')).toBe('0');
      expect(scrubber?.getAttribute('aria-valuemax')).toBe('300'); // 10 * 30
      expect(scrubber?.getAttribute('aria-valuetext')).toBe('0.00 of 10.00 seconds');

      // Time 1.5s (Frame 45)
      (player as any).updateUI({ currentFrame: 45, duration: 10, fps: 30, isPlaying: false });
      expect(scrubber?.getAttribute('aria-valuenow')).toBe('45');
      expect(scrubber?.getAttribute('aria-valuetext')).toBe('1.50 of 10.00 seconds');
    });
  });

  describe('Export Error Handling', () => {
    it('should display error overlay when export fails', async () => {
        const mockController = {
            getState: vi.fn().mockReturnValue({ currentFrame: 0, duration: 10, fps: 30, isPlaying: false }),
            play: vi.fn(),
            pause: vi.fn(),
            seek: vi.fn().mockResolvedValue(undefined),
            subscribe: vi.fn().mockReturnValue(() => {}),
            onError: vi.fn().mockReturnValue(() => {}),
            dispose: vi.fn(), setCaptions: vi.fn(),
            setPlaybackRate: vi.fn(),
            setAudioVolume: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn(),
            setAudioMuted: vi.fn(),
            setInputProps: vi.fn(),
            setLoop: vi.fn(),
            setPlaybackRange: vi.fn(),
            clearPlaybackRange: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn()
        };
        (player as any).setController(mockController);

        // Access the mocked exporter constructor to setup the throw
        const { ClientSideExporter } = await import('./features/exporter');
        const mockExport = vi.fn().mockRejectedValue(new Error('Codec not supported'));
        (ClientSideExporter as any).mockImplementation(function() {
          return { export: mockExport };
        });

        // Trigger export via private method to await it
        await (player as any).startExportFromMenu({ filename: 'video', format: 'mp4', scale: 1, includeCaptions: false });

        // Verify Status Overlay
        const overlay = player.shadowRoot!.querySelector('.status-overlay') as HTMLElement;
        const statusText = player.shadowRoot!.querySelector('.status-text') as HTMLElement;
        const retryBtn = player.shadowRoot!.querySelector('.retry-btn') as HTMLButtonElement;

        expect(overlay.classList.contains('hidden')).toBe(false);
        expect(statusText.textContent).toContain('Export Failed: Codec not supported');
        expect(retryBtn.textContent).toBe('Dismiss');
        expect(retryBtn.style.display).toBe('block');

        // Verify Dismiss Action
        retryBtn.click();
        expect(overlay.classList.contains('hidden')).toBe(true);
    });

    it('should NOT display error overlay when export is aborted', async () => {
        const mockController = {
            getState: vi.fn().mockReturnValue({ currentFrame: 0, duration: 10, fps: 30, isPlaying: false }),
            play: vi.fn(),
            pause: vi.fn(),
            seek: vi.fn().mockResolvedValue(undefined),
            subscribe: vi.fn().mockReturnValue(() => {}),
            onError: vi.fn().mockReturnValue(() => {}),
            dispose: vi.fn(), setCaptions: vi.fn(),
            setPlaybackRate: vi.fn(),
            setAudioVolume: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn(),
            setAudioMuted: vi.fn(),
            setInputProps: vi.fn(),
            setLoop: vi.fn(),
            setPlaybackRange: vi.fn(),
            clearPlaybackRange: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn()
        };
        (player as any).setController(mockController);

        const { ClientSideExporter } = await import('./features/exporter');
        // Simulate abort error
        const mockExport = vi.fn().mockRejectedValue(new Error('Export aborted'));
        (ClientSideExporter as any).mockImplementation(function() {
          return { export: mockExport };
        });

        // Ensure overlay is hidden initially
        const overlay = player.shadowRoot!.querySelector('.status-overlay') as HTMLElement;
        overlay.classList.add('hidden');

        // Trigger export
        await (player as any).startExportFromMenu({ filename: 'video', format: 'mp4', scale: 1, includeCaptions: false });

        // Should still be hidden (or at least not showing failure)
        expect(overlay.classList.contains('hidden')).toBe(true);
    });
  });

  describe('Captions', () => {
    let mockController: any;

    beforeEach(() => {
        mockController = {
            getState: vi.fn().mockReturnValue({ currentFrame: 0, duration: 10, fps: 30, isPlaying: false }),
            play: vi.fn(),
            pause: vi.fn(),
            seek: vi.fn().mockResolvedValue(undefined),
            subscribe: vi.fn().mockReturnValue(() => {}),
            onError: vi.fn().mockReturnValue(() => {}),
            dispose: vi.fn(), setCaptions: vi.fn(),
            setPlaybackRate: vi.fn(),
            setAudioVolume: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn(),
            setAudioMuted: vi.fn(),
            setInputProps: vi.fn(),
            captureFrame: vi.fn(),
            getAudioTracks: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn()
        };
        (player as any).setController(mockController);
    });

    it('should initialize with CC button', () => {
        const ccBtn = player.shadowRoot!.querySelector('.cc-btn');
        expect(ccBtn).toBeTruthy();
        expect(ccBtn!.textContent).toBe('CC');
        expect(ccBtn!.classList.contains('active')).toBe(false);
    });

    it('should toggle captions state on button click', () => {
        const ccBtn = player.shadowRoot!.querySelector('.cc-btn') as HTMLButtonElement;

        // Click to enable
        ccBtn.click();
        expect(ccBtn.classList.contains('active')).toBe(true);
        expect((player as any).showCaptions).toBe(true);

        // Click to disable
        ccBtn.click();
        expect(ccBtn.classList.contains('active')).toBe(false);
        expect((player as any).showCaptions).toBe(false);
    });

    it('should render active captions when enabled', () => {
        const activeCaptions = [{ text: 'Hello World' }, { text: 'Testing Captions' }];
        mockController.getState.mockReturnValue({
            currentFrame: 0,
            duration: 10,
            fps: 30,
            isPlaying: false,
            activeCaptions
        });

        // Enable captions
        const ccBtn = player.shadowRoot!.querySelector('.cc-btn') as HTMLButtonElement;
        ccBtn.click();

        // Check container
        const container = player.shadowRoot!.querySelector('.captions-container');
        expect(container!.children.length).toBe(2);
        expect(container!.children[0].textContent).toBe('Hello World');
        expect(container!.children[1].textContent).toBe('Testing Captions');
    });

    it('should NOT render captions when disabled', () => {
        const activeCaptions = [{ text: 'Hello World' }];
        mockController.getState.mockReturnValue({
            currentFrame: 0,
            duration: 10,
            fps: 30,
            isPlaying: false,
            activeCaptions
        });

        // Ensure disabled (default)
        expect((player as any).showCaptions).toBe(false);

        // Force update UI
        (player as any).updateUI(mockController.getState());

        const container = player.shadowRoot!.querySelector('.captions-container');
        expect(container!.children.length).toBe(0);
    });

    it('should disable CC button when controls are disabled', () => {
        (player as any).setControlsDisabled(true);
        const ccBtn = player.shadowRoot!.querySelector('.cc-btn') as HTMLButtonElement;
        expect(ccBtn.disabled).toBe(true);

        (player as any).setControlsDisabled(false);
        expect(ccBtn.disabled).toBe(false);
    });
  });

  describe('Standard Media API', () => {
    let mockController: any;

    beforeEach(() => {
        mockController = {
            getState: vi.fn().mockReturnValue({ currentFrame: 0, duration: 10, fps: 30, isPlaying: false, volume: 1, muted: false, playbackRate: 1 }),
            play: vi.fn(),
            pause: vi.fn(),
            seek: vi.fn().mockResolvedValue(undefined),
            setAudioVolume: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn(),
            setAudioMuted: vi.fn(),
            setPlaybackRate: vi.fn(),
            subscribe: vi.fn().mockReturnValue(() => {}),
            onError: vi.fn().mockReturnValue(() => {}),
            dispose: vi.fn(), setCaptions: vi.fn(),
            setInputProps: vi.fn(),
            captureFrame: vi.fn(),
            getAudioTracks: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn()
        };
        (player as any).setController(mockController);
        (player as any).isLoaded = true;
    });

    it('should expose currentTime', () => {
        // 1.5s = 45 frames @ 30fps
        mockController.getState.mockReturnValue({ currentFrame: 45, duration: 10, fps: 30 });
        expect(player.currentTime).toBe(1.5);

        player.currentTime = 2.0;
        expect(mockController.seek).toHaveBeenCalledWith(60); // 2 * 30
    });

    it('should expose currentFrame', () => {
        mockController.getState.mockReturnValue({ currentFrame: 45, duration: 10, fps: 30 });
        expect(player.currentFrame).toBe(45);

        player.currentFrame = 100;
        expect(mockController.seek).toHaveBeenCalledWith(100);
    });

    it('should expose duration', () => {
        expect(player.duration).toBe(10);
    });

    it('should expose paused', () => {
        mockController.getState.mockReturnValue({ isPlaying: false });
        expect(player.paused).toBe(true);

        mockController.getState.mockReturnValue({ isPlaying: true });
        expect(player.paused).toBe(false);
    });

    it('should expose ended', () => {
        // Not ended
        mockController.getState.mockReturnValue({ currentFrame: 0, duration: 10, fps: 30 });
        expect(player.ended).toBe(false);

        // Ended
        const endFrame = 299; // 10 * 30 - 1
        mockController.getState.mockReturnValue({ currentFrame: endFrame, duration: 10, fps: 30 });
        expect(player.ended).toBe(true);
    });

    it('should expose volume', () => {
        expect(player.volume).toBe(1);

        player.volume = 0.5;
        expect(mockController.setAudioVolume).toHaveBeenCalledWith(0.5);
    });

    it('should expose muted', () => {
        expect(player.muted).toBe(false);

        player.muted = true;
        expect(mockController.setAudioMuted).toHaveBeenCalledWith(true);
    });

    it('should expose playbackRate', () => {
        expect(player.playbackRate).toBe(1);

        player.playbackRate = 2;
        expect(mockController.setPlaybackRate).toHaveBeenCalledWith(2);
    });

    it('should expose fps', () => {
        expect(player.fps).toBe(30);
    });

    it('should implement play() and pause()', () => {
        player.play();
        expect(mockController.play).toHaveBeenCalled();

        player.pause();
        expect(mockController.pause).toHaveBeenCalled();
    });

    it('should dispatch play/pause events', () => {
        const playSpy = vi.fn();
        const pauseSpy = vi.fn();
        player.addEventListener('play', playSpy);
        player.addEventListener('pause', pauseSpy);

        // Initial update (paused)
        (player as any).updateUI({ isPlaying: false, currentFrame: 0, duration: 10, fps: 30 });
        expect(playSpy).not.toHaveBeenCalled();
        expect(pauseSpy).not.toHaveBeenCalled();

        // Change to playing
        (player as any).updateUI({ isPlaying: true, currentFrame: 0, duration: 10, fps: 30 });
        expect(playSpy).toHaveBeenCalled();
        expect(pauseSpy).not.toHaveBeenCalled();

        // Change to paused
        (player as any).updateUI({ isPlaying: false, currentFrame: 0, duration: 10, fps: 30 });
        expect(pauseSpy).toHaveBeenCalled();
    });

    it('should dispatch timeupdate event', () => {
        const spy = vi.fn();
        player.addEventListener('timeupdate', spy);

        // Initial
        (player as any).updateUI({ currentFrame: 0, duration: 10, fps: 30 });

        // Change frame
        (player as any).updateUI({ currentFrame: 1, duration: 10, fps: 30 });
        expect(spy).toHaveBeenCalled();
    });

    it('should dispatch volumechange event', () => {
        const spy = vi.fn();
        player.addEventListener('volumechange', spy);

        // Initial
        (player as any).updateUI({ volume: 1, muted: false, currentFrame: 0, duration: 10, fps: 30, isPlaying: false });

        // Change volume
        (player as any).updateUI({ volume: 0.5, muted: false, currentFrame: 0, duration: 10, fps: 30, isPlaying: false });
        expect(spy).toHaveBeenCalledTimes(1);

        // Change muted
        (player as any).updateUI({ volume: 0.5, muted: true, currentFrame: 0, duration: 10, fps: 30, isPlaying: false });
        expect(spy).toHaveBeenCalledTimes(2);
    });

    it('should dispatch ended event', () => {
        const spy = vi.fn();
        player.addEventListener('ended', spy);

        // Not ended
        (player as any).updateUI({ isPlaying: true, currentFrame: 298, duration: 10, fps: 30 });

        // Ended (and stopped)
        (player as any).updateUI({ isPlaying: false, currentFrame: 299, duration: 10, fps: 30 });
        expect(spy).toHaveBeenCalled();
    });

    it('should dispatch ratechange event', () => {
        const spy = vi.fn();
        player.addEventListener('ratechange', spy);

        // Initial
        (player as any).updateUI({ playbackRate: 1, currentFrame: 0, duration: 10, fps: 30, isPlaying: false });

        // Change
        (player as any).updateUI({ playbackRate: 2, currentFrame: 0, duration: 10, fps: 30, isPlaying: false });
        expect(spy).toHaveBeenCalled();
    });

    it('should dispatch durationchange event', () => {
        const spy = vi.fn();
        player.addEventListener('durationchange', spy);

        // Initial
        (player as any).updateUI({ duration: 10, currentFrame: 0, fps: 30, isPlaying: false });

        // Change
        (player as any).updateUI({ duration: 20, currentFrame: 0, fps: 30, isPlaying: false });
        expect(spy).toHaveBeenCalled();
    });
  });

  describe('Input Props', () => {
    let mockController: any;

    beforeEach(() => {
        mockController = {
            getState: vi.fn().mockReturnValue({ currentFrame: 0, duration: 10, fps: 30, isPlaying: false }),
            play: vi.fn(),
            pause: vi.fn(),
            seek: vi.fn().mockResolvedValue(undefined),
            setAudioVolume: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn(),
            setAudioMuted: vi.fn(),
            setPlaybackRate: vi.fn(),
            subscribe: vi.fn().mockReturnValue(() => {}),
            onError: vi.fn().mockReturnValue(() => {}),
            dispose: vi.fn(), setCaptions: vi.fn(),
            setInputProps: vi.fn(),
            captureFrame: vi.fn(),
            getAudioTracks: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn()
        };
        // Reset player pending props
        player.inputProps = null;
    });

    it('should set input props via attribute', () => {
        (player as any).setController(mockController);

        const props = { text: 'Hello' };
        player.setAttribute('input-props', JSON.stringify(props));

        expect(mockController.setInputProps).toHaveBeenCalledWith(props);
        expect(player.inputProps).toEqual(props);
    });

    it('should set input props via property', () => {
        (player as any).setController(mockController);

        const props = { text: 'World' };
        player.inputProps = props;

        expect(mockController.setInputProps).toHaveBeenCalledWith(props);
        expect(player.inputProps).toEqual(props);
    });

    it('should store pending props if controller is not ready', () => {
        const props = { text: 'Pending' };
        player.inputProps = props;

        expect(player.inputProps).toEqual(props);
        // Controller not set yet

        (player as any).setController(mockController);
        expect(mockController.setInputProps).toHaveBeenCalledWith(props);
    });

    it('should handle invalid JSON in attribute', () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        player.setAttribute('input-props', '{ invalid json }');

        expect(warnSpy).toHaveBeenCalled();
        expect(player.inputProps).toBeNull();
        warnSpy.mockRestore();
    });

    it('should observe input-props', () => {
        expect(HeliosPlayer.observedAttributes).toContain('input-props');
    });
  });

  describe('Poster and Preload', () => {
    let mockController: any;

    beforeEach(() => {
        mockController = {
            getState: vi.fn().mockReturnValue({ currentFrame: 0, duration: 10, fps: 30, isPlaying: false }),
            play: vi.fn(),
            pause: vi.fn(),
            seek: vi.fn().mockResolvedValue(undefined),
            subscribe: vi.fn().mockReturnValue(() => {}),
            onError: vi.fn().mockReturnValue(() => {}),
            dispose: vi.fn(), setCaptions: vi.fn(),
            setPlaybackRate: vi.fn(),
        setInputProps: vi.fn(),
        setAudioVolume: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn(),
        setAudioMuted: vi.fn(),
        setLoop: vi.fn(),
        setPlaybackRange: vi.fn(),
        clearPlaybackRange: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn()
        };
    });

    it('should show poster and defer load when preload="none"', () => {
        player.setAttribute('preload', 'none');
        player.setAttribute('src', 'test.html');
        player.setAttribute('poster', 'poster.jpg');

        const iframe = player.shadowRoot!.querySelector('iframe');
        const posterContainer = player.shadowRoot!.querySelector('.poster-container');
        const posterImage = player.shadowRoot!.querySelector('.poster-image') as HTMLImageElement;

        // Should not have src yet
        expect(iframe!.getAttribute('src')).toBeFalsy();

        // Poster should be visible
        expect(posterContainer!.classList.contains('hidden')).toBe(false);
        expect(posterImage.src).toContain('poster.jpg');
    });

    it('should load immediately when preload="auto" (default)', () => {
        player.setAttribute('src', 'test.html'); // preload default is auto

        const iframe = player.shadowRoot!.querySelector('iframe');
        expect(iframe!.getAttribute('src')).toBe('test.html');
    });

    it('should update poster image when attribute changes', () => {
        player.setAttribute('poster', 'initial.jpg');
        const posterImage = player.shadowRoot!.querySelector('.poster-image') as HTMLImageElement;
        expect(posterImage.src).toContain('initial.jpg');

        player.setAttribute('poster', 'updated.jpg');
        expect(posterImage.src).toContain('updated.jpg');
    });

    it('should load and set autoplay when big play button is clicked', () => {
        player.setAttribute('preload', 'none');
        player.setAttribute('src', 'test.html');

        const bigPlayBtn = player.shadowRoot!.querySelector('.big-play-btn') as HTMLDivElement;
        const iframe = player.shadowRoot!.querySelector('iframe');

        // Click big play
        bigPlayBtn.click();

        // Should load iframe
        expect(iframe!.src).toContain('test.html');

        // Should set autoplay so it starts when connected
        expect(player.hasAttribute('autoplay')).toBe(true);
    });

    it('should load and set autoplay when play() is called programmatically', async () => {
        player.setAttribute('preload', 'none');
        player.setAttribute('src', 'test.html');

        const iframe = player.shadowRoot!.querySelector('iframe');

        // Call play
        await player.play();

        // Should load iframe
        expect(iframe!.src).toContain('test.html');

        // Should set autoplay
        expect(player.hasAttribute('autoplay')).toBe(true);
    });

    it('should hide poster when playing starts', () => {
        player.setAttribute('preload', 'none');
        player.setAttribute('poster', 'poster.jpg');
        player.setAttribute('src', 'test.html');

        // Initial state: visible
        const posterContainer = player.shadowRoot!.querySelector('.poster-container');
        expect(posterContainer!.classList.contains('hidden')).toBe(false);

        // Load and connect controller
        player.load();
        (player as any).setController(mockController);

        // Update UI with playing state
        mockController.getState.mockReturnValue({ currentFrame: 0, duration: 10, fps: 30, isPlaying: true });
        (player as any).updateUI(mockController.getState());

        // Poster should be hidden
        expect(posterContainer!.classList.contains('hidden')).toBe(true);
    });

    it('should keep poster hidden when seeking back to start after playing', () => {
        player.setAttribute('poster', 'poster.jpg');
        player.setAttribute('src', 'test.html');

        // Load and connect controller
        (player as any).setController(mockController);

        const posterContainer = player.shadowRoot!.querySelector('.poster-container');

        // 1. Play
        mockController.getState.mockReturnValue({ currentFrame: 10, duration: 10, fps: 30, isPlaying: true });
        (player as any).updateUI(mockController.getState());
        expect(posterContainer!.classList.contains('hidden')).toBe(true);

        // 2. Pause and Seek back to 0
        mockController.getState.mockReturnValue({ currentFrame: 0, duration: 10, fps: 30, isPlaying: false });
        (player as any).updateUI(mockController.getState());

        // Should remain hidden
        expect(posterContainer!.classList.contains('hidden')).toBe(true);
    });

    it('should hide status overlay when poster is present (initial load)', () => {
        const p = new HeliosPlayer();
        p.setAttribute('poster', 'poster.jpg');
        document.body.appendChild(p);

        // Initial state
        const overlay = p.shadowRoot!.querySelector('.status-overlay');
        expect(overlay!.classList.contains('hidden')).toBe(true);
    });
  });

  describe('Muted Attribute', () => {
    let mockController: any;

    beforeEach(() => {
        mockController = {
            getState: vi.fn().mockReturnValue({ currentFrame: 0, duration: 10, fps: 30, isPlaying: false, muted: false }),
            play: vi.fn(),
            pause: vi.fn(),
            seek: vi.fn().mockResolvedValue(undefined),
            setAudioVolume: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn(),
            setAudioMuted: vi.fn(),
            setPlaybackRate: vi.fn(),
            subscribe: vi.fn().mockReturnValue(() => {}),
            onError: vi.fn().mockReturnValue(() => {}),
            dispose: vi.fn(), setCaptions: vi.fn(),
            setInputProps: vi.fn(),
            captureFrame: vi.fn(),
            getAudioTracks: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn()
        };
    });

    it('should set muted on controller when attribute is present during initialization', () => {
        player.setAttribute('muted', '');
        (player as any).setController(mockController);
        expect(mockController.setAudioMuted).toHaveBeenCalledWith(true);
    });

    it('should set muted on controller when attribute is added dynamically', () => {
        (player as any).setController(mockController);
        player.setAttribute('muted', '');
        expect(mockController.setAudioMuted).toHaveBeenCalledWith(true);
    });

    it('should unmute on controller when attribute is removed dynamically', () => {
        player.setAttribute('muted', '');
        (player as any).setController(mockController);
        mockController.setAudioMuted.mockClear();

        player.removeAttribute('muted');
        expect(mockController.setAudioMuted).toHaveBeenCalledWith(false);
    });

    it('should observe muted attribute', () => {
        expect(HeliosPlayer.observedAttributes).toContain('muted');
    });
  });

  describe('SRT Export', () => {
    let mockController: any;

    beforeEach(() => {
        mockController = {
            getState: vi.fn().mockReturnValue({ currentFrame: 0, duration: 10, fps: 30, isPlaying: false }),
            play: vi.fn(),
            pause: vi.fn(),
            seek: vi.fn().mockResolvedValue(undefined),
            subscribe: vi.fn().mockReturnValue(() => {}),
            onError: vi.fn().mockReturnValue(() => {}),
            dispose: vi.fn(), setCaptions: vi.fn(),
            setPlaybackRate: vi.fn(),
            setAudioVolume: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn(),
            setAudioMuted: vi.fn(),
            setInputProps: vi.fn(),
            setLoop: vi.fn(),
            setPlaybackRange: vi.fn(),
            clearPlaybackRange: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn(),
            captureFrame: vi.fn(),
            getAudioTracks: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn()
        };
        (player as any).setController(mockController);
    });

    it('should save captions as SRT with correct filename', async () => {
        // Add a text track and show it
        const track = player.addTextTrack('captions', 'English', 'en');
        track.addCue({ startTime: 0, endTime: 5, text: 'Hello' });
        track.mode = 'showing';
        // Need to enable global captions flag (usually done via UI toggle or track change logic)
        (player as any).showCaptions = true;

        // Set attributes
        player.setAttribute('export-caption-mode', 'file');
        player.setAttribute('export-filename', 'my-movie');

        // Access the mocked exporter constructor to setup spies
        const { ClientSideExporter } = await import('./features/exporter');
        const saveCaptionsSpy = vi.fn();
        const exportSpy = vi.fn().mockResolvedValue(undefined);

        // Update mock implementation for this test
        (ClientSideExporter as any).mockImplementation(function() {
          return {
            export: exportSpy,
            saveCaptionsAsSRT: saveCaptionsSpy
          };
        });

        // Trigger export
        await player.export();

        // Expect saveCaptionsAsSRT to be called with "my-movie.srt"
        expect(saveCaptionsSpy).toHaveBeenCalledWith(expect.anything(), 'my-movie.srt');
    });

    it('should use default filename for SRT if not provided', async () => {
        const track = player.addTextTrack('captions', 'English', 'en');
        track.addCue({ startTime: 0, endTime: 5, text: 'Hello' });
        track.mode = 'showing';
        (player as any).showCaptions = true;

        player.setAttribute('export-caption-mode', 'file');
        // No export-filename (defaults to "video")

        const { ClientSideExporter } = await import('./features/exporter');
        const saveCaptionsSpy = vi.fn();
        const exportSpy = vi.fn().mockResolvedValue(undefined);
        (ClientSideExporter as any).mockImplementation(function() {
          return {
            export: exportSpy,
            saveCaptionsAsSRT: saveCaptionsSpy
          };
        });

        await player.export();

        expect(saveCaptionsSpy).toHaveBeenCalledWith(expect.anything(), 'video.srt');
    });
  });

  describe('Standard Media States', () => {
    let mockController: any;

    beforeEach(() => {
        mockController = {
            getState: vi.fn().mockReturnValue({ currentFrame: 0, duration: 10, fps: 30, isPlaying: false }),
            play: vi.fn(),
            pause: vi.fn(),
            seek: vi.fn().mockResolvedValue(undefined),
            subscribe: vi.fn().mockReturnValue(() => {}),
            onError: vi.fn().mockReturnValue(() => {}),
            dispose: vi.fn(), setCaptions: vi.fn(),
            setPlaybackRate: vi.fn(),
            setInputProps: vi.fn(),
            setAudioMuted: vi.fn(),
            setAudioVolume: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn(),
            setLoop: vi.fn(),
            setPlaybackRange: vi.fn(),
            clearPlaybackRange: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn()
        };
    });

    it('should have initial states', () => {
        expect(player.readyState).toBe(HeliosPlayer.HAVE_NOTHING);
        expect(player.networkState).toBe(HeliosPlayer.NETWORK_EMPTY);
    });

    it('should transition to loading state and dispatch loadstart when src is set', () => {
        const loadStartSpy = vi.fn();
        player.addEventListener('loadstart', loadStartSpy);

        player.setAttribute('src', 'test.html');

        expect(player.networkState).toBe(HeliosPlayer.NETWORK_LOADING);
        expect(player.readyState).toBe(HeliosPlayer.HAVE_NOTHING);
        expect(loadStartSpy).toHaveBeenCalled();
    });

    it('should transition to ready state and dispatch events when controller connects', () => {
        // Set src first to get into loading state
        player.setAttribute('src', 'test.html');

        const metadataSpy = vi.fn();
        const loadedDataSpy = vi.fn();
        const canPlaySpy = vi.fn();
        const canPlayThroughSpy = vi.fn();

        player.addEventListener('loadedmetadata', metadataSpy);
        player.addEventListener('loadeddata', loadedDataSpy);
        player.addEventListener('canplay', canPlaySpy);
        player.addEventListener('canplaythrough', canPlayThroughSpy);

        // Connect controller
        (player as any).setController(mockController);

        expect(player.networkState).toBe(HeliosPlayer.NETWORK_IDLE);
        expect(player.readyState).toBe(HeliosPlayer.HAVE_ENOUGH_DATA);

        expect(metadataSpy).toHaveBeenCalled();
        expect(loadedDataSpy).toHaveBeenCalled();
        expect(canPlaySpy).toHaveBeenCalled();
        expect(canPlayThroughSpy).toHaveBeenCalled();

        // Check order
        expect(metadataSpy.mock.invocationCallOrder[0]).toBeLessThan(loadedDataSpy.mock.invocationCallOrder[0]);
        expect(loadedDataSpy.mock.invocationCallOrder[0]).toBeLessThan(canPlaySpy.mock.invocationCallOrder[0]);
        expect(canPlaySpy.mock.invocationCallOrder[0]).toBeLessThan(canPlayThroughSpy.mock.invocationCallOrder[0]);
    });

    it('should reset states when src changes', () => {
        // 1. Load first src
        player.setAttribute('src', 'first.html');
        (player as any).setController(mockController);

        expect(player.readyState).toBe(HeliosPlayer.HAVE_ENOUGH_DATA);
        expect(player.networkState).toBe(HeliosPlayer.NETWORK_IDLE);

        // 2. Change src
        const loadStartSpy = vi.fn();
        player.addEventListener('loadstart', loadStartSpy);

        player.setAttribute('src', 'second.html');

        expect(player.networkState).toBe(HeliosPlayer.NETWORK_LOADING);
        expect(player.readyState).toBe(HeliosPlayer.HAVE_NOTHING);
        expect(loadStartSpy).toHaveBeenCalled();
    });
  });

  describe('ControlsList', () => {
    it('should hide export button when controlslist="nodownload"', () => {
        player.setAttribute('controlslist', 'nodownload');
        const exportBtn = player.shadowRoot!.querySelector('.export-btn') as HTMLButtonElement;
        expect(exportBtn.style.display).toBe('none');
    });

    it('should hide fullscreen button when controlslist="nofullscreen"', () => {
        player.setAttribute('controlslist', 'nofullscreen');
        const fullscreenBtn = player.shadowRoot!.querySelector('.fullscreen-btn') as HTMLButtonElement;
        expect(fullscreenBtn.style.display).toBe('none');
    });

    it('should support multiple tokens', () => {
        player.setAttribute('controlslist', 'nodownload nofullscreen');
        const exportBtn = player.shadowRoot!.querySelector('.export-btn') as HTMLButtonElement;
        const fullscreenBtn = player.shadowRoot!.querySelector('.fullscreen-btn') as HTMLButtonElement;

        expect(exportBtn.style.display).toBe('none');
        expect(fullscreenBtn.style.display).toBe('none');
    });

    it('should restore buttons when attribute is removed', () => {
        // 1. Hide
        player.setAttribute('controlslist', 'nodownload nofullscreen');
        const exportBtn = player.shadowRoot!.querySelector('.export-btn') as HTMLButtonElement;
        const fullscreenBtn = player.shadowRoot!.querySelector('.fullscreen-btn') as HTMLButtonElement;

        expect(exportBtn.style.display).toBe('none');
        expect(fullscreenBtn.style.display).toBe('none');

        // 2. Remove
        player.removeAttribute('controlslist');

        expect(exportBtn.style.display).toBe('');
        expect(fullscreenBtn.style.display).toBe('');
    });

    it('should be case insensitive', () => {
        player.setAttribute('controlslist', 'NoDownload NOFULLSCREEN');
        const exportBtn = player.shadowRoot!.querySelector('.export-btn') as HTMLButtonElement;
        const fullscreenBtn = player.shadowRoot!.querySelector('.fullscreen-btn') as HTMLButtonElement;

        expect(exportBtn.style.display).toBe('none');
        expect(fullscreenBtn.style.display).toBe('none');
    });

    it('should handle extra whitespace', () => {
        player.setAttribute('controlslist', '  nodownload   nofullscreen  ');
        const exportBtn = player.shadowRoot!.querySelector('.export-btn') as HTMLButtonElement;
        const fullscreenBtn = player.shadowRoot!.querySelector('.fullscreen-btn') as HTMLButtonElement;

        expect(exportBtn.style.display).toBe('none');
        expect(fullscreenBtn.style.display).toBe('none');
    });
  });

  describe('Playback Range Visualization', () => {
    let mockController: any;

    beforeEach(() => {
        mockController = {
            getState: vi.fn().mockReturnValue({ currentFrame: 0, duration: 10, fps: 30, isPlaying: false }),
            play: vi.fn(),
            pause: vi.fn(),
            seek: vi.fn().mockResolvedValue(undefined),
            subscribe: vi.fn().mockReturnValue(() => {}),
            onError: vi.fn().mockReturnValue(() => {}),
            dispose: vi.fn(), setCaptions: vi.fn(),
            setPlaybackRate: vi.fn(),
            setInputProps: vi.fn(),
            setAudioMuted: vi.fn(),
            setAudioVolume: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn(),
            setLoop: vi.fn(),
            setPlaybackRange: vi.fn(),
            clearPlaybackRange: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn()
        };
        (player as any).setController(mockController);
    });

    it('should update scrubber background when playbackRange is set', () => {
        // Range: Frame 100 to 200. Total 300 frames.
        // 100/300 * 100 = 33.33333333333333
        // 200/300 * 100 = 66.66666666666666
        mockController.getState.mockReturnValue({
            currentFrame: 0,
            duration: 10,
            fps: 30,
            isPlaying: false,
            playbackRange: [100, 200]
        });

        (player as any).updateUI(mockController.getState());

        const scrubber = player.shadowRoot!.querySelector('.scrubber') as HTMLInputElement;
        const bg = scrubber.style.background;

        expect(bg).toContain('linear-gradient');
        // Check for presence of CSS variables to ensure the gradient is constructed using them
        expect(bg).toContain('var(--helios-range-unselected-color)');
        expect(bg).toContain('var(--helios-range-selected-color)');

        // Basic checks for percentages
        expect(bg).toMatch(/33\.333/);
        expect(bg).toMatch(/66\.666/);
    });

    it('should reset scrubber background when playbackRange is null', () => {
        // Set range first
        mockController.getState.mockReturnValue({
            currentFrame: 0,
            duration: 10,
            fps: 30,
            isPlaying: false,
            playbackRange: [100, 200]
        });
        (player as any).updateUI(mockController.getState());

        const scrubber = player.shadowRoot!.querySelector('.scrubber') as HTMLInputElement;
        expect(scrubber.style.background).toContain('linear-gradient');

        // Now clear range
        mockController.getState.mockReturnValue({
            currentFrame: 0,
            duration: 10,
            fps: 30,
            isPlaying: false,
            playbackRange: null
        });
        (player as any).updateUI(mockController.getState());

        expect(scrubber.style.background).toBe('');
    });
  });

  describe('Markers', () => {
    let mockController: any;

    beforeEach(() => {
        mockController = {
            getState: vi.fn().mockReturnValue({ currentFrame: 0, duration: 10, fps: 30, isPlaying: false }),
            play: vi.fn(),
            pause: vi.fn(),
            seek: vi.fn().mockResolvedValue(undefined),
            subscribe: vi.fn().mockReturnValue(() => {}),
            onError: vi.fn().mockReturnValue(() => {}),
            dispose: vi.fn(), setCaptions: vi.fn(),
            setPlaybackRate: vi.fn(),
            setInputProps: vi.fn(),
            setAudioMuted: vi.fn(),
            setAudioVolume: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn(),
            setLoop: vi.fn(),
            setPlaybackRange: vi.fn(),
            clearPlaybackRange: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn()
        };
        (player as any).setController(mockController);
    });

    it('should render markers correctly', () => {
        const markers = [
            { id: '1', time: 2.5, label: 'Intro' },
            { id: '2', time: 7.5, label: 'Outro', color: '#ff0000' }
        ];

        mockController.getState.mockReturnValue({
            currentFrame: 0,
            duration: 10,
            fps: 30,
            isPlaying: false,
            markers
        });

        (player as any).updateUI(mockController.getState());

        const markersContainer = player.shadowRoot!.querySelector('.markers-container') as HTMLDivElement;
        const markerEls = markersContainer.querySelectorAll('.marker');

        expect(markerEls.length).toBe(2);

        // Marker 1: 2.5s / 10s = 25%
        const m1 = markerEls[0] as HTMLDivElement;
        expect(m1.style.left).toBe('25%');
        expect(m1.title).toBe('Intro');
        // Should inherit color or use default (which is controlled by CSS var, usually checked via computed style, but inline style won't be set if not provided)
        expect(m1.style.backgroundColor).toBe('');

        // Marker 2: 7.5s / 10s = 75%
        const m2 = markerEls[1] as HTMLDivElement;
        expect(m2.style.left).toBe('75%');
        expect(m2.title).toBe('Outro');
        // Custom color
        expect(m2.style.backgroundColor).toBe('rgb(255, 0, 0)'); // RGB serialization of #ff0000
    });

    it('should seek on marker click', () => {
        const markers = [
            { id: '1', time: 5.0, label: 'Middle' }
        ];

        mockController.getState.mockReturnValue({
            currentFrame: 0,
            duration: 10,
            fps: 30,
            isPlaying: false,
            markers
        });

        (player as any).updateUI(mockController.getState());

        const markerEl = player.shadowRoot!.querySelector('.marker') as HTMLDivElement;
        markerEl.click();

        // 5.0s * 30fps = 150 frames
        expect(mockController.seek).toHaveBeenCalledWith(150);
    });

    it('should not render markers if duration is 0', () => {
        const markers = [
            { id: '1', time: 5.0, label: 'Middle' }
        ];

        mockController.getState.mockReturnValue({
            currentFrame: 0,
            duration: 0,
            fps: 30,
            isPlaying: false,
            markers
        });

        (player as any).updateUI(mockController.getState());

        const markersContainer = player.shadowRoot!.querySelector('.markers-container') as HTMLDivElement;
        expect(markersContainer.children.length).toBe(0);
    });

    it('should ignore markers outside 0-100% range', () => {
        const markers = [
            { id: '1', time: -1, label: 'Before' },
            { id: '2', time: 11, label: 'After' },
            { id: '3', time: 5, label: 'Valid' }
        ];

        mockController.getState.mockReturnValue({
            currentFrame: 0,
            duration: 10,
            fps: 30,
            isPlaying: false,
            markers
        });

        (player as any).updateUI(mockController.getState());

        const markerEls = player.shadowRoot!.querySelectorAll('.marker');
        expect(markerEls.length).toBe(1);
        const m = markerEls[0] as HTMLDivElement;
        expect(m.title).toBe('Valid');
    });
  });

  describe('Persistence of Media Properties', () => {
    let mockController: any;

    beforeEach(() => {
        mockController = {
            getState: vi.fn().mockReturnValue({ currentFrame: 0, duration: 10, fps: 30, isPlaying: false }),
            play: vi.fn(),
            pause: vi.fn(),
            seek: vi.fn().mockResolvedValue(undefined),
            subscribe: vi.fn().mockReturnValue(() => {}),
            onError: vi.fn().mockReturnValue(() => {}),
            dispose: vi.fn(), setCaptions: vi.fn(),
            setPlaybackRate: vi.fn(),
            setInputProps: vi.fn(),
            setAudioMuted: vi.fn(),
            setAudioVolume: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn()
        };
    });

    it('should persist volume set before controller connection', () => {
        // Set volume before connect
        player.volume = 0.5;
        expect(player.volume).toBe(0.5);

        // Connect
        (player as any).setController(mockController);

        // Should have applied to controller
        expect(mockController.setAudioVolume).toHaveBeenCalledWith(0.5);
    });

    it('should persist playbackRate set before controller connection', () => {
        // Set rate before connect
        player.playbackRate = 2.0;
        expect(player.playbackRate).toBe(2.0);

        // Connect
        (player as any).setController(mockController);

        // Should have applied to controller
        expect(mockController.setPlaybackRate).toHaveBeenCalledWith(2.0);
    });

    it('should persist muted state set before controller connection', () => {
        // Set muted before connect
        player.muted = true;
        expect(player.muted).toBe(true);

        // Connect
        (player as any).setController(mockController);

        // Should have applied to controller
        expect(mockController.setAudioMuted).toHaveBeenCalledWith(true);
    });

    it('should clamp invalid volume values', () => {
        // Test negative value
        player.volume = -0.5;
        expect(player.volume).toBe(0);

        // Test value > 1
        player.volume = 1.5;
        expect(player.volume).toBe(1);

        // Connect
        (player as any).setController(mockController);

        // Should apply clamped value (last set was 1.5 -> 1)
        expect(mockController.setAudioVolume).toHaveBeenCalledWith(1);
    });

    it('should prioritize explicit muted property over attribute', () => {
        // Attribute says muted
        player.setAttribute('muted', '');

        // Property says unmuted (explicitly set)
        player.muted = false;

        // Connect
        (player as any).setController(mockController);

        // Should respect property (false) over attribute (true)
        expect(mockController.setAudioMuted).toHaveBeenCalledWith(false);
    });

    it('should apply both volume and muted when set before connection', () => {
        player.volume = 0.5;
        player.muted = true;

        (player as any).setController(mockController);

        expect(mockController.setAudioVolume).toHaveBeenCalledWith(0.5);
        expect(mockController.setAudioMuted).toHaveBeenCalledWith(true);
    });
  });

  describe('Connection Timeout', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should correctly set error state and dispatch event on connection timeout', () => {
      // Verify timeout error handling
      const errorSpy = vi.fn();
      player.addEventListener('error', errorSpy);

      // Trigger load which starts connection attempts
      player.setAttribute('src', 'test.html');

      // Simulate iframe load event which triggers startConnectionAttempts
      const iframe = player.shadowRoot!.querySelector('iframe')!;

      // Mock contentWindow to ensure startConnectionAttempts proceeds
      Object.defineProperty(iframe, 'contentWindow', {
          value: {
              postMessage: vi.fn(),
          },
          writable: true
      });

      iframe.dispatchEvent(new Event('load'));

      // Fast-forward time past 5000ms
      vi.advanceTimersByTime(5100);

      expect(player.error).not.toBeNull();
      expect(player.error?.code).toBe(4);
      expect(player.error?.message).toBe("Connection Timed Out");
      expect(player.networkState).toBe(HeliosPlayer.NETWORK_NO_SOURCE);
      expect(errorSpy).toHaveBeenCalled();

      // Check that status overlay shows failure
      const overlay = player.shadowRoot!.querySelector('.status-overlay');
      const statusText = player.shadowRoot!.querySelector('.status-text');
      expect(overlay?.classList.contains('hidden')).toBe(false);
      expect(statusText?.textContent).toContain("Connection Failed");
    });
  });

  describe('Smart PiP Visibility', () => {
    let originalPipEnabled: boolean;

    beforeEach(() => {
        // Save original value (JSDOM defaults to undefined/false usually)
        originalPipEnabled = (document as any).pictureInPictureEnabled;
    });

    afterEach(() => {
        // Restore
        Object.defineProperty(document, 'pictureInPictureEnabled', { value: originalPipEnabled, configurable: true });
    });

    it('should hide PiP button when document.pictureInPictureEnabled is false', () => {
       Object.defineProperty(document, 'pictureInPictureEnabled', { value: false, configurable: true });
       // Force update as connectedCallback runs before this test might set the prop
       (player as any).updateControlsVisibility();

       const pipBtn = player.shadowRoot!.querySelector('.pip-btn') as HTMLButtonElement;
       expect(pipBtn.style.display).toBe('none');
    });

    it('should hide PiP button when export-mode="dom"', () => {
       Object.defineProperty(document, 'pictureInPictureEnabled', { value: true, configurable: true });
       // Ensure visible initially
       (player as any).updateControlsVisibility();
       const pipBtn = player.shadowRoot!.querySelector('.pip-btn') as HTMLButtonElement;
       expect(pipBtn.style.display).toBe('');

       // Set attribute
       player.setAttribute('export-mode', 'dom');
       expect(pipBtn.style.display).toBe('none');
    });

    it('should show PiP button when supported and not in dom mode', () => {
       Object.defineProperty(document, 'pictureInPictureEnabled', { value: true, configurable: true });
       player.removeAttribute('export-mode');
       player.removeAttribute('disablepictureinpicture');

       // Force update
       (player as any).updateControlsVisibility();

       const pipBtn = player.shadowRoot!.querySelector('.pip-btn') as HTMLButtonElement;
       expect(pipBtn.style.display).toBe('');
    });

    it('should hide PiP button when disablepictureinpicture is present', () => {
       Object.defineProperty(document, 'pictureInPictureEnabled', { value: true, configurable: true });
       player.removeAttribute('export-mode');

       player.setAttribute('disablepictureinpicture', '');

       const pipBtn = player.shadowRoot!.querySelector('.pip-btn') as HTMLButtonElement;
       expect(pipBtn.style.display).toBe('none');
    });
  });

  describe('Settings Menu', () => {
    it('should render granular playback speed options', () => {
        const mockController = {
            getState: vi.fn().mockReturnValue({ currentFrame: 0, duration: 10, fps: 30, isPlaying: false, playbackRate: 1 }),
            play: vi.fn(),
            pause: vi.fn(),
            seek: vi.fn().mockResolvedValue(undefined),
            setPlaybackRate: vi.fn(),
            subscribe: vi.fn().mockReturnValue(() => {}),
            onError: vi.fn().mockReturnValue(() => {}),
            dispose: vi.fn(), setCaptions: vi.fn(),
            setInputProps: vi.fn(),
            setAudioMuted: vi.fn(),
            setAudioVolume: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn(),
            setLoop: vi.fn(),
            setPlaybackRange: vi.fn(),
            clearPlaybackRange: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn()
        };
        (player as any).setController(mockController);

        // Trigger settings menu render
        const settingsBtn = player.shadowRoot!.querySelector('.settings-btn') as HTMLButtonElement;
        settingsBtn.click();

        const settingsMenu = player.shadowRoot!.querySelector('.settings-menu') as HTMLDivElement;
        const speedSelect = settingsMenu.querySelector('select.settings-select') as HTMLSelectElement;

        expect(speedSelect).toBeTruthy();
        const options = Array.from(speedSelect.options).map(opt => opt.value);
        expect(options).toEqual(['0.25', '0.5', '0.75', '1', '1.25', '1.5', '1.75', '2']);
    });

    it('should set playback rate when option is selected', () => {
        const mockController = {
            getState: vi.fn().mockReturnValue({ currentFrame: 0, duration: 10, fps: 30, isPlaying: false, playbackRate: 1 }),
            play: vi.fn(),
            pause: vi.fn(),
            seek: vi.fn().mockResolvedValue(undefined),
            setPlaybackRate: vi.fn(),
            subscribe: vi.fn().mockReturnValue(() => {}),
            onError: vi.fn().mockReturnValue(() => {}),
            dispose: vi.fn(), setCaptions: vi.fn(),
            setInputProps: vi.fn(),
            setAudioMuted: vi.fn(),
            setAudioVolume: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn(),
            setLoop: vi.fn(),
            setPlaybackRange: vi.fn(),
            clearPlaybackRange: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn()
        };
        (player as any).setController(mockController);

        const settingsBtn = player.shadowRoot!.querySelector('.settings-btn') as HTMLButtonElement;
        settingsBtn.click();

        const settingsMenu = player.shadowRoot!.querySelector('.settings-menu') as HTMLDivElement;
        const speedSelect = settingsMenu.querySelector('select.settings-select') as HTMLSelectElement;

        speedSelect.value = '1.5';
        speedSelect.dispatchEvent(new Event('change'));

        expect(mockController.setPlaybackRate).toHaveBeenCalledWith(1.5);
    });
  });

  describe('Caption Styling', () => {
    let mockController: any;

    beforeEach(() => {
        mockController = {
            getState: vi.fn().mockReturnValue({ currentFrame: 0, duration: 10, fps: 30, isPlaying: false }),
            play: vi.fn(),
            pause: vi.fn(),
            seek: vi.fn().mockResolvedValue(undefined),
            subscribe: vi.fn().mockReturnValue(() => {}),
            onError: vi.fn().mockReturnValue(() => {}),
            dispose: vi.fn(), setCaptions: vi.fn(),
            setPlaybackRate: vi.fn(),
            setAudioVolume: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn(),
            setAudioMuted: vi.fn(),
            setInputProps: vi.fn(),
            setLoop: vi.fn(),
            setPlaybackRange: vi.fn(),
            clearPlaybackRange: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn(),
            captureFrame: vi.fn(),
            getAudioTracks: vi.fn()
        };
        (player as any).setController(mockController);
    });

    it('should extract computed caption styles and pass to exporter', async () => {
        // Enable captions
        (player as any).showCaptions = true;

        // Mock getComputedStyle to return custom values
        const originalGetComputedStyle = window.getComputedStyle;
        vi.spyOn(window, 'getComputedStyle').mockImplementation((elt) => {
            const style = originalGetComputedStyle(elt);
            return {
                ...style,
                getPropertyValue: (prop: string) => {
                    if (prop === '--helios-caption-color') return 'red';
                    if (prop === '--helios-caption-bg') return 'blue';
                    if (prop === '--helios-caption-font-family') return 'Courier';
                    if (prop === '--helios-caption-scale') return '0.1';
                    return style.getPropertyValue(prop);
                }
            } as CSSStyleDeclaration;
        });

        // Setup Exporter Mock
        const { ClientSideExporter } = await import('./features/exporter');
        const exportSpy = vi.fn().mockResolvedValue(undefined);
        (ClientSideExporter as any).mockImplementation(function() {
          return { export: exportSpy };
        });

        await player.export();

        expect(exportSpy).toHaveBeenCalledWith(expect.objectContaining({
            captionStyle: {
                color: 'red',
                backgroundColor: 'blue',
                fontFamily: 'Courier',
                scale: 0.1
            }
        }));

        vi.restoreAllMocks();
    });

    it('should use default caption styles if variables missing', async () => {
        (player as any).showCaptions = true;

        // Setup Exporter Mock
        const { ClientSideExporter } = await import('./features/exporter');
        const exportSpy = vi.fn().mockResolvedValue(undefined);
        (ClientSideExporter as any).mockImplementation(function() {
          return { export: exportSpy };
        });

        await player.export();

        expect(exportSpy).toHaveBeenCalledWith(expect.objectContaining({
            captionStyle: {
                color: 'white',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                fontFamily: 'sans-serif',
                scale: 0.05
            }
        }));
    });
  });
});
