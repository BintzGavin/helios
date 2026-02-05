import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HeliosPlayer } from '../index';
import { ClientSideExporter } from './exporter';

// Mock ClientSideExporter
vi.mock('./exporter', () => {
    return {
        ClientSideExporter: vi.fn().mockImplementation(function() {
            return {
                export: vi.fn().mockResolvedValue(undefined),
                saveCaptionsAsSRT: vi.fn()
            };
        })
    };
});

// Mock ResizeObserver
vi.stubGlobal('ResizeObserver', class {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
});

describe('HeliosPlayer Export API', () => {
    let player: HeliosPlayer;
    let mockController: any;

    beforeEach(() => {
        // Create player element
        player = new HeliosPlayer();

        // Mock controller
        mockController = {
            dispose: vi.fn(),
            pause: vi.fn(),
            play: vi.fn(),
            seek: vi.fn(),
            getState: vi.fn().mockReturnValue({ duration: 1, fps: 30 }),
            subscribe: vi.fn().mockReturnValue(() => {}),
            onError: vi.fn().mockReturnValue(() => {}),
            onAudioMetering: vi.fn().mockReturnValue(() => {}),
            setAudioVolume: vi.fn(),
            setPlaybackRate: vi.fn(),
            setAudioMuted: vi.fn(),
            setInputProps: vi.fn(),
        };

        // Manually inject controller (since setController is private)
        // We can access private members using 'as any' for testing
        (player as any).controller = mockController;

        // Reset mocks
        vi.clearAllMocks();
    });

    it('should expose public export method', () => {
        expect(typeof player.export).toBe('function');
    });

    it('should throw if not connected', async () => {
        (player as any).controller = null;
        await expect(player.export()).rejects.toThrow("Not connected");
    });

    it('should call ClientSideExporter.export with correct options', async () => {
        const options = {
            format: 'webm' as const,
            filename: 'test-video',
            width: 1920,
            height: 1080
        };

        await player.export(options);

        expect(ClientSideExporter).toHaveBeenCalledWith(mockController);

        const mockExporterInstance = (ClientSideExporter as any).mock.results[0].value;
        expect(mockExporterInstance.export).toHaveBeenCalledWith(expect.objectContaining({
            format: 'webm',
            filename: 'test-video',
            width: 1920,
            height: 1080
        }));
    });

    it('should prevent concurrent exports', async () => {
        // Make export hang
        const mockExporterInstance = {
            export: vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100))),
            saveCaptionsAsSRT: vi.fn()
        };
        (ClientSideExporter as any).mockImplementation(function() { return mockExporterInstance; });

        // Start first export
        const p1 = player.export();

        // Start second export immediately
        await expect(player.export()).rejects.toThrow("Already exporting");

        await p1;
    });

    it('should respect export-caption-mode="file" logic', async () => {
        const mockExporterInstance = {
            export: vi.fn().mockResolvedValue(undefined),
            saveCaptionsAsSRT: vi.fn()
        };
        (ClientSideExporter as any).mockImplementation(function() { return mockExporterInstance; });

        // Setup captions
        (player as any).showCaptions = true;
        (player as any)._textTracks = [
            { kind: 'captions', mode: 'showing', cues: [{ startTime: 0, endTime: 1, text: 'test' }] }
        ];

        player.setAttribute('export-caption-mode', 'file');

        await player.export({ filename: 'my-video' }); // includeCaptions implicitly undefined

        // Should save SRT
        expect(mockExporterInstance.saveCaptionsAsSRT).toHaveBeenCalled();

        // Should pass includeCaptions: false to export
        expect(mockExporterInstance.export).toHaveBeenCalledWith(expect.objectContaining({
            includeCaptions: false,
            filename: 'my-video'
        }));
    });

    it('should override caption mode if includeCaptions is explicitly true', async () => {
        const mockExporterInstance = {
            export: vi.fn().mockResolvedValue(undefined),
            saveCaptionsAsSRT: vi.fn()
        };
        (ClientSideExporter as any).mockImplementation(function() { return mockExporterInstance; });

        player.setAttribute('export-caption-mode', 'file');

        await player.export({ includeCaptions: true });

        // Should NOT save SRT
        expect(mockExporterInstance.saveCaptionsAsSRT).not.toHaveBeenCalled();

        // Should pass includeCaptions: true
        expect(mockExporterInstance.export).toHaveBeenCalledWith(expect.objectContaining({
            includeCaptions: true
        }));
    });

    it('should lock playback controls during export', async () => {
        const lockSpy = vi.spyOn(player as any, 'lockPlaybackControls');

        await player.export();

        expect(lockSpy).toHaveBeenCalledWith(true);
        expect(lockSpy).toHaveBeenCalledWith(false); // In finally block
    });

    it('should handle default values correctly when attributes are missing', async () => {
        const mockExporterInstance = {
            export: vi.fn().mockResolvedValue(undefined),
            saveCaptionsAsSRT: vi.fn()
        };
        (ClientSideExporter as any).mockImplementation(function() { return mockExporterInstance; });

        await player.export();

        expect(mockExporterInstance.export).toHaveBeenCalledWith(expect.objectContaining({
            width: undefined,
            height: undefined,
            bitrate: undefined
        }));
    });
});
