// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { connectToParent } from './bridge';

const mockFaderEnable = vi.fn();
const mockFaderDisable = vi.fn();

// Mock AudioFader
vi.mock('./features/audio-fader', () => ({
    AudioFader: class {
        connect = vi.fn();
        enable = mockFaderEnable;
        disable = mockFaderDisable;
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

// Mock audio-metering
vi.mock('./features/audio-metering', () => {
    return {
        AudioMeter: class {
            connect = vi.fn();
            enable = vi.fn();
            disable = vi.fn();
            getLevels = vi.fn().mockReturnValue([0.5, 0.5]);
            dispose = vi.fn();
        }
    };
});

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
            schema: { type: 'object' }
        };
        (mockHelios.constructor as any) = {
            diagnose: vi.fn().mockResolvedValue({ status: 'ok' })
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

    it('should handle HELIOS_GET_SCHEMA message', () => {
        connectToParent(mockHelios);
        triggerMessage({ type: 'HELIOS_GET_SCHEMA' }, window.parent);

        expect(parentPostMessage).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'HELIOS_SCHEMA', schema: { type: 'object' } }),
            '*'
        );
    });

    it('should handle HELIOS_START_METERING and HELIOS_STOP_METERING messages', () => {
        vi.useFakeTimers();
        connectToParent(mockHelios);

        triggerMessage({ type: 'HELIOS_START_METERING' }, window.parent);
        vi.advanceTimersByTime(16); // allow raf to fire

        // Since AudioMeter is mocked, we verify that postMessage receives HELIOS_AUDIO_LEVELS
        expect(parentPostMessage).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'HELIOS_AUDIO_LEVELS', levels: [0.5, 0.5] }),
            '*'
        );

        triggerMessage({ type: 'HELIOS_STOP_METERING' }, window.parent);
        vi.useRealTimers();
    });

    it('should handle HELIOS_DIAGNOSE message', async () => {
        const { Helios } = await import('@helios-project/core');
        Helios.diagnose = vi.fn().mockResolvedValue({ status: 'ok' });

        connectToParent(mockHelios);
        triggerMessage({ type: 'HELIOS_DIAGNOSE' }, window.parent);

        // Allow async promise to resolve
        await new Promise(r => setTimeout(r, 0));

        expect(parentPostMessage).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'HELIOS_DIAGNOSE_RESULT', report: { status: 'ok' } }),
            '*'
        );
    });

    it('should update AudioFader based on play state from subscribe callback', () => {
        connectToParent(mockHelios);

        // extract the subscribed callback
        const subscribeCallback = mockHelios.subscribe.mock.calls[0][0];

        subscribeCallback({ isPlaying: true });
        expect(mockFaderEnable).toHaveBeenCalled();

        subscribeCallback({ isPlaying: false });
        expect(mockFaderDisable).toHaveBeenCalled();
    });
});
