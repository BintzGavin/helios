/**
 * Spike only. Bundled into an IIFE and injected into the page's own realm (the view's nested
 * srcdoc frame) when the person clicks Export MP4. It drives the player's ClientSideExporter
 * with a controller that seeks through the renderer's page shim (window.__helios_seek), so the
 * exported frames come from the same "frame at t" definition as the preview and `helios render`.
 *
 * It runs in the page realm, not the view's, because dom-capture uses `instanceof
 * HTMLImageElement` and friends, which are false across realms.
 */
import { ClientSideExporter } from '../../../../packages/player/src/features/exporter';
import { captureDomToBitmap } from '../../../../packages/player/src/features/dom-capture';

type Mode = 'auto' | 'canvas' | 'dom';

export interface SpikeExportOptions {
  fps: number;
  duration: number;
  width: number;
  height: number;
  mode?: Mode;
  bitrate?: number;
  /** Before exporting, turn <link rel=stylesheet> and <img src> into inline data (needs connect-src). */
  inline?: boolean;
  /** Per DOM frame, write animated computed styles inline and switch CSS animations off in the clone. */
  bake?: boolean;
  /** Route the DOM capture through a data: URL and a canvas so Chromium doesn't taint it (default on). */
  untaint?: boolean;
  /** Frame indices whose raw captured pixels are returned as PNG data URLs (before encoding). */
  sampleFrames?: number[];
  onProgress?: (p: number) => void;
}

export interface SpikeExportResult {
  bytes: Uint8Array;
  mode: Mode;
  frames: number;
  totalMs: number;
  seekMs: number;
  captureMs: number;
  inlineMs: number;
  inlineReport: string[];
  samples: Record<number, string>;
  warnings: string[];
}

declare global {
  interface Window {
    __helios_seek?: (t: number, timeoutMs?: number) => Promise<void> | void;
    __helios_invalidate_cache?: () => void;
    __helios_spike_export?: (o: SpikeExportOptions) => Promise<SpikeExportResult>;
  }
}

/**
 * The page shim virtualizes performance.now() and Date.now() in this realm, so time the work
 * with the view's (parent's) clock.
 */
const now = (): number => {
  try { return (window.parent as Window).performance.now(); } catch { return new Date().getTime(); }
};

const KEYFRAME_META = new Set(['offset', 'easing', 'composite', 'computedOffset']);
const toCss = (p: string) => (p === 'cssFloat' ? 'float' : p.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()));

/**
 * The serialized SVG clone has no animation timeline: a CSS animation in it restarts at 0 and a
 * WAAPI animation is lost. So write each animated property's current computed value inline, and
 * switch animations off on those elements while the clone is taken. Returns the undo.
 */
function bakeAnimations(doc: Document): () => void {
  const saved = new Map<HTMLElement | SVGElement, string | null>();
  const writes: Array<[HTMLElement | SVGElement, string, string]> = [];
  for (const anim of doc.getAnimations()) {
    const effect = anim.effect as KeyframeEffect | null;
    const el = effect && (effect.target as HTMLElement | SVGElement | null);
    if (!effect || !el || effect.pseudoElement) continue;
    const cs = doc.defaultView!.getComputedStyle(el);
    for (const kf of effect.getKeyframes()) {
      for (const prop of Object.keys(kf)) {
        if (KEYFRAME_META.has(prop)) continue;
        const css = toCss(prop);
        writes.push([el, css, cs.getPropertyValue(css)]);
      }
    }
    if (!saved.has(el)) saved.set(el, el.getAttribute('style'));
  }
  // All reads happen before any write, so one element's write can't change another's read.
  for (const [el, css, value] of writes) el.style.setProperty(css, value);
  for (const el of saved.keys()) {
    el.style.setProperty('animation', 'none', 'important');
    el.style.setProperty('transition', 'none', 'important');
  }
  return () => {
    for (const [el, style] of saved) {
      if (style === null) el.removeAttribute('style');
      else el.setAttribute('style', style);
    }
    // Switching CSS animations off cancels them; the shim must rescan for the new ones.
    if (saved.size) window.__helios_invalidate_cache?.();
  };
}

/**
 * Chromium 148+ taints any image made from an SVG with a foreignObject when it is loaded from a
 * blob: URL, and taints an ImageBitmap made from it even from a data: URL, so VideoFrame refuses
 * what captureDomToBitmap returns (see taint-check.mjs). The one clean path is a data: URL drawn
 * onto a canvas. This runs captureDomToBitmap with that path patched in, leaving the player's
 * capture code itself unchanged: the SVG blob becomes a data: URL, and createImageBitmap of that
 * image goes through a canvas.
 */
async function withUntaintedSvg<T>(fn: () => Promise<T>): Promise<T> {
  const OrigBlob = window.Blob;
  const origCreate = URL.createObjectURL;
  const origBitmap = window.createImageBitmap;
  const svgText = new WeakMap<Blob, string>();
  window.Blob = class extends OrigBlob {
    constructor(parts?: BlobPart[], opts?: BlobPropertyBag) {
      super(parts, opts);
      if (opts?.type?.startsWith('image/svg+xml') && parts?.every((p) => typeof p === 'string')) svgText.set(this, (parts as string[]).join(''));
    }
  } as typeof Blob;
  URL.createObjectURL = (obj: Blob | MediaSource) => {
    const text = obj instanceof OrigBlob ? svgText.get(obj) : undefined;
    return text !== undefined ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(text) : origCreate(obj);
  };
  window.createImageBitmap = ((src: any, ...rest: any[]) => {
    if (src instanceof HTMLImageElement && src.src.startsWith('data:image/svg+xml')) {
      const c = document.createElement('canvas');
      c.width = src.naturalWidth;
      c.height = src.naturalHeight;
      c.getContext('2d')!.drawImage(src, 0, 0);
      return (origBitmap as any).call(window, c, ...rest);
    }
    return (origBitmap as any).call(window, src, ...rest);
  }) as typeof createImageBitmap;
  try {
    return await fn();
  } finally {
    window.Blob = OrigBlob;
    URL.createObjectURL = origCreate;
    window.createImageBitmap = origBitmap;
  }
}

async function toDataUri(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/** One-time inlining so per-frame capture never fetches: stylesheets (with their url()s) and images. */
async function inlineAssets(doc: Document, report: string[]): Promise<void> {
  for (const link of Array.from(doc.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href]'))) {
    try {
      const res = await fetch(link.href);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      let css = await res.text();
      const urls = Array.from(new Set(Array.from(css.matchAll(/url\((['"]?)([^'")]+)\1\)/g), (m) => m[2])));
      for (const u of urls) {
        if (u.startsWith('data:')) continue;
        const abs = new URL(u, link.href).href;
        css = css.split(u).join(await toDataUri(abs));
      }
      const style = doc.createElement('style');
      style.dataset.heliosInlined = link.href;
      style.textContent = css;
      link.replaceWith(style);
      report.push(`inlined stylesheet ${link.href} (${urls.length} urls, ${(css.length / 1024).toFixed(0)} KB)`);
    } catch (e: any) {
      report.push(`could not inline stylesheet ${link.href}: ${e && e.message ? e.message : e}`);
    }
  }
  for (const img of Array.from(doc.images)) {
    const src = img.currentSrc || img.src;
    if (!src || src.startsWith('data:')) continue;
    try {
      img.src = await toDataUri(src);
      img.removeAttribute('srcset');
      report.push(`inlined image ${src}`);
    } catch (e: any) {
      report.push(`could not inline image ${src}: ${e && e.message ? e.message : e}`);
    }
  }
  await doc.fonts.ready;
}

class ShimController {
  seekMs = 0;
  captureMs = 0;
  samples: Record<number, string> = {};
  warnings: string[] = [];
  lastMode: Mode = 'auto';
  constructor(private o: SpikeExportOptions) {}

  pause() {}
  getState() {
    return { duration: this.o.duration, fps: this.o.fps, currentFrame: 0, playbackRange: null };
  }
  async getAudioTracks() {
    return [];
  }

  async captureFrame(frame: number, options?: { selector?: string; mode?: 'canvas' | 'dom'; width?: number; height?: number }) {
    const fps = this.o.fps;
    const t0 = now();
    if (typeof window.__helios_seek !== 'function') throw new Error('The page shim is missing');
    await window.__helios_seek(frame / fps, 3000);
    const t1 = now();
    this.seekMs += t1 - t0;
    const init = { timestamp: Math.round((frame * 1e6) / fps), duration: Math.round(1e6 / fps) };
    let vf: VideoFrame | null = null;
    this.lastMode = options?.mode ?? 'canvas';
    if (options?.mode === 'dom') {
      const undo = this.o.bake ? bakeAnimations(document) : null;
      try {
        const capture = () => captureDomToBitmap(document.body, { targetWidth: this.o.width, targetHeight: this.o.height });
        const bitmap = this.o.untaint === false ? await capture() : await withUntaintedSvg(capture);
        vf = new VideoFrame(bitmap, init);
        bitmap.close();
      } catch (e: any) {
        this.warnings.push(`frame ${frame}: DOM capture failed: ${e && e.message ? e.message : e}`);
        return null;
      } finally {
        undo?.();
      }
    } else {
      const canvas = document.querySelector(options?.selector || 'canvas') as HTMLCanvasElement | null;
      if (canvas && canvas.tagName === 'CANVAS') {
        let source: CanvasImageSource = canvas;
        if (canvas.width !== this.o.width || canvas.height !== this.o.height) {
          const off = new OffscreenCanvas(this.o.width, this.o.height);
          off.getContext('2d')!.drawImage(canvas, 0, 0, this.o.width, this.o.height);
          source = off;
        }
        vf = new VideoFrame(source, init);
      }
    }
    this.captureMs += now() - t1;
    if (vf && this.o.sampleFrames?.includes(frame)) this.samples[frame] = await framePng(vf);
    return vf ? { frame: vf, captions: [] } : null;
  }
}

async function framePng(vf: VideoFrame): Promise<string> {
  const c = document.createElement('canvas');
  c.width = vf.displayWidth;
  c.height = vf.displayHeight;
  c.getContext('2d')!.drawImage(vf, 0, 0);
  return c.toDataURL('image/png');
}

window.__helios_spike_export = async (o: SpikeExportOptions): Promise<SpikeExportResult> => {
  const start = now();
  const inlineReport: string[] = [];
  if (o.inline) await inlineAssets(document, inlineReport);
  const inlineMs = now() - start;

  const controller = new ShimController(o);
  const exporter = new ClientSideExporter(controller as any);
  let buffer: ArrayBuffer | null = null;
  // The exporter delivers with <a download>, which the host sandbox blocks. Keep the bytes instead.
  (exporter as any).download = (buf: ArrayBuffer) => { buffer = buf; };
  try {
    await exporter.export({
      onProgress: o.onProgress ?? (() => {}),
      mode: o.mode ?? 'auto',
      format: 'mp4',
      includeCaptions: false,
      width: o.width,
      height: o.height,
      bitrate: o.bitrate,
    });
  } catch (e: any) {
    throw new Error(`${e && e.message ? e.message : e}${controller.warnings.length ? ' | ' + controller.warnings.slice(0, 3).join(' | ') : ''}`);
  }
  if (!buffer) throw new Error('The exporter produced no file');
  return {
    bytes: new Uint8Array(buffer),
    mode: controller.lastMode,
    frames: Math.round(o.duration * o.fps),
    totalMs: now() - start,
    seekMs: controller.seekMs,
    captureMs: controller.captureMs,
    inlineMs,
    inlineReport,
    samples: controller.samples,
    warnings: controller.warnings,
  };
};
