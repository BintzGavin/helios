/**
 * Exports a Helios video page to MP4 inside the page itself, for views that play the page in a
 * frame they control (the MCP App view `ui://helios/player`). It drives ClientSideExporter with
 * a controller that seeks through the renderer's page shim (`window.__helios_seek`), so the
 * exported frames come from the same "frame at t" as the preview and `helios render`.
 *
 * It must run in the page's own realm: dom-capture uses `instanceof HTMLImageElement` and similar
 * checks, which are false across realms. The view injects the IIFE build of
 * page-exporter-entry.ts into the page, which installs `window.__helios_export`.
 */
import type { CaptionCue } from "@helios-project/core";
import { ClientSideExporter } from "./exporter";
import { captureDomToBitmap, type DomCaptureCache } from "./dom-capture";

export type PageExportMode = 'canvas' | 'dom';

export interface PageExportOptions {
  fps: number;
  /** Seconds; rounded to whole frames. */
  duration: number;
  width: number;
  height: number;
  /** 'auto' (default) uses canvas for a page that is one full-frame <canvas>, dom otherwise. */
  mode?: 'auto' | PageExportMode;
  bitrate?: number;
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
}

export interface PageExportResult {
  bytes: Uint8Array;
  mode: PageExportMode;
  frames: number;
}

type SeekFn = (t: number, timeoutMs?: number) => unknown;
type PageWindow = Window & {
  __helios_seek?: SeekFn;
  __helios_export?: (options: PageExportOptions) => Promise<PageExportResult | null>;
};

const MAX_WIDTH = 7680;
const MAX_HEIGHT = 4320;
const MAX_FPS = 240;
/** How long one seek may take before the shim gives up on the page's renderAt. */
const SEEK_TIMEOUT_MS = 3000;
const NON_VISUAL = new Set(['SCRIPT', 'STYLE', 'LINK', 'META', 'TEMPLATE', 'NOSCRIPT', 'TITLE']);

/**
 * canvas when the page is one <canvas> that covers the frame and draws nothing else: then the
 * canvas pixels are the frame, exactly. Anything else (text, overlays, a small canvas) is dom.
 */
export function pickExportMode(doc: Document, width: number, height: number): PageExportMode {
  const body = doc.body;
  const canvas = doc.querySelector('canvas');
  if (!body || !canvas) return 'dom';
  const r = canvas.getBoundingClientRect();
  if (r.width < width * 0.95 || r.height < height * 0.95) return 'dom';
  for (const el of Array.from(body.querySelectorAll('*'))) {
    if (el === canvas || canvas.contains(el) || NON_VISUAL.has(el.tagName)) continue;
    if (!el.contains(canvas)) return 'dom';
  }
  // Text beside the canvas in one of its ancestors.
  for (let el: Element | null = canvas.parentElement; el; el = el === body ? null : el.parentElement) {
    for (const node of Array.from(el.childNodes)) {
      if (node.nodeType === 3 && (node.textContent || '').trim()) return 'dom';
    }
  }
  return 'canvas';
}

/** The controller ClientSideExporter drives: seeks with the page shim, captures the canvas or the DOM. */
export class PageSeekController {
  private cache: DomCaptureCache = new Map();

  constructor(
    private win: PageWindow,
    private o: { fps: number; frames: number; width: number; height: number }
  ) {}

  pause(): void {}

  getState() {
    return {
      duration: this.o.frames / this.o.fps,
      fps: this.o.fps,
      currentFrame: 0,
      // Whole frames, so the exporter never encodes a fractional extra one.
      playbackRange: [0, this.o.frames] as [number, number],
      activeCaptions: [] as CaptionCue[],
    };
  }

  async getAudioTracks(): Promise<never[]> {
    return [];
  }

  async captureFrame(
    frame: number,
    options?: { selector?: string; mode?: PageExportMode; width?: number; height?: number }
  ): Promise<{ frame: VideoFrame; captions: CaptionCue[] } | null> {
    const { fps, width, height } = this.o;
    const seek = this.win.__helios_seek;
    if (typeof seek !== 'function') throw new Error('The page has no Helios seek shim (window.__helios_seek)');
    await seek(frame / fps, SEEK_TIMEOUT_MS);
    const init = { timestamp: Math.round((frame * 1e6) / fps), duration: Math.round(1e6 / fps) };
    const doc = this.win.document;

    if (options?.mode === 'dom') {
      const bitmap = await captureDomToBitmap(doc.body, { targetWidth: width, targetHeight: height, cache: this.cache });
      try {
        return { frame: new VideoFrame(bitmap, init), captions: [] };
      } finally {
        bitmap.close();
      }
    }

    const canvas = doc.querySelector(options?.selector || 'canvas') as HTMLCanvasElement | null;
    if (!canvas || canvas.tagName !== 'CANVAS') return null;
    let source: CanvasImageSource = canvas;
    if (canvas.width !== width || canvas.height !== height) {
      const scaled = new OffscreenCanvas(width, height);
      const ctx = scaled.getContext('2d');
      if (!ctx) throw new Error('Could not scale the canvas: no 2D context');
      ctx.drawImage(canvas, 0, 0, width, height);
      source = scaled;
    }
    return { frame: new VideoFrame(source, init), captions: [] };
  }
}

function check(ok: boolean, message: string): void {
  if (!ok) throw new RangeError(message);
}

/** Encodes the page in `win` to MP4 bytes; resolves null when options.signal aborts it. */
export async function exportPage(win: Window, options: PageExportOptions): Promise<PageExportResult | null> {
  const { fps, duration, width, height } = options;
  check(Number.isFinite(fps) && fps > 0 && fps <= MAX_FPS, `fps must be above 0 and at most ${MAX_FPS}`);
  check(Number.isFinite(duration) && duration > 0, 'duration must be above 0 seconds');
  check(Number.isInteger(width) && width > 0 && width <= MAX_WIDTH, `width must be a whole number of pixels up to ${MAX_WIDTH}`);
  check(Number.isInteger(height) && height > 0 && height <= MAX_HEIGHT, `height must be a whole number of pixels up to ${MAX_HEIGHT}`);

  const frames = Math.max(1, Math.round(duration * fps));
  const doc = win.document;
  // Web fonts must be loaded before the first frame is captured.
  if (doc.fonts && doc.fonts.ready) await doc.fonts.ready;
  const mode: PageExportMode = options.mode && options.mode !== 'auto' ? options.mode : pickExportMode(doc, width, height);

  const controller = new PageSeekController(win as PageWindow, { fps, frames, width, height });
  const exporter = new ClientSideExporter(controller as any);
  const blob = await exporter.export({
    onProgress: options.onProgress ?? (() => {}),
    signal: options.signal,
    mode,
    format: 'mp4',
    includeCaptions: false,
    width,
    height,
    bitrate: options.bitrate,
    download: false,
  });
  if (!blob) return null;
  return { bytes: new Uint8Array(await blob.arrayBuffer()), mode, frames };
}

export function installPageExporter(win: Window = window): void {
  (win as PageWindow).__helios_export = (options) => exportPage(win, options);
}
