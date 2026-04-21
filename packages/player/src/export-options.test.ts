// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HeliosPlayer } from './index';

describe('HeliosPlayer additional tests', () => {
    let player;

    beforeEach(() => {
        // Mock ResizeObserver
        global.ResizeObserver = class ResizeObserver {
            observe() {}
            unobserve() {}
            disconnect() {}
        };

        // Mock matchMedia
        window.matchMedia = vi.fn().mockImplementation(query => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }));

        document.body.innerHTML = '';
        player = new HeliosPlayer();
        document.body.appendChild(player);
    });

    afterEach(() => {
        delete global.ResizeObserver;
    });

    it('should cover export getter and setters', () => {
        player.exportMode = 'client';
        expect(player.exportMode).toBe('client');
        player.exportFormat = 'webm';
        expect(player.exportFormat).toBe('webm');
        player.exportFilename = 'test';
        expect(player.exportFilename).toBe('test');
        player.exportCaptionMode = 'separate';
        expect(player.exportCaptionMode).toBe('separate');

        player.exportWidth = 1920;
        expect(player.exportWidth).toBe(1920);
        player.exportWidth = null;
        expect(player.exportWidth).toBe(null);

        player.exportHeight = 1080;
        expect(player.exportHeight).toBe(1080);
        player.exportHeight = null;
        expect(player.exportHeight).toBe(null);

        // check with missing properties
        player.removeAttribute('export-width');
        expect(player.exportWidth).toBe(null);
        player.setAttribute('export-width', 'invalid');
        expect(player.exportWidth).toBe(null);

        player.removeAttribute('export-height');
        expect(player.exportHeight).toBe(null);
        player.setAttribute('export-height', 'invalid');
        expect(player.exportHeight).toBe(null);

        player.removeAttribute('export-mode');
        expect(player.exportMode).toBe('auto'); // Default

        player.removeAttribute('export-format');
        expect(player.exportFormat).toBe('mp4'); // Default

        player.removeAttribute('export-filename');
        expect(player.exportFilename).toBe('video'); // Default

        player.removeAttribute('export-caption-mode');
        expect(player.exportCaptionMode).toBe('burn-in'); // Default

        player.exportBitrate = 5000;
        expect(player.exportBitrate).toBe(5000);
        player.exportBitrate = null;
        expect(player.exportBitrate).toBe(null);
        player.removeAttribute('export-bitrate');
        expect(player.exportBitrate).toBe(null);
        player.setAttribute('export-bitrate', 'invalid');
        expect(player.exportBitrate).toBe(null);

        player.canvasSelector = '#test';
        expect(player.canvasSelector).toBe('#test');
        player.removeAttribute('canvas-selector');
        expect(player.canvasSelector).toBe('canvas');

        player.controlsList = 'nodownload';
        expect(player.controlsList).toBe('nodownload');
        player.removeAttribute('controlslist');
        expect(player.controlsList).toBe('');

        player.crossOrigin = 'anonymous';
        expect(player.crossOrigin).toBe('anonymous');
        player.crossOrigin = null;
        expect(player.crossOrigin).toBe(null);
    });

    it('should cover additional getters and setters', () => {
        expect(player.buffered).toBeDefined();
        expect(player.seekable).toBeDefined();
        expect(player.played).toBeDefined();

        player.width = 800;
        expect(player.width).toBe(800);
        player.removeAttribute('width');
        expect(player.width).toBe(0);
        player.setAttribute('width', 'invalid');
        expect(player.width).toBe(0);

        player.height = 600;
        expect(player.height).toBe(600);
        player.removeAttribute('height');
        expect(player.height).toBe(0);
        player.setAttribute('height', 'invalid');
        expect(player.height).toBe(0);

        player.setAttribute('width', '1920');
        expect(player.videoWidth).toBe(1920);
        player.setAttribute('height', '1080');
        expect(player.videoHeight).toBe(1080);
        player.removeAttribute('width');
        expect(player.videoWidth).toBe(0);
        player.setAttribute('width', 'invalid');
        expect(isNaN(player.videoWidth)).toBe(true);
        player.removeAttribute('height');
        expect(player.videoHeight).toBe(0);
        player.setAttribute('height', 'invalid');
        expect(isNaN(player.videoHeight)).toBe(true);

        player.playsInline = true;
        expect(player.playsInline).toBe(true);
        player.playsInline = false;
        expect(player.playsInline).toBe(false);
    });

    it('should test fastSeek coverage', () => {
        player.fastSeek(10);
    });

    it('should test get/set srcObject', () => {
        expect(player.srcObject).toBe(null);
        const mockStream = { id: 'mock-stream' };
        player.srcObject = mockStream;
        expect(player.srcObject).toBe(mockStream);
    });

    it('should test get/set preservesPitch', () => {
        expect(player.preservesPitch).toBe(true);
        player.preservesPitch = false;
        expect(player.preservesPitch).toBe(false);
    });

    it('should test get/set defaultPlaybackRate', () => {
        expect(player.defaultPlaybackRate).toBe(1);
        player.defaultPlaybackRate = 2;
        expect(player.defaultPlaybackRate).toBe(2);
        // setting same value should not trigger event
        let triggered = false;
        player.addEventListener('ratechange', () => { triggered = true; });
        player.defaultPlaybackRate = 2;
        expect(triggered).toBe(false);
    });

    it('should test videoWidth/videoHeight with controller', () => {
        player.controller = { getState: () => ({ width: 800, height: 600 }), pause: vi.fn(), dispose: vi.fn() };
        expect(player.videoWidth).toBe(800);
        expect(player.videoHeight).toBe(600);
    });

    it('should test error getter', () => {
        expect(player.error).toBe(null);
    });

    it('should test currentSrc', () => {
        expect(player.currentSrc).toBe("");
        player.src = "test.mp4";
        expect(player.currentSrc).toContain("test.mp4");
    });

    it('should test canPlayType and defaultMuted', () => {
        expect(player.canPlayType('video/mp4')).toBe('');

        expect(player.defaultMuted).toBe(false);
        player.defaultMuted = true;
        expect(player.defaultMuted).toBe(true);
        player.defaultMuted = false;
        expect(player.defaultMuted).toBe(false);
    });
});
