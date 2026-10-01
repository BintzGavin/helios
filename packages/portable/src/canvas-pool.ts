import { fork, type ChildProcess } from 'node:child_process';
import { availableParallelism } from 'node:os';
import { mkdir, mkdtemp, writeFile, rename, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CanvasFrameRenderer, type CanvasComposition, type CanvasRenderOptions, type CanvasRangeStats } from './canvas.js';
import { RenderError, frameTime } from './plan.js';
import { probeVideo } from './render.js';
import { runProcess } from './process.js';

export interface CanvasPoolOptions extends Omit<CanvasRenderOptions, 'onFrame'> {
  concurrency?: number; chunkFrames?: number;
  onProgress?: (completed: number, total: number) => void | Promise<void>;
}
export interface CanvasPoolResult { frames: number; chunks: number; workers: number; ranges: CanvasRangeStats[]; renderMs: number; finalizeMs: number; finalVerifyMs: number }
export async function loadCanvasComposition(module: URL): Promise<CanvasComposition> {
  if (module.protocol !== 'file:') throw new RenderError('INVALID_COMPOSITION', 'Canvas worker modules must be installed local files');
  const loaded = (await import(module.href)).default;
  return typeof loaded === 'function' ? await loaded() : loaded;
}

class CanvasWorker {
  private worker: ChildProcess;
  private readyResolve!: () => void;
  private readyReject!: (error: Error) => void;
  private pending?: { resolve: (stats: CanvasRangeStats) => void; reject: (error: Error) => void };
  readonly ready: Promise<void>;
  private exited: Promise<void>;
  private stopping = false;
  private failed?: Error;
  constructor(module: URL, options: CanvasRenderOptions) {
    this.ready = new Promise((resolve, reject) => { this.readyResolve = resolve; this.readyReject = reject; });
    void this.ready.catch(() => {});
    this.worker = fork(new URL('./canvas-worker.js', import.meta.url), [], { execArgv: [], stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
    const fail = () => {
      this.failed ??= new RenderError('CANVAS_WORKER', 'CPU canvas worker failed', 500);
      this.readyReject(this.failed); this.pending?.reject(this.failed); this.pending = undefined;
    };
    this.worker.on('message', (message: any) => {
      if (message.type === 'ready') this.readyResolve();
      else if (message.type === 'done') { this.pending?.resolve(message.stats); this.pending = undefined; }
      else fail();
    });
    this.worker.on('error', fail);
    this.exited = new Promise(resolve => this.worker.once('exit', () => { fail(); resolve(); }));
    this.worker.send({ type: 'initialize', module: module.href, options });
  }
  async render(range: { start: number; end: number; output: string }): Promise<CanvasRangeStats> {
    await this.ready;
    if (this.failed) throw this.failed;
    return new Promise((resolve, reject) => { this.pending = { resolve, reject }; this.worker.send({ type: 'range', ...range }, error => { if (error) reject(new RenderError('CANVAS_WORKER', 'CPU canvas worker failed', 500)); }); });
  }
  stop(): Promise<void> {
    if (!this.stopping) { this.stopping = true; if (this.worker.connected) this.worker.send({ type: 'stop' }, () => {}); }
    return this.exited;
  }
}

/** Persistent CPU workers dynamically claim contiguous ranges; each range seeks independently. */
export async function renderCanvasModule(modulePath: string | URL, output: string, options: CanvasPoolOptions = {}): Promise<CanvasPoolResult> {
  options.signal?.throwIfAborted();
  const concurrency = options.concurrency ?? Math.min(4, availableParallelism()), chunkFrames = options.chunkFrames ?? 90;
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 64) throw new RenderError('INVALID_CONCURRENCY', 'CPU worker count must be within 1..64');
  if (!Number.isInteger(chunkFrames) || chunkFrames < 1 || chunkFrames > 18000) throw new RenderError('INVALID_RANGE', 'Chunk frame count must be within 1..18000');
  const module = modulePath instanceof URL ? modulePath : pathToFileURL(resolve(modulePath));
  const prepared = new CanvasFrameRenderer(await loadCanvasComposition(module));
  const plan = prepared.plan; prepared.close();
  const start = options.start ?? 0, end = options.end ?? plan.frameCount;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end > plan.frameCount || end <= start) throw new RenderError('INVALID_RANGE', 'Invalid half-open frame range');
  options.signal?.throwIfAborted();
  const destination = resolve(output); await mkdir(dirname(destination), { recursive: true });
  const directory = await mkdtemp(join(dirname(destination), '.helios-canvas-'));
  const ranges = Array.from({ length: Math.ceil((end - start) / chunkFrames) }, (_, index) => ({ start: start + index * chunkFrames, end: Math.min(end, start + (index + 1) * chunkFrames), output: join(directory, `${index}.mp4`) }));
  const workers: CanvasWorker[] = [];
  const stop = () => { for (const worker of workers) void worker.stop(); };
  options.signal?.addEventListener('abort', stop, { once: true });
  let next = 0, completed = 0;
  const statistics: CanvasRangeStats[] = [], renderStarted = performance.now();
  try {
    for (let index = 0; index < Math.min(concurrency, ranges.length); index++) workers.push(new CanvasWorker(module, { ffmpeg: options.ffmpeg, ffprobe: options.ffprobe, encoder: options.encoder }));
    await Promise.all(workers.map(async worker => {
      await worker.ready;
      while (next < ranges.length) {
        options.signal?.throwIfAborted();
        const range = ranges[next++]; statistics.push(await worker.render(range));
        options.signal?.throwIfAborted();
        completed += range.end - range.start;
        await options.onProgress?.(completed, end - start);
      }
    }));
    await Promise.all(workers.map(worker => worker.stop()));
    options.signal?.throwIfAborted();
    const renderMs = performance.now() - renderStarted, finalizeStarted = performance.now();
    const manifest = join(directory, 'concat.txt'), final = join(directory, 'final.mp4');
    const escape = (path: string) => path.replace(/'/g, "'\\''");
    await writeFile(manifest, 'ffconcat version 1.0\n' + ranges.map(range => `file '${escape(range.output)}'\nduration ${frameTime(plan.fps, range.end - range.start).toFixed(9)}\n`).join(''));
    await runProcess(options.ffmpeg ?? 'ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', manifest, '-c:v', 'copy', '-an', '-video_track_timescale', String(plan.fps.num), '-movflags', '+faststart', final], { signal: options.signal, timeoutMs: 300000 });
    const verifyStarted = performance.now(), info = await probeVideo(final, options), finalVerifyMs = performance.now() - verifyStarted;
    if (info.frameCount !== end - start || info.width !== plan.width || info.height !== plan.height || info.codec !== 'h264' || info.fps.num * plan.fps.den !== plan.fps.num * info.fps.den || Math.abs(info.duration - frameTime(plan.fps, end - start)) > frameTime(plan.fps, 1)) throw new RenderError('INVALID_OUTPUT', 'Stitched canvas video failed verification', 500);
    options.signal?.throwIfAborted(); await rename(final, destination);
    return { frames: end - start, chunks: ranges.length, workers: workers.length, ranges: statistics, renderMs, finalizeMs: performance.now() - finalizeStarted, finalVerifyMs };
  } finally {
    options.signal?.removeEventListener('abort', stop);
    await Promise.all(workers.map(worker => worker.stop()));
    await rm(directory, { recursive: true, force: true });
  }
}
