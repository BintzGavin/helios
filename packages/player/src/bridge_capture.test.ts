// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { connectToParent } from './bridge';

// Mock AudioFader
vi.mock('./features/audio-fader', () => ({
    AudioFader: class {
        connect = vi.fn();
        enable = vi.fn();
        disable = vi.fn();
        dispose = vi.fn();
    }
}));

// Mock Helios
vi.mock('@helios-project/core', () => {
    return {
        Helios: vi.fn()
    };
});

// Mock dom-capture
vi.mock('./features/dom-capture', () => ({
    captureDomToBitmap: vi.fn()
}));

// Mock audio-utils
vi.mock('./features/audio-utils', () => ({
    getAudioAssets: vi.fn()
}));

describe('connectToParent - handleCaptureFrame', () => {
    let mockHelios: any;
    let messageHandlers: ((ev: MessageEvent) => void)[] = [];
    let parentPostMessage: any;
    let mockCanvas: HTMLCanvasElement;
    let mockContext: any;
    let mockOffscreenCanvas: any;
    let originalOffscreenCanvas: any;
    let originalCreateImageBitmap: any;

    beforeEach(() => {
        messageHandlers = [];
        mockHelios = {
            play: vi.fn(),
            pause: vi.fn(),
            seek: vi.fn(),
            setPlaybackRate: vi.fn(),
            setPlaybackRange: vi.fn(),
            clearPlaybackRange: vi.fn(),
            setAudioVolume: vi.fn(),
            setAudioMuted: vi.fn(),
            setLoop: vi.fn(),
            setInputProps: vi.fn(),
            setCaptions: vi.fn(),
            setDuration: vi.fn(),
            setFps: vi.fn(),
            setSize: vi.fn(),
            setMarkers: vi.fn(),
            getState: vi.fn().mockReturnValue({ activeCaptions: [] }),
            subscribe: vi.fn(),
            schema: {}
        };

        // Mock window.addEventListener
        vi.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
            if (event === 'message') {
                messageHandlers.push(handler as any);
            }
        });

        // Mock window.parent
        parentPostMessage = vi.fn();
        Object.defineProperty(window, 'parent', {
            value: {
                postMessage: parentPostMessage
            },
            writable: true
        });

        // Mock document.querySelector
        mockCanvas = document.createElement('canvas');
        mockCanvas.width = 1920;
        mockCanvas.height = 1080;
        vi.spyOn(document, 'querySelector').mockReturnValue(mockCanvas);

        // Mock requestAnimationFrame
        vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
            cb(0);
            return 1;
        });

        // Mock OffscreenCanvas
        originalOffscreenCanvas = global.OffscreenCanvas;
        mockOffscreenCanvas = {
            getContext: vi.fn().mockReturnValue({
                drawImage: vi.fn()
            })
        };
        vi.stubGlobal('OffscreenCanvas', vi.fn(function(width, height) {
            return mockOffscreenCanvas;
        }));

        // Mock createImageBitmap
        originalCreateImageBitmap = global.createImageBitmap;
        vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({} as ImageBitmap));

        // Connect the bridge
        connectToParent(mockHelios);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        if (originalOffscreenCanvas) {
            vi.stubGlobal('OffscreenCanvas', originalOffscreenCanvas);
        } else {
            vi.stubGlobal('OffscreenCanvas', undefined);
        }
        if (originalCreateImageBitmap) {
            vi.stubGlobal('createImageBitmap', originalCreateImageBitmap);
        } else {
            vi.stubGlobal('createImageBitmap', undefined);
        }
    });

    const triggerMessage = (data: any, source: any = window.parent) => {
        const event = new MessageEvent('message', { data, source });
        messageHandlers.forEach(h => h(event));
    };

    it('should capture frame without resizing (using original canvas)', async () => {
        triggerMessage({
            type: 'HELIOS_CAPTURE_FRAME',
            frame: 10,
            mode: 'canvas',
            selector: 'canvas'
        });

        // Wait for async operations
        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockHelios.seek).toHaveBeenCalledWith(10);
        // Should use canvas directly
        expect(createImageBitmap).toHaveBeenCalledWith(mockCanvas);
        expect(parentPostMessage).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'HELIOS_FRAME_DATA',
                frame: 10,
                success: true
            }),
            '*',
            expect.any(Array)
        );
    });

    it('should capture frame with resizing (using OffscreenCanvas)', async () => {
        const targetWidth = 1280;
        const targetHeight = 720;

        triggerMessage({
            type: 'HELIOS_CAPTURE_FRAME',
            frame: 10,
            mode: 'canvas',
            selector: 'canvas',
            width: targetWidth,
            height: targetHeight
        });

        // Wait for async operations
        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockHelios.seek).toHaveBeenCalledWith(10);
        expect(OffscreenCanvas).toHaveBeenCalledWith(targetWidth, targetHeight);
        expect(mockOffscreenCanvas.getContext).toHaveBeenCalledWith('2d');
        expect(mockOffscreenCanvas.getContext('2d').drawImage).toHaveBeenCalledWith(mockCanvas, 0, 0, targetWidth, targetHeight);

        // Should use offscreen canvas as source
        expect(createImageBitmap).toHaveBeenCalledWith(mockOffscreenCanvas);

        expect(parentPostMessage).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'HELIOS_FRAME_DATA',
                frame: 10,
                success: true
            }),
            '*',
            expect.any(Array)
        );
    });

    it('should capture frame with resizing (fallback when OffscreenCanvas missing)', async () => {
        // Remove OffscreenCanvas
        vi.stubGlobal('OffscreenCanvas', undefined);

        const targetWidth = 1280;
        const targetHeight = 720;

        // Mock createElement for fallback canvas
        const tempCanvas = document.createElement('canvas');
        const tempContext = { drawImage: vi.fn() };
        vi.spyOn(tempCanvas, 'getContext').mockReturnValue(tempContext as any);
        vi.spyOn(document, 'createElement').mockReturnValue(tempCanvas as any);

        triggerMessage({
            type: 'HELIOS_CAPTURE_FRAME',
            frame: 10,
            mode: 'canvas',
            selector: 'canvas',
            width: targetWidth,
            height: targetHeight
        });

        // Wait for async operations
        await new Promise(resolve => setTimeout(resolve, 10));

        expect(mockHelios.seek).toHaveBeenCalledWith(10);
        expect(document.createElement).toHaveBeenCalledWith('canvas');
        expect(tempCanvas.width).toBe(targetWidth);
        expect(tempCanvas.height).toBe(targetHeight);
        expect(tempContext.drawImage).toHaveBeenCalledWith(mockCanvas, 0, 0, targetWidth, targetHeight);

        // Should use temp canvas as source
        expect(createImageBitmap).toHaveBeenCalledWith(tempCanvas);

        expect(parentPostMessage).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'HELIOS_FRAME_DATA',
                frame: 10,
                success: true
            }),
            '*',
            expect.any(Array)
        );
    });

    it('should handle canvas not found error', async () => {
        vi.spyOn(document, 'querySelector').mockReturnValue(null);

        triggerMessage({
            type: 'HELIOS_CAPTURE_FRAME',
            frame: 10,
            mode: 'canvas',
            selector: 'canvas'
        });

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(parentPostMessage).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'HELIOS_FRAME_DATA',
                frame: 10,
                success: false,
                error: 'Canvas not found'
            }),
            '*'
        );
    });

    it('should handle createImageBitmap error', async () => {
        vi.mocked(createImageBitmap).mockRejectedValue(new Error('Bitmap Error'));

        triggerMessage({
            type: 'HELIOS_CAPTURE_FRAME',
            frame: 10,
            mode: 'canvas'
        });

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(parentPostMessage).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'HELIOS_FRAME_DATA',
                frame: 10,
                success: false,
                error: 'Bitmap Error'
            }),
            '*'
        );
    });
});
