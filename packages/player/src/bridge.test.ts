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

    it('should IGNORE messages from nested iframes', () => {
        connectToParent(mockHelios);

        // Send message from an untrusted source (e.g. nested iframe)
        const nestedIframe = {};
        triggerMessage({ type: 'HELIOS_PLAY' }, nestedIframe);

        expect(mockHelios.play).not.toHaveBeenCalled();
    });

    it('should handle deferred message processing and property updates during initialization safely', async () => {
        // Test that sending messages rapidly before and during connect doesn't cause errors
        connectToParent(mockHelios);

        // Simulate properties sent right as it connects
        triggerMessage({ type: 'HELIOS_SET_SIZE', width: 1920, height: 1080 }, window.parent);
        triggerMessage({ type: 'HELIOS_SET_FPS', fps: 60 }, window.parent);

        // The bridge itself dispatches immediately to Helios methods
        expect(mockHelios.setSize).toHaveBeenCalledWith(1920, 1080);
        expect(mockHelios.setFps).toHaveBeenCalledWith(60);

        // And simulate connection completion
        triggerMessage({ type: 'HELIOS_CONNECT' }, window.parent);

        expect(parentPostMessage).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'HELIOS_READY' }),
            '*'
        );
    });

    it('should strictly verify event source against malicious or deeply nested frames', () => {
        connectToParent(mockHelios);

        const maliciousSource = {
            parent: window.parent,
            top: window.parent
        };

        triggerMessage({ type: 'HELIOS_PLAY' }, maliciousSource);
        expect(mockHelios.play).not.toHaveBeenCalled();

        triggerMessage({ type: 'HELIOS_SET_DURATION', duration: 10 }, maliciousSource);
        expect(mockHelios.setDuration).not.toHaveBeenCalled();
    });
});
