import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HeliosMediaSession } from './media-session';
import type { HeliosController } from '../controllers';

describe('HeliosMediaSession', () => {
  let player: HTMLElement;
  let controller: HeliosController;
  let mockMediaSession: any;
  let mockSetActionHandler: any;
  let mockSetPositionState: any;

  beforeEach(() => {
    // Mock navigator.mediaSession
    mockSetActionHandler = vi.fn();
    mockSetPositionState = vi.fn();
    mockMediaSession = {
      metadata: null,
      playbackState: 'none',
      setActionHandler: mockSetActionHandler,
      setPositionState: mockSetPositionState
    };

    vi.stubGlobal('navigator', {
      mediaSession: mockMediaSession
    });

    // Mock MediaMetadata
    vi.stubGlobal('MediaMetadata', class {
      constructor(public init: any) {}
    });

    // Mock Player (HTMLElement)
    player = {
      getAttribute: vi.fn((name) => {
        if (name === 'media-title') return 'Test Title';
        if (name === 'media-artist') return 'Test Artist';
        if (name === 'poster') return 'poster.jpg';
        return null;
      })
    } as any;

    // Mock Controller
    controller = {
      subscribe: vi.fn((cb) => {
        return () => {};
      }),
      getState: vi.fn(() => ({
        isPlaying: false,
        duration: 10,
        fps: 30,
        currentFrame: 0
      })),
      play: vi.fn(),
      pause: vi.fn(),
      seek: vi.fn(),
      // Add other required methods to satisfy interface
      setAudioVolume: vi.fn(),
      setAudioMuted: vi.fn(),
      setAudioTrackVolume: vi.fn(),
      setAudioTrackMuted: vi.fn(),
      setLoop: vi.fn(),
      setPlaybackRate: vi.fn(),
      setPlaybackRange: vi.fn(),
      clearPlaybackRange: vi.fn(),
      setCaptions: vi.fn(),
      setInputProps: vi.fn(),
      setDuration: vi.fn(),
      setFps: vi.fn(),
      setSize: vi.fn(),
      setMarkers: vi.fn(),
      onError: vi.fn(() => () => {}),
      dispose: vi.fn(),
      captureFrame: vi.fn(),
      getAudioTracks: vi.fn(),
      getSchema: vi.fn(),
      diagnose: vi.fn()
    };
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should initialize metadata from attributes', () => {
    new HeliosMediaSession(player, controller);
    expect(mockMediaSession.metadata).toEqual({
      title: 'Test Title',
      artist: 'Test Artist',
      album: '',
      artwork: [{ src: 'poster.jpg' }]
    });
  });

  it('should update metadata when updateMetadata is called', () => {
    const session = new HeliosMediaSession(player, controller);

    // Change attribute mock
    (player.getAttribute as any).mockImplementation((name: string) => {
      if (name === 'media-title') return 'New Title';
      return null;
    });

    session.updateMetadata();
    expect(mockMediaSession.metadata).toEqual({
      title: 'New Title',
      artist: '',
      album: '',
      artwork: []
    });
  });

  it('should set action handlers', () => {
    new HeliosMediaSession(player, controller);
    expect(mockSetActionHandler).toHaveBeenCalledWith('play', expect.any(Function));
    expect(mockSetActionHandler).toHaveBeenCalledWith('pause', expect.any(Function));
    expect(mockSetActionHandler).toHaveBeenCalledWith('seekto', expect.any(Function));
  });

  it('should update playback state', () => {
    const session = new HeliosMediaSession(player, controller);

    session.updateState({
      isPlaying: true,
      duration: 100,
      fps: 30,
      currentFrame: 30
    });

    expect(mockMediaSession.playbackState).toBe('playing');
    expect(mockSetPositionState).toHaveBeenCalledWith({
      duration: 100,
      playbackRate: 1,
      position: 1
    });
  });

  it('should handle play action', () => {
    new HeliosMediaSession(player, controller);
    const playHandler = mockSetActionHandler.mock.calls.find((c: any) => c[0] === 'play')[1];
    playHandler();
    expect(controller.play).toHaveBeenCalled();
  });

  it('should handle seekto action', () => {
    new HeliosMediaSession(player, controller);
    const seekHandler = mockSetActionHandler.mock.calls.find((c: any) => c[0] === 'seekto')[1];
    seekHandler({ seekTime: 5 });
    // 5 seconds * 30 fps = 150 frames
    expect(controller.seek).toHaveBeenCalledWith(150);
  });

  it('should destroy correctly', () => {
    const session = new HeliosMediaSession(player, controller);
    session.destroy();
    expect(mockSetActionHandler).toHaveBeenCalledWith('play', null);
    expect(mockMediaSession.playbackState).toBe('none');
  });
});
