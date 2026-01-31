import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HeliosPlayer } from '../index';

describe('HeliosPlayer Picture-in-Picture', () => {
  let player: HeliosPlayer;
  let mockVideo: HTMLVideoElement;
  let mockCanvas: HTMLCanvasElement;
  let mockStream: MediaStream;
  let mockPipWindow: PictureInPictureWindow;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock ResizeObserver
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as any;

    // Mock document.pictureInPictureEnabled
    Object.defineProperty(document, 'pictureInPictureEnabled', {
      value: true,
      writable: true
    });

    // Mock requestPictureInPicture on HTMLVideoElement prototype
    mockPipWindow = {} as PictureInPictureWindow;
    HTMLVideoElement.prototype.requestPictureInPicture = vi.fn().mockResolvedValue(mockPipWindow);
    HTMLVideoElement.prototype.play = vi.fn().mockResolvedValue(undefined);

    // Mock captureStream on HTMLCanvasElement prototype
    mockStream = {} as MediaStream;
    HTMLCanvasElement.prototype.captureStream = vi.fn().mockReturnValue(mockStream);

    // Create player instance
    player = new HeliosPlayer();
    document.body.appendChild(player);

    // Mock iframe content access (Same Origin)
    const iframe = player.shadowRoot?.querySelector('iframe');
    if (iframe) {
        mockCanvas = document.createElement('canvas');
        // We need to mock the contentWindow/contentDocument access
        // Since jsdom iframes are tricky, we'll spy on the method if possible,
        // or ensure the logic in HeliosPlayer handles the test environment.
        // For this test, we might need to manually inject the canvas or mock the query selector
        // But the player logic will try to access iframe.contentDocument.

        // In jsdom, accessing contentDocument of a cross-origin iframe (default) might block.
        // But here we are in same origin.

        // Let's mock the iframe's contentDocument getter if possible, or just rely on jsdom behavior
        // jsdom iframes don't load external content by default.

        // We can define a getter for contentDocument on the iframe element itself for testing
        Object.defineProperty(iframe, 'contentDocument', {
            get: () => {
                const doc = document.implementation.createHTMLDocument();
                doc.body.appendChild(mockCanvas);
                return doc;
            },
            configurable: true
        });
    }
  });

  afterEach(() => {
    if (player && player.parentNode) {
      document.body.removeChild(player);
    }
  });

  it('should be defined', () => {
    expect(player).toBeInstanceOf(HeliosPlayer);
  });

  it('should expose requestPictureInPicture method', () => {
    expect(typeof player.requestPictureInPicture).toBe('function');
  });

  it('should throw error if Picture-in-Picture is not enabled in document', async () => {
    Object.defineProperty(document, 'pictureInPictureEnabled', { value: false });
    await expect(player.requestPictureInPicture()).rejects.toThrow('Picture-in-Picture not supported');
  });

  it('should throw error if canvas cannot be found (e.g. Cross-Origin)', async () => {
    // Mock iframe to return null for contentDocument (simulating cross-origin or access denied)
    const iframe = player.shadowRoot?.querySelector('iframe');
    if (iframe) {
        Object.defineProperty(iframe, 'contentDocument', {
            get: () => null
        });
        // Also mock contentWindow document access failing
        Object.defineProperty(iframe, 'contentWindow', {
            get: () => ({ document: undefined }) // Simplified mock
        });
    }

    await expect(player.requestPictureInPicture()).rejects.toThrow();
    // We accept any error message related to access or missing canvas
  });

  it('should successfully request Picture-in-Picture when canvas is available', async () => {
    const result = await player.requestPictureInPicture();

    expect(HTMLCanvasElement.prototype.captureStream).toHaveBeenCalled();
    expect(HTMLVideoElement.prototype.requestPictureInPicture).toHaveBeenCalled();
    expect(result).toBe(mockPipWindow);
  });
});
