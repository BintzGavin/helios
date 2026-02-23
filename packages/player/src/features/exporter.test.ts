import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClientSideExporter } from './exporter';
import { HeliosController } from '../controllers';

// Spies for Mediabunny
const videoAddSpy = vi.fn().mockResolvedValue(undefined);
const audioAddSpy = vi.fn().mockResolvedValue(undefined);
const outputStartSpy = vi.fn().mockResolvedValue(undefined);
const outputFinalizeSpy = vi.fn().mockResolvedValue(undefined);
const videoSampleSources: any[] = [];

// Mock Mediabunny
vi.mock('mediabunny', () => {
    return {
        Output: class {
            constructor(public options: any) {}
            addVideoTrack = vi.fn();
            addAudioTrack = vi.fn();
            start = outputStartSpy;
            finalize = outputFinalizeSpy;
        },
        BufferTarget: class {
            buffer = new ArrayBuffer(100); // Simulate success
        },
        Mp4OutputFormat: class {},
        WebMOutputFormat: class {},
        VideoSampleSource: class {
            constructor(public config: any) {
                videoSampleSources.push(this);
            }
            add = videoAddSpy;
        },
        AudioSampleSource: class {
            constructor(public config: any) {}
            add = audioAddSpy;
        },
        VideoSample: class {
            constructor(public frame: any, public init?: any) {}
        },
        AudioSample: class {
            constructor(public init: any) {}
        }
    };
});

// Mock AudioData
class MockAudioData {
    constructor(public init: any) {}
    close = vi.fn();
}
vi.stubGlobal('AudioData', MockAudioData);

// Spies for GainNode
const gainNodes: any[] = [];
const createGainSpy = vi.fn().mockImplementation(() => {
    const node = {
        gain: { value: 1 },
        connect: vi.fn()
    };
    gainNodes.push(node);
    return node;
});

// Mock OfflineAudioContext
class MockOfflineAudioContext {
    createBufferSource = vi.fn().mockReturnValue({
        buffer: null,
        connect: vi.fn(),
        start: vi.fn()
    });
    createGain = createGainSpy;
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

// Spies for Canvas
const fillTextSpy = vi.fn();
const fillRectSpy = vi.fn();

// Mock OffscreenCanvas
class MockOffscreenCanvas {
    constructor(public width: number, public height: number) {}
    getContext = vi.fn().mockReturnValue({
        drawImage: vi.fn(),
        measureText: vi.fn().mockReturnValue({ width: 10 }),
        fillRect: fillRectSpy,
        fillText: fillTextSpy,
        save: vi.fn(),
        restore: vi.fn(),
    });
    convertToBlob = vi.fn().mockResolvedValue(new Blob(['mock'], { type: 'image/png' }));
}
vi.stubGlobal('OffscreenCanvas', MockOffscreenCanvas);

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
    let mockAnchor: any;

    beforeEach(() => {
        vi.clearAllMocks();
        gainNodes.length = 0;
        videoSampleSources.length = 0;

        mockController = {
            play: vi.fn(),
            pause: vi.fn(),
            seek: vi.fn(),
            setPlaybackRate: vi.fn(),
            setInputProps: vi.fn(),
            subscribe: vi.fn(),
            getState: vi.fn().mockReturnValue({ duration: 1, fps: 10 }), // 10 frames total
            dispose: vi.fn(),
            captureFrame: vi.fn().mockResolvedValue({ frame: new VideoFrame({} as any, {}), captions: [] }),
            getAudioTracks: vi.fn().mockResolvedValue([])
        } as unknown as HeliosController;

        exporter = new ClientSideExporter(mockController);

        // Mock document.createElement('a')
        mockAnchor = {
            click: vi.fn(),
            href: '',
            download: ''
        };
        vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
    });

    it('should run export process successfully (MP4 default)', async () => {
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

        expect(outputStartSpy).toHaveBeenCalled();
        expect(videoAddSpy).toHaveBeenCalledTimes(10);
        expect(outputFinalizeSpy).toHaveBeenCalled();

        // Download
        expect(URL.createObjectURL).toHaveBeenCalled();
        expect(document.createElement).toHaveBeenCalledWith('a');
        expect(mockAnchor.download).toBe('video.mp4');
    });

    it('should run export process successfully (WebM)', async () => {
        const onProgress = vi.fn();
        const signal = new AbortController().signal;

        await exporter.export({ onProgress, signal, mode: 'canvas', format: 'webm' });

        // Verify codec in video source config if we could access it, but spy doesn't easily expose constructor args of mocked class.
        // We can check mockAnchor download filename though.
        expect(mockAnchor.download).toBe('video.webm');
    });

    it('should handle abort signal', async () => {
        const controller = new AbortController();
        const onProgress = vi.fn();

        // Abort after start
        mockController.captureFrame = vi.fn().mockImplementation(async () => {
            controller.abort();
            return { frame: new VideoFrame({} as any, {}), captions: [] };
        });

        await exporter.export({ onProgress, signal: controller.signal, mode: 'canvas' });

        // Should have stopped early
        expect(outputFinalizeSpy).not.toHaveBeenCalled();
    });

    it('should fallback to DOM if canvas not found in auto mode', async () => {
        mockController.captureFrame = vi.fn()
            .mockResolvedValueOnce(null)
            .mockResolvedValue({ frame: new VideoFrame({} as any, {}), captions: [] });

        const onProgress = vi.fn();
        await exporter.export({ onProgress, signal: new AbortController().signal, mode: 'auto' });

        expect(mockController.captureFrame).toHaveBeenNthCalledWith(1, 0, { selector: 'canvas', mode: 'canvas' });
        expect(mockController.captureFrame).toHaveBeenNthCalledWith(2, 0, { selector: 'canvas', mode: 'dom' });
    });

    it('should export audio if tracks exist', async () => {
        const onProgress = vi.fn();
        const signal = new AbortController().signal;

        (mockController.getAudioTracks as any).mockResolvedValue([
            { buffer: new ArrayBuffer(8), mimeType: 'audio/mp3' }
        ]);

        await exporter.export({ onProgress, signal, mode: 'canvas', format: 'mp4' });

        expect(audioAddSpy).toHaveBeenCalled();
        expect(outputFinalizeSpy).toHaveBeenCalled();
    });

    it('should apply volume and mute settings to audio export', async () => {
        const onProgress = vi.fn();
        const signal = new AbortController().signal;

        (mockController.getAudioTracks as any).mockResolvedValue([
            { buffer: new ArrayBuffer(8), mimeType: 'audio/mp3', volume: 0.5, muted: false },
            { buffer: new ArrayBuffer(8), mimeType: 'audio/mp3', volume: 1, muted: true }
        ]);

        await exporter.export({ onProgress, signal, mode: 'canvas', format: 'mp4' });

        expect(createGainSpy).toHaveBeenCalledTimes(2);
        expect(gainNodes).toHaveLength(2);
        expect(gainNodes[0].gain.value).toBe(0.5);
        expect(gainNodes[1].gain.value).toBe(0);
    });

    it('should render captions if present', async () => {
        const onProgress = vi.fn();
        const signal = new AbortController().signal;

        mockController.captureFrame = vi.fn().mockResolvedValue({
            frame: new VideoFrame({} as any, {}),
            captions: [{ id: '1', startTime: 0, endTime: 1000, text: 'Hello World' }]
        });

        await exporter.export({ onProgress, signal, mode: 'canvas' });

        // Indirectly verify by ensuring process completes
        expect(videoAddSpy).toHaveBeenCalled();
    });

    it('should NOT render captions if includeCaptions is false', async () => {
        const onProgress = vi.fn();
        const signal = new AbortController().signal;

        fillTextSpy.mockClear();
        fillRectSpy.mockClear();

        mockController.captureFrame = vi.fn().mockResolvedValue({
            frame: new VideoFrame({} as any, {}),
            captions: [{ id: '1', startTime: 0, endTime: 1000, text: 'Hello World' }]
        });

        await exporter.export({ onProgress, signal, mode: 'canvas', includeCaptions: false });

        expect(fillTextSpy).not.toHaveBeenCalled();
        expect(fillRectSpy).not.toHaveBeenCalled();
    });

    it('should handle multiline captions correctly', async () => {
        const onProgress = vi.fn();
        const signal = new AbortController().signal;

        fillTextSpy.mockClear();

        mockController.captureFrame = vi.fn().mockResolvedValue({
            frame: new VideoFrame({} as any, {}),
            captions: [{ id: '1', startTime: 0, endTime: 1000, text: 'Line 1\nLine 2' }]
        });

        await exporter.export({ onProgress, signal, mode: 'canvas', includeCaptions: true });

        expect(fillTextSpy).toHaveBeenCalledTimes(20);
        expect(fillTextSpy).toHaveBeenCalledWith('Line 1', expect.any(Number), expect.any(Number));
        expect(fillTextSpy).toHaveBeenCalledWith('Line 2', expect.any(Number), expect.any(Number));
    });

    it('should respect playbackRange if set', async () => {
        const onProgress = vi.fn();
        const signal = new AbortController().signal;

        mockController.getState = vi.fn().mockReturnValue({
            duration: 10,
            fps: 10,
            playbackRange: [20, 30] // 10 frames
        });

        await exporter.export({ onProgress, signal, mode: 'canvas' });

        expect(mockController.captureFrame).toHaveBeenCalledWith(20, expect.anything());
        expect(mockController.captureFrame).toHaveBeenCalledWith(29, expect.anything());
        expect(mockController.captureFrame).not.toHaveBeenCalledWith(19, expect.anything());
        expect(mockController.captureFrame).not.toHaveBeenCalledWith(30, expect.anything());

        expect(videoAddSpy).toHaveBeenCalledTimes(10);
    });

    it('should save captions as SRT file', () => {
        const cues = [{ id: '1', startTime: 0, endTime: 1000, text: 'Hello' }];
        exporter.saveCaptionsAsSRT(cues, 'test.srt');

        expect(URL.createObjectURL).toHaveBeenCalled();
        expect(document.createElement).toHaveBeenCalledWith('a');
        expect(mockAnchor.download).toBe('test.srt');
        expect(mockAnchor.click).toHaveBeenCalled();
        expect(URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('should respect custom bitrate configuration', async () => {
        const onProgress = vi.fn();
        const signal = new AbortController().signal;

        await exporter.export({ onProgress, signal, mode: 'canvas', bitrate: 8_000_000 });

        expect(videoSampleSources.length).toBeGreaterThan(0);
        expect(videoSampleSources[0].config.bitrate).toBe(8_000_000);
    });

    it('should default bitrate to 5Mbps if not provided', async () => {
        const onProgress = vi.fn();
        const signal = new AbortController().signal;

        await exporter.export({ onProgress, signal, mode: 'canvas' });

        expect(videoSampleSources.length).toBeGreaterThan(0);
        expect(videoSampleSources[0].config.bitrate).toBe(5_000_000);
    });

    it('should use custom filename', async () => {
        const onProgress = vi.fn();
        const signal = new AbortController().signal;

        await exporter.export({ onProgress, signal, mode: 'canvas', filename: 'custom-export' });

        expect(mockAnchor.download).toBe('custom-export.mp4');
    });

    it('should export PNG snapshot of current frame', async () => {
        const onProgress = vi.fn();
        const signal = new AbortController().signal;

        // Mock current frame
        (mockController.getState as any).mockReturnValue({ duration: 10, fps: 30, currentFrame: 15 });

        await exporter.export({ onProgress, signal, mode: 'canvas', format: 'png', filename: 'snapshot' });

        // Should capture current frame (15)
        expect(mockController.captureFrame).toHaveBeenCalledWith(15, expect.anything());

        // Should download as png
        expect(mockAnchor.download).toBe('snapshot.png');
        expect(mockAnchor.click).toHaveBeenCalled();
        expect(outputStartSpy).not.toHaveBeenCalled(); // Should skip mediabunny
    });

    it('should export JPEG snapshot', async () => {
        const onProgress = vi.fn();
        const signal = new AbortController().signal;

        await exporter.export({ onProgress, signal, mode: 'canvas', format: 'jpeg', filename: 'snapshot' });

        expect(mockAnchor.download).toBe('snapshot.jpeg');
        expect(outputStartSpy).not.toHaveBeenCalled();
    });

    it('should request resized frames when export dimensions are provided', async () => {
        const onProgress = vi.fn();
        const signal = new AbortController().signal;

        await exporter.export({
            onProgress,
            signal,
            mode: 'canvas',
            width: 3840,
            height: 2160
        });

        // Verify captureFrame was called with resizing options
        expect(mockController.captureFrame).toHaveBeenCalledWith(
            expect.any(Number),
            expect.objectContaining({
                width: 3840,
                height: 2160
            })
        );
    });
});
