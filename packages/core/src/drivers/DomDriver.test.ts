// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DomDriver } from './DomDriver';

describe('DomDriver', () => {
  let driver: DomDriver;
  let scope: HTMLElement;

  beforeEach(() => {
    driver = new DomDriver();
    scope = document.createElement('div');
    driver.init(scope);

    // Mock getAnimations since JSDOM might not implement it fully or we want to control it
    scope.getAnimations = vi.fn().mockReturnValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should sync WAAPI animations', () => {
    const mockAnim = {
      currentTime: 0,
      playState: 'running',
      pause: vi.fn(),
    } as unknown as Animation;

    scope.getAnimations = vi.fn().mockReturnValue([mockAnim]);

    driver.update(1000);

    expect(mockAnim.currentTime).toBe(1000);
    expect(mockAnim.pause).toHaveBeenCalled();
  });

  it('should sync media elements when scrubbing (not playing)', () => {
    const mockAudio = document.createElement('audio');
    // Mock properties/methods that might not work in JSDOM
    Object.defineProperty(mockAudio, 'duration', { value: 100, writable: true });
    Object.defineProperty(mockAudio, 'currentTime', { value: 0, writable: true });
    Object.defineProperty(mockAudio, 'paused', { value: false, writable: true }); // Simulate playing
    mockAudio.pause = vi.fn();
    mockAudio.play = vi.fn();

    scope.appendChild(mockAudio);

    driver.update(2000, { isPlaying: false, playbackRate: 1 });

    expect(mockAudio.pause).toHaveBeenCalled();
    expect(mockAudio.currentTime).toBe(2);
  });

  it('should sync media elements when playing', () => {
    const mockVideo = document.createElement('video');
    Object.defineProperty(mockVideo, 'currentTime', { value: 0, writable: true });
    Object.defineProperty(mockVideo, 'paused', { value: true, writable: true });
    mockVideo.play = vi.fn().mockResolvedValue(undefined);
    mockVideo.pause = vi.fn();

    scope.appendChild(mockVideo);

    // 0.5s is > 0.25s drift from 0s, so it should seek
    driver.update(500, { isPlaying: true, playbackRate: 1 });

    expect(mockVideo.play).toHaveBeenCalled();
    expect(mockVideo.currentTime).toBe(0.5);
  });

  it('should NOT sync media elements when playing if drift is small', () => {
    const mockVideo = document.createElement('video');
    Object.defineProperty(mockVideo, 'currentTime', { value: 1.0, writable: true }); // 1.0s
    Object.defineProperty(mockVideo, 'paused', { value: false, writable: true });
    mockVideo.play = vi.fn();

    scope.appendChild(mockVideo);

    // Update to 1.1s (diff 0.1s < 0.25s tolerance)
    driver.update(1100, { isPlaying: true, playbackRate: 1 });

    expect(mockVideo.currentTime).toBe(1.0); // Should not have changed
  });

  it('should sync playbackRate', () => {
    const mockAudio = document.createElement('audio');
    mockAudio.play = vi.fn().mockResolvedValue(undefined);
    scope.appendChild(mockAudio);

    driver.update(0, { isPlaying: true, playbackRate: 2 });

    expect(mockAudio.playbackRate).toBe(2);
  });

  it('should sync volume', () => {
    const mockAudio = document.createElement('audio');
    Object.defineProperty(mockAudio, 'volume', { value: 1, writable: true });
    scope.appendChild(mockAudio);

    driver.update(0, { isPlaying: false, playbackRate: 1, volume: 0.5 });

    expect(mockAudio.volume).toBe(0.5);
  });

  it('should sync muted state', () => {
    const mockAudio = document.createElement('audio');
    Object.defineProperty(mockAudio, 'muted', { value: false, writable: true });
    scope.appendChild(mockAudio);

    driver.update(0, { isPlaying: false, playbackRate: 1, muted: true });

    expect(mockAudio.muted).toBe(true);
  });

  it('should not update volume if not provided', () => {
    const mockAudio = document.createElement('audio');
    Object.defineProperty(mockAudio, 'volume', { value: 1, writable: true });
    scope.appendChild(mockAudio);

    driver.update(0, { isPlaying: false, playbackRate: 1 });

    expect(mockAudio.volume).toBe(1);
  });
});
