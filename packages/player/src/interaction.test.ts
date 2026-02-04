// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HeliosPlayer } from './index';

// Mock ResizeObserver
global.ResizeObserver = class {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
} as any;

describe('HeliosPlayer Interaction Fixes', () => {
  let player: HeliosPlayer;

  beforeEach(() => {
    document.body.innerHTML = '';
    player = new HeliosPlayer();
    document.body.appendChild(player);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('should focus the player when click-layer is clicked', () => {
    const clickLayer = player.shadowRoot!.querySelector('.click-layer') as HTMLDivElement;
    expect(clickLayer).toBeTruthy();

    // Ensure player is not focused initially
    if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
    }
    expect(document.activeElement).not.toBe(player);

    // Click
    clickLayer.click();

    // Expect player to be focused
    expect(document.activeElement).toBe(player);
  });

  it('should toggle captions when "c" is pressed', () => {
    // Setup mock controller
    const mockController = {
        getState: vi.fn(() => ({ fps: 30, duration: 10, currentFrame: 0 })),
        subscribe: vi.fn(() => () => {}),
        onError: vi.fn(() => () => {}),
        setAudioVolume: vi.fn(),
        setAudioMuted: vi.fn(),
        setLoop: vi.fn(),
        pause: vi.fn(),
        dispose: vi.fn(),
    };
    (player as any).controller = mockController;

    const ccBtn = player.shadowRoot!.querySelector('.cc-btn');
    expect(ccBtn?.classList.contains('active')).toBe(false);

    player.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true }));
    expect(ccBtn?.classList.contains('active')).toBe(true);

    player.dispatchEvent(new KeyboardEvent('keydown', { key: 'C', bubbles: true }));
    expect(ccBtn?.classList.contains('active')).toBe(false);
  });

  it('should seek to start when Home is pressed', () => {
    const mockSeek = vi.fn();
    const mockController = {
        getState: vi.fn(() => ({ fps: 30, duration: 10, currentFrame: 100 })),
        seek: mockSeek,
        subscribe: vi.fn(() => () => {}),
        onError: vi.fn(() => () => {}),
        pause: vi.fn(),
        dispose: vi.fn(),
    };
    (player as any).controller = mockController;

    player.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    expect(mockSeek).toHaveBeenCalledWith(0);
  });

  it('should seek to end when End is pressed', () => {
    const mockSeek = vi.fn();
    const mockController = {
        getState: vi.fn(() => ({ fps: 30, duration: 10, currentFrame: 0 })), // 300 frames total
        seek: mockSeek,
        subscribe: vi.fn(() => () => {}),
        onError: vi.fn(() => () => {}),
        pause: vi.fn(),
        dispose: vi.fn(),
    };
    (player as any).controller = mockController;

    player.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(mockSeek).toHaveBeenCalledWith(300);
  });

  it('should seek to percentage when number keys are pressed', () => {
    const mockSeek = vi.fn();
    const mockController = {
        getState: vi.fn(() => ({ fps: 30, duration: 10, currentFrame: 0 })), // 300 frames total
        seek: mockSeek,
        subscribe: vi.fn(() => () => {}),
        onError: vi.fn(() => () => {}),
        pause: vi.fn(),
        dispose: vi.fn(),
    };
    (player as any).controller = mockController;

    // Press '0' -> 0% -> frame 0
    player.dispatchEvent(new KeyboardEvent('keydown', { key: '0', bubbles: true }));
    expect(mockSeek).toHaveBeenCalledWith(0);

    // Press '5' -> 50% -> frame 150
    player.dispatchEvent(new KeyboardEvent('keydown', { key: '5', bubbles: true }));
    expect(mockSeek).toHaveBeenCalledWith(150);

    // Press '9' -> 90% -> frame 270
    player.dispatchEvent(new KeyboardEvent('keydown', { key: '9', bubbles: true }));
    expect(mockSeek).toHaveBeenCalledWith(270);
  });
});
