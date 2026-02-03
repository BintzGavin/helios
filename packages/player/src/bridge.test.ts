// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { connectToParent } from './bridge';

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

describe('connectToParent', () => {
    let mockHelios: any;
    let messageHandlers: ((ev: MessageEvent) => void)[] = [];
    let parentPostMessage: any;

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
            getState: vi.fn().mockReturnValue({}),
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
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    const triggerMessage = (data: any, source: any) => {
        const event = new MessageEvent('message', { data, source });
        messageHandlers.forEach(h => h(event));
    };

    it('should process messages from window.parent', () => {
        connectToParent(mockHelios);

        triggerMessage({ type: 'HELIOS_PLAY' }, window.parent);

        expect(mockHelios.play).toHaveBeenCalled();
    });

    it('should process composition setting messages', () => {
        connectToParent(mockHelios);

        triggerMessage({ type: 'HELIOS_SET_DURATION', duration: 30 }, window.parent);
        expect(mockHelios.setDuration).toHaveBeenCalledWith(30);

        triggerMessage({ type: 'HELIOS_SET_FPS', fps: 24 }, window.parent);
        expect(mockHelios.setFps).toHaveBeenCalledWith(24);

        triggerMessage({ type: 'HELIOS_SET_SIZE', width: 800, height: 600 }, window.parent);
        expect(mockHelios.setSize).toHaveBeenCalledWith(800, 600);

        const markers = [{ id: '1', time: 5, label: 'Test' }];
        triggerMessage({ type: 'HELIOS_SET_MARKERS', markers }, window.parent);
        expect(mockHelios.setMarkers).toHaveBeenCalledWith(markers);
    });

    it('should IGNORE messages from other sources', () => {
        connectToParent(mockHelios);

        // Send message from 'window' (self), NOT window.parent
        triggerMessage({ type: 'HELIOS_PLAY' }, window);

        expect(mockHelios.play).not.toHaveBeenCalled();
    });
});
