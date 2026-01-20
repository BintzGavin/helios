import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HeliosPlayer } from '../src/index';

// Mock the strategies since they use browser APIs not fully available in JSDOM
vi.mock('../src/strategies/CanvasExportStrategy', () => ({
  CanvasExportStrategy: vi.fn().mockImplementation(() => ({
    export: vi.fn().mockResolvedValue(undefined)
  }))
}));

vi.mock('../src/strategies/DomExportStrategy', () => ({
  DomExportStrategy: vi.fn().mockImplementation(() => ({
    export: vi.fn().mockResolvedValue(undefined)
  }))
}));

// Mock Helios core
vi.mock('@helios-project/core', () => ({
  Helios: vi.fn().mockImplementation(() => ({
    getState: vi.fn().mockReturnValue({ duration: 5, fps: 60, currentFrame: 0, isPlaying: false }),
    subscribe: vi.fn(),
    seek: vi.fn(),
    play: vi.fn(),
    pause: vi.fn()
  }))
}));

describe('HeliosPlayer', () => {
  let player: HeliosPlayer;

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
    player = new HeliosPlayer();
    document.body.appendChild(player);
  });

  it('should be defined', () => {
    expect(player).toBeInstanceOf(HTMLElement);
    expect(customElements.get('helios-player')).toBeDefined();
  });

  it('should have shadow root', () => {
    expect(player.shadowRoot).not.toBeNull();
  });

  it('should contain iframe and controls', () => {
    const shadow = player.shadowRoot!;
    expect(shadow.querySelector('iframe')).not.toBeNull();
    expect(shadow.querySelector('.controls')).not.toBeNull();
    expect(shadow.querySelector('.play-pause-btn')).not.toBeNull();
    expect(shadow.querySelector('.export-btn')).not.toBeNull();
  });

  it('should set iframe src from attribute', () => {
    player.setAttribute('src', 'test.html');
    // Re-attach to trigger connectedCallback again or just manually call if needed,
    // but connectedCallback runs on appendChild.
    // Let's create a new one to test attribute handling
    const newPlayer = document.createElement('helios-player') as HeliosPlayer;
    newPlayer.setAttribute('src', 'test.html');
    document.body.appendChild(newPlayer);

    const iframe = newPlayer.shadowRoot!.querySelector('iframe');
    expect(iframe?.getAttribute('src')).toBe('test.html');
  });
});
