// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HeliosPlayer } from '../index';
import { HeliosAudioTrack } from './audio-tracks';

// Mock ClientSideExporter
vi.mock('./exporter', () => {
  return {
    ClientSideExporter: vi.fn().mockImplementation(() => {
      return {
        export: vi.fn(),
        saveCaptionsAsSRT: vi.fn()
      };
    })
  };
});

// Mock ResizeObserver
global.ResizeObserver = class {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
} as any;

describe('Audio Menu Accessibility', () => {
  let player: HeliosPlayer;
  let mockController: any;

  beforeEach(() => {
    document.body.innerHTML = '';
    player = new HeliosPlayer();
    document.body.appendChild(player);

    mockController = {
        getState: vi.fn().mockReturnValue({
            currentFrame: 0,
            duration: 10,
            fps: 30,
            isPlaying: false,
            audioTracks: {},
            availableAudioTracks: []
        }),
        play: vi.fn(),
        pause: vi.fn(),
        seek: vi.fn(),
        subscribe: vi.fn().mockReturnValue(() => {}),
        onError: vi.fn().mockReturnValue(() => {}),
        dispose: vi.fn(),
        setCaptions: vi.fn(),
        setPlaybackRate: vi.fn(),
        setAudioVolume: vi.fn(),
        setAudioMuted: vi.fn(),
        setAudioTrackVolume: vi.fn(),
        setAudioTrackMuted: vi.fn(),
        setInputProps: vi.fn(),
        setLoop: vi.fn(),
        setPlaybackRange: vi.fn(),
        clearPlaybackRange: vi.fn(),
        captureFrame: vi.fn(),
        getAudioTracks: vi.fn(), startAudioMetering: vi.fn(), stopAudioMetering: vi.fn(), onAudioMetering: vi.fn().mockReturnValue(() => {}), diagnose: vi.fn()
    };
    (player as any).setController(mockController);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should toggle aria-expanded when button is clicked', () => {
    // Add a dummy track so button is visible
    player.audioTracks.addTrack(new HeliosAudioTrack('1', 'main', 'Main', 'en', true, player));

    // Force UI update to show button
    (player as any).updateAudioBtnVisibility();

    const btn = player.shadowRoot!.querySelector('.audio-btn') as HTMLButtonElement;

    // Ensure button is visible (display not none)
    expect(btn.style.display).not.toBe('none');
    expect(btn.getAttribute('aria-expanded')).toBe('false');

    // Open
    btn.click();
    expect(btn.getAttribute('aria-expanded')).toBe('true');

    // Close
    btn.click();
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });

  it('should move focus to first element when opened', () => {
    player.audioTracks.addTrack(new HeliosAudioTrack('1', 'main', 'Main', 'en', true, player));
    (player as any).updateAudioBtnVisibility();

    const btn = player.shadowRoot!.querySelector('.audio-btn') as HTMLButtonElement;

    // Open menu
    btn.click();

    const menu = player.shadowRoot!.querySelector('.audio-menu') as HTMLElement;
    const firstInput = menu.querySelector('input');

    expect(firstInput).toBeTruthy();
    expect(player.shadowRoot!.activeElement).toBe(firstInput);
  });

  it('should close on Escape and return focus to button', () => {
    player.audioTracks.addTrack(new HeliosAudioTrack('1', 'main', 'Main', 'en', true, player));
    (player as any).updateAudioBtnVisibility();

    const btn = player.shadowRoot!.querySelector('.audio-btn') as HTMLButtonElement;

    // Open menu
    btn.click();
    expect(btn.getAttribute('aria-expanded')).toBe('true');

    // Press Escape
    const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        composed: true
    });

    player.dispatchEvent(event);

    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(player.shadowRoot!.querySelector('.audio-menu')!.classList.contains('hidden')).toBe(true);
    expect(player.shadowRoot!.activeElement).toBe(btn);
  });

  it('should close when clicking outside', () => {
    player.audioTracks.addTrack(new HeliosAudioTrack('1', 'main', 'Main', 'en', true, player));
    (player as any).updateAudioBtnVisibility();

    const btn = player.shadowRoot!.querySelector('.audio-btn') as HTMLButtonElement;

    // Open menu
    btn.click();
    expect(btn.getAttribute('aria-expanded')).toBe('true');

    // Click outside (on document body)
    document.body.click();

    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(player.shadowRoot!.querySelector('.audio-menu')!.classList.contains('hidden')).toBe(true);
  });
});
