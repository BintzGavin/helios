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

    const dispatchKey = (key: string) => {
        const event = new KeyboardEvent('keydown', {
            key,
            bubbles: true,
            composed: true
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

    // ArrowRight: Seek +10
    mockController.getState.mockReturnValue({ currentFrame: 0, duration: 10, fps: 30, isPlaying: false });
    dispatchKey('ArrowRight');
    expect(mockController.seek).toHaveBeenCalledWith(10);

    // ArrowLeft: Seek -10
    mockController.getState.mockReturnValue({ currentFrame: 20, duration: 10, fps: 30, isPlaying: false });
    dispatchKey('ArrowLeft');
    expect(mockController.seek).toHaveBeenCalledWith(10);
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
});
