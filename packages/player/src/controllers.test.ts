import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DirectController, BridgeController } from './controllers';
import { Helios } from '@helios-project/core';
import * as domCapture from './features/dom-capture';

// Mock AudioFader
vi.mock('./features/audio-metering', () => ({
    AudioMeter: class {
        connect = vi.fn();
        enable = vi.fn();
        disable = vi.fn();
        dispose = vi.fn();
        getLevels = vi.fn().mockReturnValue({ left: 0, right: 0 });
    }
}));
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
    const MockHelios = vi.fn();
    (MockHelios as any).diagnose = vi.fn().mockResolvedValue({
        waapi: true,
        webCodecs: true
    });
    return {
        Helios: MockHelios
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
    let iframeListeners: Record<string, EventListener[]> = {};

    beforeEach(() => {
        vi.clearAllMocks();
        iframeListeners = {};

        mockHeliosInstance = {
            play: vi.fn(),
            pause: vi.fn(),
            seek: vi.fn(),
            setAudioVolume: vi.fn(),
            setAudioMuted: vi.fn(),
            setAudioTrackVolume: vi.fn(),
            setAudioTrackMuted: vi.fn(),
            setLoop: vi.fn(),
            setPlaybackRate: vi.fn(),
            setPlaybackRange: vi.fn(),
            clearPlaybackRange: vi.fn(),
            setInputProps: vi.fn(),
            setDuration: vi.fn(),
            setFps: vi.fn(),
            setCaptions: vi.fn(),
            setSize: vi.fn(),
            setMarkers: vi.fn(),
            subscribe: vi.fn((cb) => {
                 return vi.fn();
            }),
            getState: vi.fn().mockReturnValue({ fps: 30, duration: 10, currentFrame: 0 }),
            schema: { someProp: { type: 'string' } },
            constructor: Helios
        };

        (Helios as unknown as any).mockImplementation(function() {
             return mockHeliosInstance;
        });

        const helios = new Helios({} as any);

        // Mock iframe with RAF and EventListeners
        mockIframe = {
            contentWindow: {
                requestAnimationFrame: (cb: Function) => {
                    cb();
                    return 1;
                },
                addEventListener: (event: string, handler: EventListener) => {
                    if (!iframeListeners[event]) iframeListeners[event] = [];
                    iframeListeners[event].push(handler);
                },
                removeEventListener: (event: string, handler: EventListener) => {
                    if (iframeListeners[event]) {
                        iframeListeners[event] = iframeListeners[event].filter(h => h !== handler);
                    }
                }
            },
            contentDocument: {
                body: {},
                querySelector: vi.fn()
            }
        } as unknown as HTMLIFrameElement;

        controller = new DirectController(helios, mockIframe);
    });

    it('should delegate play/pause/seek to instance', async () => {
        controller.play();
        expect(mockHeliosInstance.play).toHaveBeenCalled();

        controller.pause();
        expect(mockHeliosInstance.pause).toHaveBeenCalled();

        const rafSpy = vi.spyOn(mockIframe.contentWindow as any, 'requestAnimationFrame');
        await controller.seek(10);
        expect(mockHeliosInstance.seek).toHaveBeenCalledWith(10);
        expect(rafSpy).toHaveBeenCalledTimes(2);
    });

    it('should set playback rate and input props', () => {
        controller.setPlaybackRate(2);
        expect(mockHeliosInstance.setPlaybackRate).toHaveBeenCalledWith(2);

        controller.setInputProps({ foo: 'bar' });
        expect(mockHeliosInstance.setInputProps).toHaveBeenCalledWith({ foo: 'bar' });
    });


    it('should call setCaptions on instance in DirectController', () => {
        const captions = [{ id: '1', startTime: 0, endTime: 100, text: 'Hi' }];
        controller.setCaptions(captions);
        expect(mockHeliosInstance.setCaptions).toHaveBeenCalledWith(captions);
    });

    it('should subscribe and enable/disable audio fader', () => {
        const cb = vi.fn();
        let internalCb: any;
        mockHeliosInstance.subscribe = vi.fn((callback: any) => {
            internalCb = callback;
            return vi.fn(); // return cleanup
        });

        const cleanup = controller.subscribe(cb);
        expect(mockHeliosInstance.subscribe).toHaveBeenCalled();

        internalCb({ isPlaying: true });
        expect(cb).toHaveBeenCalledWith({ isPlaying: true });

        internalCb({ isPlaying: false });
        expect(cb).toHaveBeenCalledWith({ isPlaying: false });
    });
    it('should set duration, fps, size, and markers', () => {
        controller.setDuration(20);
        expect(mockHeliosInstance.setDuration).toHaveBeenCalledWith(20);

        controller.setFps(60);
        expect(mockHeliosInstance.setFps).toHaveBeenCalledWith(60);

        controller.setSize(1280, 720);
        expect(mockHeliosInstance.setSize).toHaveBeenCalledWith(1280, 720);

        const markers = [{ id: '1', time: 5, label: 'M1' }];
        controller.setMarkers(markers);
        expect(mockHeliosInstance.setMarkers).toHaveBeenCalledWith(markers);
    });

    it('should set audio volume and muted', () => {
        controller.setAudioVolume(0.5);
        expect(mockHeliosInstance.setAudioVolume).toHaveBeenCalledWith(0.5);

        controller.setAudioMuted(true);
        expect(mockHeliosInstance.setAudioMuted).toHaveBeenCalledWith(true);
    });

    it('should set audio track volume and muted', () => {
        controller.setAudioTrackVolume('track-1', 0.8);
        expect(mockHeliosInstance.setAudioTrackVolume).toHaveBeenCalledWith('track-1', 0.8);

        controller.setAudioTrackMuted('track-1', true);
        expect(mockHeliosInstance.setAudioTrackMuted).toHaveBeenCalledWith('track-1', true);
    });

    it('should set loop', () => {
        controller.setLoop(true);
        expect(mockHeliosInstance.setLoop).toHaveBeenCalledWith(true);
    });

    it('should set playback range', () => {
        controller.setPlaybackRange(10, 50);
        expect(mockHeliosInstance.setPlaybackRange).toHaveBeenCalledWith(10, 50);

        controller.clearPlaybackRange();
        expect(mockHeliosInstance.clearPlaybackRange).toHaveBeenCalled();
    });

    it('should return schema', async () => {
        const schema = await controller.getSchema();
        expect(schema).toEqual({ someProp: { type: 'string' } });
    });

    it('should capture DOM frame', async () => {
        const mockBitmap = {} as ImageBitmap;
        vi.mocked(domCapture.captureDomToBitmap).mockResolvedValue(mockBitmap);

        const result = await controller.captureFrame(5, { mode: 'dom' });

        expect(mockHeliosInstance.seek).toHaveBeenCalledWith(5);
        expect(domCapture.captureDomToBitmap).toHaveBeenCalled();
        expect(result).not.toBeNull();
        expect(result!.frame).toBeInstanceOf(VideoFrame);
        expect(result!.captions).toEqual([]);
    });

    it('should capture Canvas frame', async () => {
        const mockCanvas = document.createElement('canvas');
        (mockIframe.contentDocument!.querySelector as any).mockReturnValue(mockCanvas);

        const result = await controller.captureFrame(5, { mode: 'canvas', selector: 'canvas' });

        expect(mockHeliosInstance.seek).toHaveBeenCalledWith(5);
        expect(result).not.toBeNull();
        expect(result!.frame).toBeInstanceOf(VideoFrame);
        // source of VideoFrame should be canvas
        expect((result!.frame as any).source).toBe(mockCanvas);
        expect(result!.captions).toEqual([]);
    });

    it('should capture and resize Canvas frame using OffscreenCanvas', async () => {
        const originalOffscreenCanvas = global.OffscreenCanvas;
        const mockOffscreenCanvas = {
            getContext: vi.fn().mockReturnValue({
                drawImage: vi.fn()
            })
        };
        vi.stubGlobal('OffscreenCanvas', vi.fn(function() {
            return mockOffscreenCanvas;
        }));

        const mockCanvas = document.createElement('canvas');
        mockCanvas.width = 1920;
        mockCanvas.height = 1080;
        (mockIframe.contentDocument!.querySelector as any).mockReturnValue(mockCanvas);

        const result = await controller.captureFrame(5, { mode: 'canvas', width: 1280, height: 720 });

        expect(mockHeliosInstance.seek).toHaveBeenCalledWith(5);
        expect(OffscreenCanvas).toHaveBeenCalledWith(1280, 720);
        expect(mockOffscreenCanvas.getContext).toHaveBeenCalledWith('2d');
        expect(mockOffscreenCanvas.getContext('2d').drawImage).toHaveBeenCalledWith(mockCanvas, 0, 0, 1280, 720);
        expect(result).not.toBeNull();
        expect(result!.frame).toBeInstanceOf(VideoFrame);
        // source of VideoFrame should be the offscreen canvas
        expect((result!.frame as any).source).toBe(mockOffscreenCanvas);

        if (originalOffscreenCanvas) {
            vi.stubGlobal('OffscreenCanvas', originalOffscreenCanvas);
        } else {
            vi.stubGlobal('OffscreenCanvas', undefined);
        }
    });

    it('should capture and resize Canvas frame using fallback when OffscreenCanvas is missing', async () => {
        const originalOffscreenCanvas = global.OffscreenCanvas;
        vi.stubGlobal('OffscreenCanvas', undefined);

        const mockCanvas = document.createElement('canvas');
        mockCanvas.width = 1920;
        mockCanvas.height = 1080;
        (mockIframe.contentDocument!.querySelector as any).mockReturnValue(mockCanvas);

        const tempCanvas = document.createElement('canvas');
        const mockContext = {
            drawImage: vi.fn()
        };
        (tempCanvas as any).getContext = vi.fn().mockReturnValue(mockContext);

        // Mock createElement
        mockIframe.contentDocument!.createElement = vi.fn().mockReturnValue(tempCanvas) as any;

        const result = await controller.captureFrame(5, { mode: 'canvas', width: 1280, height: 720 });

        expect(mockHeliosInstance.seek).toHaveBeenCalledWith(5);
        expect(mockIframe.contentDocument!.createElement).toHaveBeenCalledWith('canvas');
        expect(tempCanvas.width).toBe(1280);
        expect(tempCanvas.height).toBe(720);
        expect(mockContext.drawImage).toHaveBeenCalledWith(mockCanvas, 0, 0, 1280, 720);
        expect(result).not.toBeNull();
        expect(result!.frame).toBeInstanceOf(VideoFrame);
        expect((result!.frame as any).source).toBe(tempCanvas);

        if (originalOffscreenCanvas) {
            vi.stubGlobal('OffscreenCanvas', originalOffscreenCanvas);
        }
    });


    it('should handle iframe frame request when options.mode is not dom and not canvas element', async () => {
        const mockDiv = document.createElement('div');
        (mockIframe.contentDocument!.querySelector as any).mockReturnValue(mockDiv);

        const result = await controller.captureFrame(5); // no options mode
        expect(result).toBeNull();
    });

    it('should handle OffscreenCanvas fallback when getContext returns null', async () => {
        const originalOffscreenCanvas = global.OffscreenCanvas;
        const mockOffscreenCanvas = {
            getContext: vi.fn().mockReturnValue(null) // return null for ctx
        };
        vi.stubGlobal('OffscreenCanvas', vi.fn(function() {
            return mockOffscreenCanvas;
        }));

        const mockCanvas = document.createElement('canvas');
        mockCanvas.width = 1920;
        mockCanvas.height = 1080;
        (mockIframe.contentDocument!.querySelector as any).mockReturnValue(mockCanvas);

        const result = await controller.captureFrame(5, { mode: 'canvas', width: 1280, height: 720 });
        expect((result!.frame as any).source).toBe(mockCanvas);

        if (originalOffscreenCanvas) {
            vi.stubGlobal('OffscreenCanvas', originalOffscreenCanvas);
        } else {
            vi.stubGlobal('OffscreenCanvas', undefined);
        }
    });

    it('should handle tempCanvas fallback when getContext returns null', async () => {
        const originalOffscreenCanvas = global.OffscreenCanvas;
        vi.stubGlobal('OffscreenCanvas', undefined);

        const mockCanvas = document.createElement('canvas');
        mockCanvas.width = 1920;
        mockCanvas.height = 1080;
        (mockIframe.contentDocument!.querySelector as any).mockReturnValue(mockCanvas);

        const tempCanvas = document.createElement('canvas');
        (tempCanvas as any).getContext = vi.fn().mockReturnValue(null); // return null

        mockIframe.contentDocument!.createElement = vi.fn().mockReturnValue(tempCanvas) as any;

        const result = await controller.captureFrame(5, { mode: 'canvas', width: 1280, height: 720 });
        expect((result!.frame as any).source).toBe(mockCanvas);

        if (originalOffscreenCanvas) {
            vi.stubGlobal('OffscreenCanvas', originalOffscreenCanvas);
        }
    });
    it('should return null if DOM capture fails in dom mode', async () => {
        vi.mocked(domCapture.captureDomToBitmap).mockRejectedValue(new Error('DOM capture error'));

        const result = await controller.captureFrame(5, { mode: 'dom' });

        expect(mockHeliosInstance.seek).toHaveBeenCalledWith(5);
        expect(domCapture.captureDomToBitmap).toHaveBeenCalled();
        expect(result).toBeNull();
    });


    it('should return null if canvas element is not a CANVAS in canvas mode', async () => {
        const mockDiv = document.createElement('div');
        (mockIframe.contentDocument!.querySelector as any).mockReturnValue(mockDiv);

        const result = await controller.captureFrame(5, { mode: 'canvas', selector: 'canvas' });

        expect(mockHeliosInstance.seek).toHaveBeenCalledWith(5);
        expect(result).toBeNull();
    });

    it('should return null if canvas not found', async () => {
        (mockIframe.contentDocument!.querySelector as any).mockReturnValue(null);

        const result = await controller.captureFrame(5, { mode: 'canvas' });
        expect(result).toBeNull();
    });


    it('should handle unhandledrejection from iframe errors', () => {
        const onError = vi.fn();
        const cleanup2 = controller.onError(onError);
        const rejectionEvent = {
            reason: {
                message: 'Unhandled Promise Error',
                stack: 'Promise Stack trace'
            }
        };
        iframeListeners['unhandledrejection'][0](rejectionEvent as any);

        expect(onError).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Unhandled Promise Error',
            stack: 'Promise Stack trace'
        }));

        const rejectionEvent2 = {
            reason: 'Just a string error'
        };
        iframeListeners['unhandledrejection'][0](rejectionEvent2 as any);

        expect(onError).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Just a string error'
        }));

        cleanup2();
    });
    it('should handle iframe errors', () => {
        const onError = vi.fn();
        const cleanup = controller.onError(onError);

        expect(iframeListeners['error']).toHaveLength(1);
        expect(iframeListeners['unhandledrejection']).toHaveLength(1);

        // Simulate error
        const errorEvent = {
            message: 'Test Error',
            filename: 'test.js',
            lineno: 10,
            colno: 5,
            error: { stack: 'Stack trace' }
        };
        iframeListeners['error'][0](errorEvent as any);

        expect(onError).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Test Error',
            filename: 'test.js'
        }));

        cleanup();
        expect(iframeListeners['error']).toHaveLength(0);
    });


    it('should resolve getAudioTracks with getAudioAssets result for DirectController', async () => {
         const mockAssets = [{ id: '1', name: 'audio1', src: 'blob' }];
         const audioUtils = await import('./features/audio-utils');
         vi.spyOn(audioUtils, 'getAudioAssets').mockResolvedValue(mockAssets as any);

         const assets = await controller.getAudioTracks();
         expect(assets).toEqual(mockAssets);
    });

    it('should return getState from instance in DirectController', () => {
         const state = controller.getState();
         expect(state).toEqual({ fps: 30, duration: 10, currentFrame: 0 });
    });

    it('should stop audio metering when disposed in DirectController', () => {
         controller.startAudioMetering();
         const stopSpy = vi.spyOn(controller, 'stopAudioMetering');
         controller.dispose();
         expect(stopSpy).toHaveBeenCalled();
    });

    it('should handle startAudioMetering raf loop', () => {
         vi.useFakeTimers();
         const cb = vi.fn();
         controller.onAudioMetering(cb);

         const cancelAnimationFrameSpy = vi.spyOn(window, 'cancelAnimationFrame');

         controller.startAudioMetering();

         vi.advanceTimersByTime(16); // wait for 1 frame

         expect(cb).toHaveBeenCalled();

         controller.stopAudioMetering();
         expect(cancelAnimationFrameSpy).toHaveBeenCalled();

         cancelAnimationFrameSpy.mockRestore();

         vi.useRealTimers();
    });
    it('should return diagnostic report', async () => {
        const report = await controller.diagnose();
        expect((Helios as any).diagnose).toHaveBeenCalled();
        expect(report).toEqual({ waapi: true, webCodecs: true });
    });

    it('should handle audio metering callbacks', () => {
        const onMetering = vi.fn();
        const cleanup = controller.onAudioMetering(onMetering);

        expect((controller as any).audioMeteringCallback).toBe(onMetering);

        cleanup();
        expect((controller as any).audioMeteringCallback).toBeNull();
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

    const triggerMessage = (data: any, source: Window = mockWindow) => {
        const event = new MessageEvent('message', { data, source });
        messageHandlers.forEach(h => h(event));
    };

    it('should post messages for controls', () => {
        controller.play();
        expect(mockWindow.postMessage).toHaveBeenCalledWith({ type: 'HELIOS_PLAY' }, '*');

        controller.pause();
        expect(mockWindow.postMessage).toHaveBeenCalledWith({ type: 'HELIOS_PAUSE' }, '*');
    });

    it('should post seek message and wait for confirmation', async () => {
        const promise = controller.seek(10);
        expect(mockWindow.postMessage).toHaveBeenCalledWith({ type: 'HELIOS_SEEK', frame: 10 }, '*');

        triggerMessage({ type: 'HELIOS_SEEK_DONE', frame: 10 });
        await promise;
    });


    it('should call setCaptions via bridge', () => {
        const captions = [{ id: '1', startTime: 0, endTime: 100, text: 'Hi' }];
        controller.setCaptions(captions);
        expect(mockWindow.postMessage).toHaveBeenCalledWith({ type: 'HELIOS_SET_CAPTIONS', captions }, '*');
    });

    it('should call setInputProps via bridge', () => {
        const props = { color: 'red' };
        controller.setInputProps(props);
        expect(mockWindow.postMessage).toHaveBeenCalledWith({ type: 'HELIOS_SET_PROPS', props }, '*');
    });

    it('should call startAudioMetering and stopAudioMetering via bridge', () => {
        controller.startAudioMetering();
        expect(mockWindow.postMessage).toHaveBeenCalledWith({ type: 'HELIOS_START_METERING' }, '*');
        controller.stopAudioMetering();
        expect(mockWindow.postMessage).toHaveBeenCalledWith({ type: 'HELIOS_STOP_METERING' }, '*');
    });

    it('should ignore message from other source for seek', async () => {
        vi.useFakeTimers();
        const promise = controller.seek(10);
        triggerMessage({ type: 'HELIOS_SEEK_DONE', frame: 10 }, {} as Window);
        vi.advanceTimersByTime(5000);
        await promise;
        vi.useRealTimers();
    });

    it('should handle HELIOS_AUDIO_LEVELS message', () => {
        const spy = vi.fn();
        controller.onAudioMetering(spy);

        triggerMessage({ type: 'HELIOS_AUDIO_LEVELS', levels: { left: 0.5, right: 0.5 } });

        expect(spy).toHaveBeenCalledWith({ left: 0.5, right: 0.5 });
    });

    it('should post messages for setPlaybackRate', () => {
        controller.setPlaybackRate(1.5);
        expect(mockWindow.postMessage).toHaveBeenCalledWith({ type: 'HELIOS_SET_PLAYBACK_RATE', rate: 1.5 }, '*');
    });

    it('should post messages for audio controls', () => {
        controller.setAudioVolume(0.5);
        expect(mockWindow.postMessage).toHaveBeenCalledWith({ type: 'HELIOS_SET_VOLUME', volume: 0.5 }, '*');

        controller.setAudioMuted(true);
        expect(mockWindow.postMessage).toHaveBeenCalledWith({ type: 'HELIOS_SET_MUTED', muted: true }, '*');
    });

    it('should post messages for audio track controls', () => {
        controller.setAudioTrackVolume('track-1', 0.8);
        expect(mockWindow.postMessage).toHaveBeenCalledWith({ type: 'HELIOS_SET_AUDIO_TRACK_VOLUME', trackId: 'track-1', volume: 0.8 }, '*');

        controller.setAudioTrackMuted('track-1', true);
        expect(mockWindow.postMessage).toHaveBeenCalledWith({ type: 'HELIOS_SET_AUDIO_TRACK_MUTED', trackId: 'track-1', muted: true }, '*');
    });

    it('should post messages for loop', () => {
        controller.setLoop(true);
        expect(mockWindow.postMessage).toHaveBeenCalledWith({ type: 'HELIOS_SET_LOOP', loop: true }, '*');
    });

    it('should post messages for playback range', () => {
        controller.setPlaybackRange(10, 50);
        expect(mockWindow.postMessage).toHaveBeenCalledWith({ type: 'HELIOS_SET_PLAYBACK_RANGE', start: 10, end: 50 }, '*');

        controller.clearPlaybackRange();
        expect(mockWindow.postMessage).toHaveBeenCalledWith({ type: 'HELIOS_CLEAR_PLAYBACK_RANGE' }, '*');
    });

    it('should post messages for composition settings', () => {
        controller.setDuration(20);
        expect(mockWindow.postMessage).toHaveBeenCalledWith({ type: 'HELIOS_SET_DURATION', duration: 20 }, '*');

        controller.setFps(60);
        expect(mockWindow.postMessage).toHaveBeenCalledWith({ type: 'HELIOS_SET_FPS', fps: 60 }, '*');

        controller.setSize(1280, 720);
        expect(mockWindow.postMessage).toHaveBeenCalledWith({ type: 'HELIOS_SET_SIZE', width: 1280, height: 720 }, '*');

        const markers = [{ id: '1', time: 5, label: 'M1' }];
        controller.setMarkers(markers);
        expect(mockWindow.postMessage).toHaveBeenCalledWith({ type: 'HELIOS_SET_MARKERS', markers }, '*');
    });

    it('should update state on HELIOS_STATE message', () => {
        const newState = { isPlaying: true, currentFrame: 50 };
        triggerMessage({ type: 'HELIOS_STATE', state: newState });

        expect(controller.getState()).toEqual(newState);
    });

    it('should ignore messages from other sources', () => {
        const newState = { isPlaying: true, currentFrame: 999 };
        const otherWindow = { postMessage: vi.fn() } as unknown as Window;

        triggerMessage({ type: 'HELIOS_STATE', state: newState }, otherWindow);

        // State should remain unchanged (default from constructor is frame 0)
        expect(controller.getState().currentFrame).toBe(0);
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


    it('should ignore message from other source for getSchema', async () => {
        vi.useFakeTimers();
        const promise = controller.getSchema();
        triggerMessage({ type: 'HELIOS_SCHEMA', schema: { foo: 'bar' } }, {} as Window);
        vi.advanceTimersByTime(5000);
        const result = await promise;
        expect(result).toBeUndefined();
        vi.useRealTimers();
    });

    it('should resolve undefined if getSchema receives non-HELIOS_SCHEMA message', async () => {
        vi.useFakeTimers();
        const promise = controller.getSchema();
        triggerMessage({ type: 'HELIOS_OTHER_MESSAGE', schema: { foo: 'bar' } }, mockWindow);
        vi.advanceTimersByTime(5000);
        const result = await promise;
        expect(result).toBeUndefined();
        vi.useRealTimers();
    });
    it('should get schema via bridge', async () => {
        const promise = controller.getSchema();

        expect(mockWindow.postMessage).toHaveBeenCalledWith({ type: 'HELIOS_GET_SCHEMA' }, '*');

        triggerMessage({ type: 'HELIOS_SCHEMA', schema: { foo: 'bar' } });

        const result = await promise;
        expect(result).toEqual({ foo: 'bar' });
    });

    it('should timeout getSchema via bridge', async () => {
        vi.useFakeTimers();
        const promise = controller.getSchema();

        expect(mockWindow.postMessage).toHaveBeenCalledWith({ type: 'HELIOS_GET_SCHEMA' }, '*');

        vi.advanceTimersByTime(5000);

        const result = await promise;
        expect(result).toBeUndefined();
        vi.useRealTimers();
    });


    it('should unsubscribe properly', () => {
        const spy1 = vi.fn();
        const spy2 = vi.fn();
        const unsubscribe1 = controller.subscribe(spy1);
        const unsubscribe2 = controller.subscribe(spy2);
        unsubscribe1();
        triggerMessage({ type: 'HELIOS_STATE', state: { currentFrame: 10 } });
        expect(spy1).toHaveBeenCalledTimes(1);
        expect(spy2).toHaveBeenCalledTimes(2);
        unsubscribe2();
    });
    it('should notify error subscribers on HELIOS_ERROR', () => {
        const spy = vi.fn();
        const cleanup = controller.onError(spy);

        const errorData = { message: 'Bridge Error' };
        triggerMessage({ type: 'HELIOS_ERROR', error: errorData });

        expect(spy).toHaveBeenCalledWith(errorData);

        cleanup();

        triggerMessage({ type: 'HELIOS_ERROR', error: { message: 'Ignored' } });
        expect(spy).toHaveBeenCalledTimes(1);
    });


    it('should ignore message from other source for captureFrame', async () => {
        vi.useFakeTimers();
        const promise = controller.captureFrame(10);
        triggerMessage({ type: 'HELIOS_FRAME_DATA', frame: 10, success: true }, {} as Window);
        vi.advanceTimersByTime(5000);
        const result = await promise;
        expect(result).toBeNull();
        vi.useRealTimers();
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
        const mockCaptions = [{ id: '1', startTime: 0, endTime: 100, text: 'Hi' }];
        triggerMessage({
            type: 'HELIOS_FRAME_DATA',
            frame: 10,
            success: true,
            bitmap: mockBitmap,
            captions: mockCaptions
        });

        const result = await promise;
        expect(result).not.toBeNull();
        expect(result!.frame).toBeInstanceOf(VideoFrame);
        expect((result!.frame as any).source).toBe(mockBitmap);
        expect(result!.captions).toEqual(mockCaptions);
    });

    it('should handle bridge capture failure', async () => {
         const promise = controller.captureFrame(10);

         triggerMessage({
             type: 'HELIOS_FRAME_DATA',
             frame: 10,
             success: false,
             error: "Boom"
         });

         const result = await promise;
         expect(result).toBeNull();
    });


    it('should ignore message from other source for diagnose', async () => {
        vi.useFakeTimers();
        const promise = controller.diagnose();
        triggerMessage({ type: 'HELIOS_DIAGNOSE_RESULT', report: {} }, {} as Window);
        vi.advanceTimersByTime(5000);
        await expect(promise).rejects.toThrow('Timeout waiting for diagnostics');
        vi.useRealTimers();
    });
    it('should get diagnostics via bridge', async () => {
        const promise = controller.diagnose();

        expect(mockWindow.postMessage).toHaveBeenCalledWith({ type: 'HELIOS_DIAGNOSE' }, '*');

        const mockReport = { waapi: true, webCodecs: true };
        triggerMessage({ type: 'HELIOS_DIAGNOSE_RESULT', report: mockReport });

        const result = await promise;
        expect(result).toEqual(mockReport);
    });

    it('should timeout get diagnostics via bridge', async () => {
        vi.useFakeTimers();
        const promise = controller.diagnose();

        expect(mockWindow.postMessage).toHaveBeenCalledWith({ type: 'HELIOS_DIAGNOSE' }, '*');

        vi.advanceTimersByTime(5000);

        await expect(promise).rejects.toThrow('Timeout waiting for diagnostics');
        vi.useRealTimers();
    });

    it('should timeout captureFrame via bridge', async () => {
        vi.useFakeTimers();
        const promise = controller.captureFrame(10);

        expect(mockWindow.postMessage).toHaveBeenCalledWith({
            type: 'HELIOS_CAPTURE_FRAME',
            frame: 10,
            mode: undefined,
            selector: undefined,
            width: undefined,
            height: undefined
        }, '*');

        vi.advanceTimersByTime(5000);

        const result = await promise;
        expect(result).toBeNull();
        vi.useRealTimers();
    });


    it('should ignore message from other source for getAudioTracks', async () => {
        vi.useFakeTimers();
        const promise = controller.getAudioTracks();
        triggerMessage({ type: 'HELIOS_AUDIO_DATA', assets: [] }, {} as Window);
        vi.advanceTimersByTime(5000);
        const result = await promise;
        expect(result).toEqual([]);
        vi.useRealTimers();
    });

    it('should resolve empty array if getAudioTracks receives non-HELIOS_AUDIO_DATA message', async () => {
        vi.useFakeTimers();
        const promise = controller.getAudioTracks();
        triggerMessage({ type: 'HELIOS_OTHER_MESSAGE', assets: [] }, mockWindow);
        vi.advanceTimersByTime(5000);
        const result = await promise;
        expect(result).toEqual([]);
        vi.useRealTimers();
    });

    it('should resolve empty array if getAudioTracks receives HELIOS_AUDIO_DATA message with undefined assets', async () => {
        const promise = controller.getAudioTracks();
        triggerMessage({ type: 'HELIOS_AUDIO_DATA' }, mockWindow);
        const result = await promise;
        expect(result).toEqual([]);
    });
    it('should timeout getAudioTracks via bridge', async () => {
        vi.useFakeTimers();
        const promise = controller.getAudioTracks();

        expect(mockWindow.postMessage).toHaveBeenCalledWith({ type: 'HELIOS_GET_AUDIO_TRACKS' }, '*');

        vi.advanceTimersByTime(5000);

        const result = await promise;
        expect(result).toEqual([]);
        vi.useRealTimers();
    });

    it('should handle audio metering callbacks', () => {
        const onMetering = vi.fn();
        const cleanup = controller.onAudioMetering(onMetering);

        expect((controller as any).audioMeteringListeners).toHaveLength(1);

        cleanup();
        expect((controller as any).audioMeteringListeners).toHaveLength(0);
    });
});
