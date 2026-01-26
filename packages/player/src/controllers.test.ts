import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DirectController, BridgeController } from './controllers';
import { Helios } from '@helios-project/core';
import * as domCapture from './features/dom-capture';

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

// Mock VideoFrame if not in environment
if (typeof VideoFrame === 'undefined') {
    vi.stubGlobal('VideoFrame', class MockVideoFrame {
        constructor(public source: any, public init: any) {
             (this as any).displayWidth = 1920;
             (this as any).displayHeight = 1080;
        }
        close() {}
    });
}

describe('DirectController', () => {
    let mockHeliosInstance: any;
    let controller: DirectController;
    let mockIframe: HTMLIFrameElement;

    beforeEach(() => {
        vi.clearAllMocks();

        mockHeliosInstance = {
            play: vi.fn(),
            pause: vi.fn(),
            seek: vi.fn(),
            setAudioVolume: vi.fn(),
            setAudioMuted: vi.fn(),
            setPlaybackRate: vi.fn(),
            setInputProps: vi.fn(),
            subscribe: vi.fn((cb) => {
                 return vi.fn();
            }),
            getState: vi.fn().mockReturnValue({ fps: 30, duration: 10, currentFrame: 0 }),
        };

        (Helios as unknown as any).mockImplementation(function() {
             return mockHeliosInstance;
        });

        const helios = new Helios({} as any);

        // Mock iframe with RAF
        mockIframe = {
            contentWindow: {
                requestAnimationFrame: (cb: Function) => {
                    cb();
                    return 1;
                }
            },
            contentDocument: {
                body: {},
                querySelector: vi.fn()
            }
        } as unknown as HTMLIFrameElement;

        controller = new DirectController(helios, mockIframe);
    });

    it('should delegate play/pause/seek to instance', () => {
        controller.play();
        expect(mockHeliosInstance.play).toHaveBeenCalled();

        controller.pause();
        expect(mockHeliosInstance.pause).toHaveBeenCalled();

        controller.seek(10);
        expect(mockHeliosInstance.seek).toHaveBeenCalledWith(10);
    });

    it('should set playback rate and input props', () => {
        controller.setPlaybackRate(2);
        expect(mockHeliosInstance.setPlaybackRate).toHaveBeenCalledWith(2);

        controller.setInputProps({ foo: 'bar' });
        expect(mockHeliosInstance.setInputProps).toHaveBeenCalledWith({ foo: 'bar' });
    });

    it('should set audio volume and muted', () => {
        controller.setAudioVolume(0.5);
        expect(mockHeliosInstance.setAudioVolume).toHaveBeenCalledWith(0.5);

        controller.setAudioMuted(true);
        expect(mockHeliosInstance.setAudioMuted).toHaveBeenCalledWith(true);
    });

    it('should capture DOM frame', async () => {
        const mockBitmap = {} as ImageBitmap;
        vi.mocked(domCapture.captureDomToBitmap).mockResolvedValue(mockBitmap);

        const frame = await controller.captureFrame(5, { mode: 'dom' });

        expect(mockHeliosInstance.seek).toHaveBeenCalledWith(5);
        expect(domCapture.captureDomToBitmap).toHaveBeenCalled();
        expect(frame).toBeInstanceOf(VideoFrame);
    });

    it('should capture Canvas frame', async () => {
        const mockCanvas = document.createElement('canvas');
        (mockIframe.contentDocument!.querySelector as any).mockReturnValue(mockCanvas);

        const frame = await controller.captureFrame(5, { mode: 'canvas', selector: 'canvas' });

        expect(mockHeliosInstance.seek).toHaveBeenCalledWith(5);
        expect(frame).toBeInstanceOf(VideoFrame);
        // source of VideoFrame should be canvas
        expect((frame as any).source).toBe(mockCanvas);
    });

    it('should return null if canvas not found', async () => {
        (mockIframe.contentDocument!.querySelector as any).mockReturnValue(null);

        const frame = await controller.captureFrame(5, { mode: 'canvas' });
        expect(frame).toBeNull();
    });
});

describe('BridgeController', () => {
    let mockWindow: Window;
    let controller: BridgeController;
    let messageHandlers: ((ev: MessageEvent) => void)[] = [];

    beforeEach(() => {
        messageHandlers = [];
        mockWindow = {
            postMessage: vi.fn(),
        } as unknown as Window;

        vi.spyOn(window, 'addEventListener').mockImplementation((event, handler) => {
            if (event === 'message') {
                messageHandlers.push(handler as any);
            }
        });

        vi.spyOn(window, 'removeEventListener').mockImplementation((event, handler) => {
             if (event === 'message') {
                 messageHandlers = messageHandlers.filter(h => h !== handler);
             }
        });

        controller = new BridgeController(mockWindow);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        controller.dispose();
    });

    const triggerMessage = (data: any) => {
        const event = new MessageEvent('message', { data });
        messageHandlers.forEach(h => h(event));
    };

    it('should post messages for controls', () => {
        controller.play();
        expect(mockWindow.postMessage).toHaveBeenCalledWith({ type: 'HELIOS_PLAY' }, '*');

        controller.pause();
        expect(mockWindow.postMessage).toHaveBeenCalledWith({ type: 'HELIOS_PAUSE' }, '*');

        controller.seek(10);
        expect(mockWindow.postMessage).toHaveBeenCalledWith({ type: 'HELIOS_SEEK', frame: 10 }, '*');
    });

    it('should post messages for audio controls', () => {
        controller.setAudioVolume(0.5);
        expect(mockWindow.postMessage).toHaveBeenCalledWith({ type: 'HELIOS_SET_VOLUME', volume: 0.5 }, '*');

        controller.setAudioMuted(true);
        expect(mockWindow.postMessage).toHaveBeenCalledWith({ type: 'HELIOS_SET_MUTED', muted: true }, '*');
    });

    it('should update state on HELIOS_STATE message', () => {
        const newState = { isPlaying: true, currentFrame: 50 };
        triggerMessage({ type: 'HELIOS_STATE', state: newState });

        expect(controller.getState()).toEqual(newState);
    });

    it('should notify subscribers', () => {
        const spy = vi.fn();
        controller.subscribe(spy);

        // Initial call
        expect(spy).toHaveBeenCalled();

        const newState = { isPlaying: true, currentFrame: 50 };
        triggerMessage({ type: 'HELIOS_STATE', state: newState });

        expect(spy).toHaveBeenCalledWith(newState);
    });

    it('should capture frame via bridge', async () => {
        const promise = controller.captureFrame(10, { mode: 'dom' });

        expect(mockWindow.postMessage).toHaveBeenCalledWith({
            type: 'HELIOS_CAPTURE_FRAME',
            frame: 10,
            mode: 'dom',
            selector: undefined
        }, '*');

        const mockBitmap = {} as ImageBitmap;
        triggerMessage({
            type: 'HELIOS_FRAME_DATA',
            frame: 10,
            success: true,
            bitmap: mockBitmap
        });

        const frame = await promise;
        expect(frame).toBeInstanceOf(VideoFrame);
        expect((frame as any).source).toBe(mockBitmap);
    });

    it('should handle bridge capture failure', async () => {
         const promise = controller.captureFrame(10);

         triggerMessage({
             type: 'HELIOS_FRAME_DATA',
             frame: 10,
             success: false,
             error: "Boom"
         });

         const frame = await promise;
         expect(frame).toBeNull();
    });
});
