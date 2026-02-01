// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HeliosPlayer } from '../index';
import { HeliosTextTrack, HeliosTextTrackList } from './text-tracks';

// Mock ClientSideExporter
vi.mock('./exporter', () => {
  return {
    ClientSideExporter: vi.fn().mockImplementation(() => {
      return {
        export: vi.fn()
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

describe('HeliosPlayer Smart Controls', () => {
  let player: HeliosPlayer;

  beforeEach(() => {
    document.body.innerHTML = '';
    // Use constructor directly to ensure instance is created correctly in test env
    player = new HeliosPlayer();
    document.body.appendChild(player);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('disablePictureInPicture', () => {
    it('should default to enabled (visible)', () => {
        expect(player.disablePictureInPicture).toBe(false);
        const pipBtn = player.shadowRoot!.querySelector('.pip-btn') as HTMLButtonElement;
        expect(pipBtn.style.display).not.toBe('none');
    });

    it('should hide pip button when attribute is set', () => {
        player.setAttribute('disablepictureinpicture', '');
        expect(player.disablePictureInPicture).toBe(true);
        const pipBtn = player.shadowRoot!.querySelector('.pip-btn') as HTMLButtonElement;
        expect(pipBtn.style.display).toBe('none');
    });

    it('should hide pip button when property is set', () => {
        player.disablePictureInPicture = true;
        expect(player.hasAttribute('disablepictureinpicture')).toBe(true);
        const pipBtn = player.shadowRoot!.querySelector('.pip-btn') as HTMLButtonElement;
        expect(pipBtn.style.display).toBe('none');
    });

    it('should show pip button when attribute is removed', () => {
        player.setAttribute('disablepictureinpicture', '');
        expect(player.disablePictureInPicture).toBe(true);

        player.removeAttribute('disablepictureinpicture');
        expect(player.disablePictureInPicture).toBe(false);
        const pipBtn = player.shadowRoot!.querySelector('.pip-btn') as HTMLButtonElement;
        expect(pipBtn.style.display).not.toBe('none');
    });
  });

  describe('Smart CC Button', () => {
    it('should hide CC button initially (no tracks)', () => {
        const ccBtn = player.shadowRoot!.querySelector('.cc-btn') as HTMLButtonElement;
        // In JSDOM, computed style might not be fully calculated, but we check inline style
        // Our logic sets inline style.display = 'none' if empty
        // However, handleSlotChange is called on connect.
        expect(ccBtn.style.display).toBe('none');
    });

    it('should show CC button when tracks are added', () => {
        const track = document.createElement('track');
        track.setAttribute('kind', 'captions');
        track.setAttribute('label', 'English');
        track.setAttribute('srclang', 'en');

        player.appendChild(track);

        // slotchange is async in some envs or we might need to manually trigger handleSlotChange in unit test environment if slot logic isn't fully emulated
        // But let's check if we can trigger it.
        // In JSDOM, slotchange might not fire automatically or correctly for web components without full browser layout.
        // We can manually call handleSlotChange if needed, but let's see if our existing logic covers it.
        // We attached slotchange listener in connectedCallback.

        // Simulating slotchange
        (player as any).handleSlotChange();

        const ccBtn = player.shadowRoot!.querySelector('.cc-btn') as HTMLButtonElement;
        expect(ccBtn.style.display).not.toBe('none');
    });

    it('should hide CC button when all tracks are removed', () => {
        // Add track
        const track = document.createElement('track');
        player.appendChild(track);
        (player as any).handleSlotChange();

        const ccBtn = player.shadowRoot!.querySelector('.cc-btn') as HTMLButtonElement;
        expect(ccBtn.style.display).not.toBe('none');

        // Remove track
        player.removeChild(track);
        (player as any).handleSlotChange();

        expect(ccBtn.style.display).toBe('none');
    });

    it('should show CC button when track is added via JS API', () => {
        const ccBtn = player.shadowRoot!.querySelector('.cc-btn') as HTMLButtonElement;
        expect(ccBtn.style.display).toBe('none');

        player.addTextTrack('captions', 'JS Track', 'en');

        expect(ccBtn.style.display).not.toBe('none');
    });

    it('should auto-enable captions if default track is present', () => {
        const track = document.createElement('track');
        track.setAttribute('kind', 'captions');
        track.setAttribute('default', '');

        player.appendChild(track);
        (player as any).handleSlotChange();

        // Check showCaptions state
        expect((player as any).showCaptions).toBe(true);

        // Check UI state
        const ccBtn = player.shadowRoot!.querySelector('.cc-btn') as HTMLButtonElement;
        expect(ccBtn.classList.contains('active')).toBe(true);
    });

    it('should NOT auto-enable captions if no default track is present', () => {
        const track = document.createElement('track');
        track.setAttribute('kind', 'captions');

        player.appendChild(track);
        (player as any).handleSlotChange();

        // Check showCaptions state
        expect((player as any).showCaptions).toBe(false);

        // Check UI state
        const ccBtn = player.shadowRoot!.querySelector('.cc-btn') as HTMLButtonElement;
        expect(ccBtn.classList.contains('active')).toBe(false);
    });
  });
});
