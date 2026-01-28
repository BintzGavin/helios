// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HeliosPlayer } from './index';

// Mock ClientSideExporter
vi.mock('./features/exporter', () => {
  return {
    ClientSideExporter: vi.fn().mockImplementation(() => {
      return {
        export: vi.fn()
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
    const btn = player.shadowRoot!.querySelector('.fullscreen-btn') as HTMLButtonElement;

    // Enable controls (needs a controller usually, or hack disable state)
    // Or just check if click handler is attached. Button is disabled by default.
    // Let's force enable it for test
    btn.disabled = false;

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
        seek: vi.fn(),
        subscribe: vi.fn().mockReturnValue(() => {}),
        onError: vi.fn().mockReturnValue(() => {}),
        dispose: vi.fn(),
        setPlaybackRate: vi.fn()
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

    // ArrowRight: Seek +1 (Default)
    mockController.getState.mockReturnValue({ currentFrame: 0, duration: 10, fps: 30, isPlaying: false });
    dispatchKey('ArrowRight');
    expect(mockController.seek).toHaveBeenCalledWith(1);

    // ArrowRight + Shift: Seek +10
    dispatchKey('ArrowRight', { shiftKey: true });
    expect(mockController.seek).toHaveBeenCalledWith(10);

    // ArrowLeft: Seek -1 (Default)
    mockController.getState.mockReturnValue({ currentFrame: 20, duration: 10, fps: 30, isPlaying: false });
    dispatchKey('ArrowLeft');
    expect(mockController.seek).toHaveBeenCalledWith(19); // 20 - 1

    // ArrowLeft + Shift: Seek -10
    dispatchKey('ArrowLeft', { shiftKey: true });
    expect(mockController.seek).toHaveBeenCalledWith(10); // 20 - 10

    // .: Seek +1
    mockController.getState.mockReturnValue({ currentFrame: 10, duration: 10, fps: 30, isPlaying: false });
    dispatchKey('.');
    expect(mockController.seek).toHaveBeenCalledWith(11); // 10 + 1

    // ,: Seek -1
    mockController.getState.mockReturnValue({ currentFrame: 10, duration: 10, fps: 30, isPlaying: false });
    dispatchKey(',');
    expect(mockController.seek).toHaveBeenCalledWith(9); // 10 - 1
  });

  it('should allow keyboard events from non-input children but ignore inputs', () => {
    const mockController = {
        getState: vi.fn().mockReturnValue({ currentFrame: 0, duration: 10, fps: 30, isPlaying: false }),
        play: vi.fn(),
        pause: vi.fn(),
        seek: vi.fn(),
        subscribe: vi.fn().mockReturnValue(() => {}),
        onError: vi.fn().mockReturnValue(() => {}),
        dispose: vi.fn(),
        setPlaybackRate: vi.fn()
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
    const speedSelector = player.shadowRoot!.querySelector('.speed-selector') as HTMLSelectElement;
    const fullscreenBtn = player.shadowRoot!.querySelector('.fullscreen-btn') as HTMLButtonElement;

    expect(playBtn.disabled).toBe(true);
    expect(scrubber.disabled).toBe(true);
    expect(speedSelector.disabled).toBe(true);
    expect(fullscreenBtn.disabled).toBe(true);

    (player as any).lockPlaybackControls(false);

    expect(playBtn.disabled).toBe(false);
    expect(scrubber.disabled).toBe(false);
    expect(speedSelector.disabled).toBe(false);
    expect(fullscreenBtn.disabled).toBe(false);
  });

  it('should ignore keyboard events when exporting', () => {
    const mockController = {
      getState: vi.fn().mockReturnValue({ currentFrame: 0, duration: 10, fps: 30, isPlaying: false }),
      play: vi.fn(),
      pause: vi.fn(),
      seek: vi.fn(),
      subscribe: vi.fn().mockReturnValue(() => {}),
      onError: vi.fn().mockReturnValue(() => {}),
      dispose: vi.fn(),
      setPlaybackRate: vi.fn()
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
            seek: vi.fn(),
            subscribe: vi.fn().mockReturnValue(() => {}),
            onError: vi.fn().mockReturnValue(() => {}),
            dispose: vi.fn(),
            setPlaybackRate: vi.fn()
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
        seek: vi.fn(),
        subscribe: vi.fn().mockReturnValue(() => {}),
        onError: vi.fn().mockReturnValue(() => {}),
        dispose: vi.fn(),
        setPlaybackRate: vi.fn()
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
        seek: vi.fn(),
        subscribe: vi.fn().mockReturnValue(() => {}),
        onError: vi.fn().mockReturnValue(() => {}),
        dispose: vi.fn(),
        setPlaybackRate: vi.fn()
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
            seek: vi.fn(),
            subscribe: vi.fn().mockReturnValue(() => {}),
            onError: vi.fn().mockReturnValue(() => {}),
            dispose: vi.fn(),
            setPlaybackRate: vi.fn()
        };
        (player as any).setController(mockController);

        // Access the mocked exporter constructor to setup the throw
        const { ClientSideExporter } = await import('./features/exporter');
        const mockExport = vi.fn().mockRejectedValue(new Error('Codec not supported'));
        (ClientSideExporter as any).mockImplementation(function() {
          return { export: mockExport };
        });

        // Trigger export via private method to await it
        await (player as any).renderClientSide();

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
            seek: vi.fn(),
            subscribe: vi.fn().mockReturnValue(() => {}),
            onError: vi.fn().mockReturnValue(() => {}),
            dispose: vi.fn(),
            setPlaybackRate: vi.fn()
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
        await (player as any).renderClientSide();

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
            seek: vi.fn(),
            subscribe: vi.fn().mockReturnValue(() => {}),
            onError: vi.fn().mockReturnValue(() => {}),
            dispose: vi.fn(),
            setPlaybackRate: vi.fn(),
            setAudioVolume: vi.fn(),
            setAudioMuted: vi.fn(),
            setInputProps: vi.fn(),
            captureFrame: vi.fn(),
            getAudioTracks: vi.fn()
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
            seek: vi.fn(),
            setAudioVolume: vi.fn(),
            setAudioMuted: vi.fn(),
            setPlaybackRate: vi.fn(),
            subscribe: vi.fn().mockReturnValue(() => {}),
            onError: vi.fn().mockReturnValue(() => {}),
            dispose: vi.fn(),
            setInputProps: vi.fn(),
            captureFrame: vi.fn(),
            getAudioTracks: vi.fn()
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
            seek: vi.fn(),
            setAudioVolume: vi.fn(),
            setAudioMuted: vi.fn(),
            setPlaybackRate: vi.fn(),
            subscribe: vi.fn().mockReturnValue(() => {}),
            onError: vi.fn().mockReturnValue(() => {}),
            dispose: vi.fn(),
            setInputProps: vi.fn(),
            captureFrame: vi.fn(),
            getAudioTracks: vi.fn()
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
            seek: vi.fn(),
            subscribe: vi.fn().mockReturnValue(() => {}),
            onError: vi.fn().mockReturnValue(() => {}),
            dispose: vi.fn(),
            setPlaybackRate: vi.fn(),
            setInputProps: vi.fn()
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

    it('should hide status overlay when poster is present (initial load)', () => {
        const p = new HeliosPlayer();
        p.setAttribute('poster', 'poster.jpg');
        document.body.appendChild(p);

        // Initial state
        const overlay = p.shadowRoot!.querySelector('.status-overlay');
        expect(overlay!.classList.contains('hidden')).toBe(true);
    });
  });
});
