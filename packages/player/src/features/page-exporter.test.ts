// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const captureDomToBitmap = vi.fn();
vi.mock('./dom-capture', () => ({ captureDomToBitmap: (...args: any[]) => captureDomToBitmap(...args) }));

const exportCalls: any[] = [];
let exportResult: Blob | undefined;
vi.mock('./exporter', () => ({
    ClientSideExporter: class {
        constructor(public controller: any) {}
        async export(options: any) {
            exportCalls.push({ controller: this.controller, options });
            return exportResult;
        }
    },
}));

import { exportPage, installPageExporter, pickExportMode, PageSeekController } from './page-exporter';

class MockVideoFrame {
    constructor(public source: any, public init: any) {}
    close = vi.fn();
}
vi.stubGlobal('VideoFrame', MockVideoFrame);

class MockOffscreenCanvas {
    drawImage = vi.fn();
    constructor(public width: number, public height: number) {}
    getContext() { return { drawImage: this.drawImage }; }
}
vi.stubGlobal('OffscreenCanvas', MockOffscreenCanvas);

function rect(el: Element, width: number, height: number) {
    el.getBoundingClientRect = () => ({ x: 0, y: 0, left: 0, top: 0, right: width, bottom: height, width, height, toJSON() {} }) as DOMRect;
}

describe('page-exporter', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
        exportCalls.length = 0;
        exportResult = undefined;
        captureDomToBitmap.mockReset();
        delete (window as any).__helios_seek;
        delete (window as any).__helios_export;
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    describe('pickExportMode', () => {
        it('picks canvas for a page that is one canvas covering the frame', () => {
            document.body.innerHTML = '<main><canvas width="1920" height="1080"></canvas></main><script>1</script>';
            rect(document.querySelector('canvas')!, 1920, 1080);
            expect(pickExportMode(document, 1920, 1080)).toBe('canvas');
        });

        it('picks dom when anything besides the canvas is drawn', () => {
            document.body.innerHTML = '<canvas></canvas><h1>Title</h1>';
            rect(document.querySelector('canvas')!, 1920, 1080);
            expect(pickExportMode(document, 1920, 1080)).toBe('dom');

            document.body.innerHTML = '<div>Caption <canvas></canvas></div>';
            rect(document.querySelector('canvas')!, 1920, 1080);
            expect(pickExportMode(document, 1920, 1080)).toBe('dom');
        });

        it('picks dom when the canvas does not cover the frame, or there is none', () => {
            document.body.innerHTML = '<canvas></canvas>';
            rect(document.querySelector('canvas')!, 400, 300);
            expect(pickExportMode(document, 1920, 1080)).toBe('dom');

            document.body.innerHTML = '<div>No canvas</div>';
            expect(pickExportMode(document, 1920, 1080)).toBe('dom');
        });
    });

    describe('PageSeekController', () => {
        it('seeks through the page shim and stamps each frame with its time', async () => {
            const seeks: number[] = [];
            (window as any).__helios_seek = vi.fn(async (t: number) => { seeks.push(t); });
            document.body.innerHTML = '<canvas width="640" height="360"></canvas>';
            const canvas = document.querySelector('canvas')!;
            const c = new PageSeekController(window, { fps: 30, frames: 90, width: 640, height: 360 });

            expect(c.getState()).toMatchObject({ fps: 30, playbackRange: [0, 90] });
            const r = await c.captureFrame(45, { mode: 'canvas' });

            expect(seeks).toEqual([1.5]);
            const frame = r!.frame as unknown as MockVideoFrame;
            expect(frame.source).toBe(canvas);
            expect(frame.init).toEqual({ timestamp: 1_500_000, duration: 33_333 });
            expect(r!.captions).toEqual([]);
        });

        it('scales a canvas of another size to the export size', async () => {
            (window as any).__helios_seek = vi.fn();
            document.body.innerHTML = '<canvas width="3840" height="2160"></canvas>';
            const c = new PageSeekController(window, { fps: 30, frames: 30, width: 1920, height: 1080 });

            const r = await c.captureFrame(0, { mode: 'canvas' });

            const source = (r!.frame as unknown as MockVideoFrame).source as MockOffscreenCanvas;
            expect(source).toBeInstanceOf(MockOffscreenCanvas);
            expect([source.width, source.height]).toEqual([1920, 1080]);
            expect(source.drawImage).toHaveBeenCalledWith(document.querySelector('canvas'), 0, 0, 1920, 1080);
        });

        it('captures the DOM at the export size, sharing one fetch cache across frames, and closes each bitmap', async () => {
            (window as any).__helios_seek = vi.fn();
            const bitmaps: any[] = [];
            captureDomToBitmap.mockImplementation(async () => {
                const b = { close: vi.fn() };
                bitmaps.push(b);
                return b;
            });
            const c = new PageSeekController(window, { fps: 25, frames: 50, width: 1280, height: 720 });

            await c.captureFrame(0, { mode: 'dom' });
            await c.captureFrame(1, { mode: 'dom' });

            expect(captureDomToBitmap).toHaveBeenCalledTimes(2);
            const [el, opts] = captureDomToBitmap.mock.calls[0];
            expect(el).toBe(document.body);
            expect(opts).toMatchObject({ targetWidth: 1280, targetHeight: 720 });
            expect(opts.cache).toBeInstanceOf(Map);
            expect(captureDomToBitmap.mock.calls[1][1].cache).toBe(opts.cache);
            for (const b of bitmaps) expect(b.close).toHaveBeenCalled();
        });

        it('fails clearly when the page has no seek shim', async () => {
            const c = new PageSeekController(window, { fps: 30, frames: 30, width: 640, height: 360 });
            await expect(c.captureFrame(0, { mode: 'canvas' })).rejects.toThrow(/seek shim/);
        });
    });

    describe('exportPage', () => {
        it('exports every frame at the given size as an MP4 and returns the bytes', async () => {
            (window as any).__helios_seek = vi.fn();
            document.body.innerHTML = '<p>DOM page</p>';
            const mp4 = new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112]);
            // jsdom's Blob has no arrayBuffer().
            exportResult = Object.assign(new Blob([mp4], { type: 'video/mp4' }), { arrayBuffer: async () => mp4.buffer });
            const onProgress = vi.fn();
            const signal = new AbortController().signal;

            const r = await exportPage(window, { fps: 30, duration: 2.5, width: 1280, height: 720, onProgress, signal });

            expect(r).not.toBeNull();
            expect(Array.from(r!.bytes)).toEqual([0, 0, 0, 24, 102, 116, 121, 112]);
            expect(r!.mode).toBe('dom');
            expect(r!.frames).toBe(75);
            const { controller, options } = exportCalls[0];
            expect(controller.getState().playbackRange).toEqual([0, 75]);
            expect(options).toMatchObject({ mode: 'dom', format: 'mp4', width: 1280, height: 720, download: false, includeCaptions: false, signal, onProgress });
        });

        it('returns null when cancelled', async () => {
            (window as any).__helios_seek = vi.fn();
            exportResult = undefined;
            expect(await exportPage(window, { fps: 30, duration: 1, width: 640, height: 360 })).toBeNull();
        });

        it('refuses sizes and rates the encoder cannot take', async () => {
            for (const bad of [{ fps: 0 }, { duration: -1 }, { width: 0 }, { height: 1.5 }, { width: 9000 }]) {
                await expect(exportPage(window, { fps: 30, duration: 1, width: 640, height: 360, ...bad })).rejects.toThrow();
            }
            expect(exportCalls).toHaveLength(0);
        });

        it('installs itself as window.__helios_export', () => {
            installPageExporter(window);
            expect(typeof (window as any).__helios_export).toBe('function');
        });
    });
});
