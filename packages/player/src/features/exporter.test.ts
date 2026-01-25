import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClientSideExporter } from './exporter';
import { HeliosController } from '../controllers';

// Mock mp4-muxer
const addAudioChunkSpy = vi.fn();
vi.mock('mp4-muxer', () => {
    return {
        Muxer: class {
            addVideoChunk = vi.fn();
            addAudioChunk = addAudioChunkSpy;
            finalize = vi.fn();
        },
        ArrayBufferTarget: class {
            buffer = new ArrayBuffer(0);
        }
    };
});

// Spies for VideoEncoder
const configureSpy = vi.fn();
const encodeSpy = vi.fn();
const flushSpy = vi.fn().mockResolvedValue(undefined);
const closeSpy = vi.fn();

// Mock VideoEncoder
class MockVideoEncoder {
    static isConfigSupported = vi.fn().mockResolvedValue(true);
    configure = configureSpy;
    encode = encodeSpy;
    flush = flushSpy;
    close = closeSpy;
}
vi.stubGlobal('VideoEncoder', MockVideoEncoder);

// Mock AudioEncoder
const audioConfigureSpy = vi.fn();
const audioEncodeSpy = vi.fn();
const audioFlushSpy = vi.fn().mockResolvedValue(undefined);
const audioCloseSpy = vi.fn();

class MockAudioEncoder {
    static isConfigSupported = vi.fn().mockResolvedValue(true);
    configure = audioConfigureSpy;
    encode = audioEncodeSpy;
    flush = audioFlushSpy;
    close = audioCloseSpy;
}
vi.stubGlobal('AudioEncoder', MockAudioEncoder);

// Mock AudioData
class MockAudioData {
    constructor(public init: any) {}
    close = vi.fn();
}
vi.stubGlobal('AudioData', MockAudioData);

// Mock OfflineAudioContext
class MockOfflineAudioContext {
    createBufferSource = vi.fn().mockReturnValue({
        buffer: null,
        connect: vi.fn(),
        start: vi.fn()
    });
    destination = {};
    decodeAudioData = vi.fn().mockResolvedValue({
        length: 100,
        getChannelData: vi.fn().mockReturnValue(new Float32Array(100))
    });
    startRendering = vi.fn().mockResolvedValue({
        length: 100,
        getChannelData: vi.fn().mockReturnValue(new Float32Array(100))
    });
}
vi.stubGlobal('OfflineAudioContext', MockOfflineAudioContext);


// Mock VideoFrame if not present
if (typeof VideoFrame === 'undefined') {
    vi.stubGlobal('VideoFrame', class MockVideoFrame {
        constructor(public source: any, public init: any) {
             (this as any).displayWidth = 1920;
             (this as any).displayHeight = 1080;
        }
        close = vi.fn();
    });
}

// Mock URL
if (typeof URL.createObjectURL === 'undefined') {
    URL.createObjectURL = vi.fn();
    URL.revokeObjectURL = vi.fn();
} else {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    vi.spyOn(URL, 'revokeObjectURL');
}

describe('ClientSideExporter', () => {
    let mockController: HeliosController;
    let exporter: ClientSideExporter;
    let mockIframe: HTMLIFrameElement;

    beforeEach(() => {
        vi.clearAllMocks();

        mockController = {
            play: vi.fn(),
            pause: vi.fn(),
            seek: vi.fn(),
            setPlaybackRate: vi.fn(),
            setInputProps: vi.fn(),
            subscribe: vi.fn(),
            getState: vi.fn().mockReturnValue({ duration: 1, fps: 10 }), // 10 frames total
            dispose: vi.fn(),
            captureFrame: vi.fn().mockResolvedValue(new VideoFrame({} as any, {})),
            getAudioTracks: vi.fn().mockResolvedValue([])
        } as unknown as HeliosController;

        mockIframe = {} as HTMLIFrameElement;

        exporter = new ClientSideExporter(mockController, mockIframe);

        // Mock document.createElement('a')
        const mockAnchor = {
            click: vi.fn(),
            href: '',
            download: ''
        };
        vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
    });

    it('should run export process successfully', async () => {
        const onProgress = vi.fn();
        const signal = new AbortController().signal;

        await exporter.export({ onProgress, signal, mode: 'canvas' });

        expect(mockController.pause).toHaveBeenCalled();

        // Setup frame 0
        expect(mockController.captureFrame).toHaveBeenCalledWith(0, expect.anything());

        // Frames 1..9
        for (let i = 1; i < 10; i++) {
            expect(mockController.captureFrame).toHaveBeenCalledWith(i, expect.anything());
        }

        // Encoder usage
        expect(configureSpy).toHaveBeenCalled();
        expect(encodeSpy).toHaveBeenCalledTimes(10); // 0..9
        expect(flushSpy).toHaveBeenCalled();

        // Audio shouldn't run if no tracks
        expect(audioEncodeSpy).not.toHaveBeenCalled();

        // Download
        expect(URL.createObjectURL).toHaveBeenCalled();
        expect(document.createElement).toHaveBeenCalledWith('a');
    });

    it('should handle abort signal', async () => {
        const controller = new AbortController();
        const onProgress = vi.fn();

        // Abort after start
        mockController.captureFrame = vi.fn().mockImplementation(async () => {
            controller.abort();
            return new VideoFrame({} as any, {});
        });

        // The export loop checks signal.aborted at start of loop
        // It runs frame 0 setup. Then loop i=1.

        await exporter.export({ onProgress, signal: controller.signal, mode: 'canvas' });

        // Should have stopped early
        expect(flushSpy).not.toHaveBeenCalled();
    });

    it('should fallback to DOM if canvas not found in auto mode', async () => {
        // First capture (test for auto) returns null for canvas
        mockController.captureFrame = vi.fn()
            .mockResolvedValueOnce(null) // Test frame for 'canvas' fails
            .mockResolvedValue(new VideoFrame({} as any, {})); // Subsequent calls succeed

        const onProgress = vi.fn();
        await exporter.export({ onProgress, signal: new AbortController().signal, mode: 'auto' });

        // First call was probe
        expect(mockController.captureFrame).toHaveBeenNthCalledWith(1, 0, { selector: 'canvas', mode: 'canvas' });

        // Second call (setup) should use 'dom'
        expect(mockController.captureFrame).toHaveBeenNthCalledWith(2, 0, { selector: 'canvas', mode: 'dom' });
    });

    it('should export audio if tracks exist', async () => {
        const onProgress = vi.fn();
        const signal = new AbortController().signal;

        (mockController.getAudioTracks as any).mockResolvedValue([
            { buffer: new ArrayBuffer(8), mimeType: 'audio/mp3' }
        ]);

        await exporter.export({ onProgress, signal, mode: 'canvas' });

        expect(audioConfigureSpy).toHaveBeenCalled();
        expect(audioEncodeSpy).toHaveBeenCalled();
        expect(audioFlushSpy).toHaveBeenCalled();
        expect(audioCloseSpy).toHaveBeenCalled();
    });
});
