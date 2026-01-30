import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HeliosPlayer } from './index';
import type { HeliosController } from './controllers';

describe('HeliosPlayer Captions', () => {
  let player: HeliosPlayer;
  let mockController: HeliosController;

  beforeEach(() => {
    // Mock ResizeObserver
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as any;

    // Mock Fetch
    global.fetch = vi.fn();

    // Mock Controller
    mockController = {
      play: vi.fn(),
      pause: vi.fn(),
      seek: vi.fn(),
      setAudioVolume: vi.fn(),
      setAudioMuted: vi.fn(),
      setLoop: vi.fn(),
      setPlaybackRate: vi.fn(),
      setPlaybackRange: vi.fn(),
      clearPlaybackRange: vi.fn(),
      setInputProps: vi.fn(),
      setCaptions: vi.fn(),
      subscribe: vi.fn(() => () => {}),
      onError: vi.fn(() => () => {}),
      getState: vi.fn(() => ({ fps: 30, duration: 10, currentFrame: 0, isPlaying: false })),
      dispose: vi.fn(),
      captureFrame: vi.fn(),
      getAudioTracks: vi.fn(),
      getSchema: vi.fn()
    };

    // Create Player
    // Ensure custom element is defined (it might be defined by import side effect)
    if (!customElements.get('helios-player')) {
        customElements.define('helios-player', HeliosPlayer);
    }
    player = document.createElement('helios-player') as HeliosPlayer;
    document.body.appendChild(player);

    // Manually trigger controller connection (since we are not using iframe/bridge in this unit test)
    // We access the private method via 'any' casting.
    (player as any).setController(mockController);
  });

  afterEach(() => {
    document.body.removeChild(player);
    vi.restoreAllMocks();
  });

  it('should load captions from a default track element', async () => {
    const srtContent = "1\n00:00:01,000 --> 00:00:02,000\nHello World";
    (global.fetch as any).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(srtContent)
    });

    const track = document.createElement('track');
    track.setAttribute('kind', 'captions');
    track.setAttribute('src', 'subs.srt');
    track.setAttribute('default', '');

    player.appendChild(track);

    // Wait for slotchange and fetch
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(global.fetch).toHaveBeenCalledWith(expect.stringMatching(/subs.srt$/));
    expect(mockController.setCaptions).toHaveBeenCalledWith(srtContent);
  });

  it('should clear captions if no default track is found', async () => {
    const track = document.createElement('track');
    track.setAttribute('kind', 'captions');
    track.setAttribute('src', 'subs.srt');
    // default is missing

    player.appendChild(track);

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(global.fetch).not.toHaveBeenCalled();
    // It should be called with empty array because logic says "if no default track, clear captions"
    expect(mockController.setCaptions).toHaveBeenCalledWith([]);
  });

  it('should clear captions when track is removed', async () => {
    // 1. Add track
    const srtContent = "1\n00:00:01,000 --> 00:00:02,000\nHello World";
    (global.fetch as any).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(srtContent)
    });
    const track = document.createElement('track');
    track.setAttribute('kind', 'captions');
    track.setAttribute('src', 'subs.srt');
    track.setAttribute('default', '');
    player.appendChild(track);
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(mockController.setCaptions).toHaveBeenCalledWith(srtContent);

    // 2. Remove track
    player.removeChild(track);
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(mockController.setCaptions).toHaveBeenCalledWith([]);
  });

  it('should handle fetch errors gracefully', async () => {
     // Clear initialization call from setController
     (mockController.setCaptions as any).mockClear();

     (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 404
    });

    const track = document.createElement('track');
    track.setAttribute('kind', 'captions');
    track.setAttribute('src', 'missing.srt');
    track.setAttribute('default', '');

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    player.appendChild(track);

    await new Promise(resolve => setTimeout(resolve, 100));

    expect(global.fetch).toHaveBeenCalledWith(expect.stringMatching(/missing.srt$/));
    expect(mockController.setCaptions).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith("HeliosPlayer: Failed to load captions", expect.anything());
  });
});
