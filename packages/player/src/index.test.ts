// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HeliosPlayer } from './index';

// Mock requestFullscreen if not available in JSDOM
if (!HTMLElement.prototype.requestFullscreen) {
  HTMLElement.prototype.requestFullscreen = vi.fn();
}

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
});
