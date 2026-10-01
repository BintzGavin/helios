import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { mkdir, mkdtemp, rename, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { createCanvas, GlobalFonts, type SKRSContext2D } from './skia-binding.js';
import { loadFont } from './text.js';
import { parsePlan, frameTime, RenderError, LIMITS, type Fps, type Plan } from './plan.js';
import { videoEncoderArgs, probeVideo, probeEncodedChunk, type SoftwareEncoderOptions } from './render.js';
import { startProcess } from './process.js';

export interface CanvasFrame { index: number; time: number; fonts: Readonly<Record<string, string>> }
/** Trusted code installed with a worker. Not executable input to the JSON render service. */
export interface CanvasComposition {
  width: number; height: number; fps: Fps; frameCount: number; background?: string;
  fonts?: Record<string, Uint8Array>;
  /** Paint the requested frame directly; do not depend on prior calls or wall time. */
  draw(context: SKRSContext2D, frame: CanvasFrame): void | Promise<void>;
}
export interface CanvasRenderOptions {
  ffmpeg?: string; ffprobe?: string; signal?: AbortSignal; start?: number; end?: number;
  encoder?: SoftwareEncoderOptions; onFrame?: (index: number) => void | Promise<void>;
}
export interface CanvasFrameTimings { rasterizeMs: number; pixelExtractionMs: number }
export interface CanvasRangeStats extends CanvasFrameTimings { frames: number; preparationMs: number; drawMs: number; encoderWaitMs: number; encodeMs: number; verifyMs: number }
type FontKey = NonNullable<ReturnType<typeof GlobalFonts.register>>;
const registered = new Map<string, { key: FontKey; users: number }>();

/** One retained CPU surface. Use separate instances for concurrent frame ranges. */
export class CanvasFrameRenderer {
  readonly plan: Plan;
  private canvas;
  private fonts: Record<string, string> = Object.create(null);
  private acquired: string[] = [];
  private busy = false;
  private closed = false;
  constructor(private composition: CanvasComposition) {
    if (!composition || typeof composition !== 'object' || typeof composition.draw !== 'function') throw new RenderError('INVALID_COMPOSITION', 'Canvas composition requires a frame drawing function');
    this.plan = parsePlan({ version: 'portable-v1', width: composition.width, height: composition.height, fps: composition.fps, frameCount: composition.frameCount, background: composition.background ?? '#000000', nodes: [] });
    const fonts = Object.values(composition.fonts ?? {});
    if (fonts.length > LIMITS.assets || fonts.some(bytes => !(bytes instanceof Uint8Array)) || fonts.reduce((sum, bytes) => sum + bytes.byteLength, 0) > LIMITS.fontBytes) throw new RenderError('RESOURCE_LIMIT', 'Explicit canvas fonts exceed the resource envelope');
    this.canvas = createCanvas(this.plan.width, this.plan.height);
    try {
      for (const [name, bytes] of Object.entries(composition.fonts ?? {})) {
        loadFont(bytes);
        const alias = `Helios_${createHash('sha256').update(bytes).digest('hex')}`;
        let font = registered.get(alias);
        if (!font) {
          const key = GlobalFonts.register(Buffer.from(bytes), alias);
          if (!key) throw new RenderError('INVALID_FONT', 'Native font registration failed');
          font = { key, users: 0 }; registered.set(alias, font);
        }
        font.users++; this.acquired.push(alias); this.fonts[name] = alias;
      }
      Object.freeze(this.fonts);
    } catch (error) { this.close(); throw error; }
  }
  async render(index: number, timings?: CanvasFrameTimings): Promise<Buffer> {
    if (this.closed) throw new RenderError('CLOSED_RENDERER', 'Canvas renderer is closed');
    if (this.busy) throw new RenderError('BUSY_RENDERER', 'Concurrent frames require independent canvases');
    if (!Number.isInteger(index) || index < 0 || index >= this.plan.frameCount) throw new RenderError('INVALID_FRAME', 'Frame is outside the composition');
    this.busy = true;
    try {
      const rasterStarted = timings ? performance.now() : 0;
      const ctx = this.canvas.getContext('2d'); ctx.reset();
      ctx.fillStyle = this.plan.background; ctx.fillRect(0, 0, this.plan.width, this.plan.height);
      await this.composition.draw(ctx, { index, time: frameTime(this.plan.fps, index), fonts: this.fonts });
      if (timings) timings.rasterizeMs += performance.now() - rasterStarted;
      const extractionStarted = timings ? performance.now() : 0;
      const data = ctx.getImageData(0, 0, this.plan.width, this.plan.height).data;
      const pixels = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
      if (timings) timings.pixelExtractionMs += performance.now() - extractionStarted;
      return pixels;
    } finally { this.busy = false; }
  }
  close(): void {
    if (this.closed) return;
    if (this.busy) throw new RenderError('BUSY_RENDERER', 'Cannot close an active canvas');
    this.closed = true;
    for (const alias of this.acquired) {
      const font = registered.get(alias)!;
      if (--font.users === 0) { GlobalFonts.remove(font.key); registered.delete(alias); }
    }
    this.acquired = [];
  }
}

/** Software-only encoding of an exact half-open range, suitable for stateless workers. */
export async function renderCanvasVideo(composition: CanvasComposition, output: string, options: CanvasRenderOptions = {}): Promise<void> {
  options.signal?.throwIfAborted();
  const renderer = new CanvasFrameRenderer(composition);
  let directory: string | undefined;
  try {
    const { start, end } = canvasRange(renderer, options);
    videoEncoderArgs(renderer.plan, end - start, output, 'rgba', options.encoder);
    const destination = resolve(output); await mkdir(dirname(destination), { recursive: true });
    directory = await mkdtemp(join(dirname(destination), '.helios-canvas-'));
    const staged = join(directory, 'video.mp4');
    await encodeCanvasRange(renderer, staged, options);
    options.signal?.throwIfAborted(); await rename(staged, destination);
  } finally { renderer.close(); if (directory) await rm(directory, { recursive: true, force: true }); }
}

function canvasRange(renderer: CanvasFrameRenderer, options: CanvasRenderOptions) {
  const start = options.start ?? 0, end = options.end ?? renderer.plan.frameCount;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end > renderer.plan.frameCount || end <= start) throw new RenderError('INVALID_RANGE', 'Invalid half-open frame range');
  return { start, end };
}

export async function encodeCanvasRange(renderer: CanvasFrameRenderer, output: string, options: CanvasRenderOptions = {}, internalChunk = false): Promise<CanvasRangeStats> {
  options.signal?.throwIfAborted();
  const { start, end } = canvasRange(renderer, options);
  const encoder = startProcess(options.ffmpeg ?? 'ffmpeg', videoEncoderArgs(renderer.plan, end - start, output, 'rgba', options.encoder), { signal: options.signal, timeoutMs: 300000 });
  encoder.child.stdout.resume();
  const started = performance.now(); let drawMs = 0, encoderWaitMs = 0;
  const timings: CanvasFrameTimings = { rasterizeMs: 0, pixelExtractionMs: 0 };
  try {
    for (let index = start; index < end; index++) {
      options.signal?.throwIfAborted();
      const drawStarted = performance.now(), pixels = await renderer.render(index, timings); drawMs += performance.now() - drawStarted;
      const waitStarted = performance.now();
      if (!encoder.child.stdin.write(pixels)) await Promise.race([once(encoder.child.stdin, 'drain'), encoder.done.then(() => { throw new RenderError('MEDIA_PROCESS', 'Encoder exited before all frames were written'); })]);
      encoderWaitMs += performance.now() - waitStarted;
      await options.onFrame?.(index);
    }
    encoder.child.stdin.end(); await encoder.done;
  } catch (error) { encoder.kill(); await encoder.done.catch(() => {}); throw error; }
  const encodeMs = performance.now() - started, verifyStarted = performance.now(), info = await (internalChunk ? probeEncodedChunk : probeVideo)(output, options);
  if (info.frameCount !== end - start || info.width !== renderer.plan.width || info.height !== renderer.plan.height || info.codec !== 'h264' || info.fps.num * renderer.plan.fps.den !== renderer.plan.fps.num * info.fps.den) throw new RenderError('INVALID_OUTPUT', 'Canvas export failed frame verification', 500);
  return { frames: end - start, preparationMs: 0, ...timings, drawMs, encoderWaitMs, encodeMs, verifyMs: performance.now() - verifyStarted };
}
