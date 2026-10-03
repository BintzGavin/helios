import { writeFile, rm, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { Plan, frameTime, RenderError } from './plan.js';
import { AssetFiles, PreparedScene, RenderOptions, probeVideo, prepareScene, renderFrame, renderVideo } from './render.js';
import { muxAudio } from './media.js';
import { runProcess } from './process.js';

async function renderingDependencies(): Promise<string> {
  const versions = new Set<string>();
  const visited = new Set<string>();
  const visit = async (name: string, from: string | URL, optional = false): Promise<void> => {
    const require = createRequire(from);
    for (const directory of require.resolve.paths(name) ?? []) {
      const path = join(directory, name, 'package.json');
      const bytes = await readFile(path).catch((error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return null;
        throw error;
      });
      if (!bytes) continue;
      if (visited.has(path)) return;
      visited.add(path);
      const pkg = JSON.parse(bytes.toString());
      versions.add(`${pkg.name}@${pkg.version}:${createHash('sha256').update(bytes).digest('hex')}`);
      for (const dependency of Object.keys(pkg.dependencies ?? {})) await visit(dependency, path);
      for (const dependency of Object.keys(pkg.optionalDependencies ?? {})) await visit(dependency, path, true);
      return;
    }
    if (!optional) throw new Error(`Missing rendering dependency: ${name}`);
  };
  for (const name of ['@resvg/resvg-js', '@resvg/resvg-wasm', '@napi-rs/canvas', 'fontkit', 'bidi-js', 'svg-pathdata', 'zod']) await visit(name, import.meta.url);
  return [...versions].sort().join('\n');
}

export interface RenderBackend {
  readonly identity: string;
  fingerprint?(): Promise<string>;
  preflight(plan: Plan, assets: AssetFiles, signal: AbortSignal): Promise<void>;
  chunk(plan: Plan, assets: AssetFiles, output: string, start: number, end: number, signal: AbortSignal): Promise<void>;
  finalize(plan: Plan, assets: AssetFiles, chunks: { path: string; start: number; end: number }[], output: string, signal: AbortSignal): Promise<void>;
}
export class NativeBackend implements RenderBackend {
  readonly identity: string;
  private cached?: { key: string; prepared: PreparedScene };
  private build?: Promise<string>;
  constructor(private options: Pick<RenderOptions, 'ffmpeg' | 'ffprobe' | 'rasterizer' | 'gpu'> = {}) { this.identity = options.rasterizer === 'gpu' ? 'portable-gpu-experimental-1/skia-143/metal/videotoolbox-h264' : `portable-experimental-1/resvg-2.6.2/${options.rasterizer ?? 'native'}`; }
  fingerprint(): Promise<string> {
    return this.build ??= (async () => {
      const hash = createHash('sha256').update(`${this.identity}/${process.platform}/${process.arch}/${process.version}`);
      for (const name of ['plan', 'text', 'render', 'media', 'process', 'backend', 'skia', 'skia-binding']) {
        const bytes = await readFile(new URL(`./${name}.js`, import.meta.url)).catch(() => readFile(new URL(`./${name}.ts`, import.meta.url)));
        hash.update(name).update(bytes);
      }
      hash.update(await renderingDependencies());
      if (this.options.rasterizer === 'gpu') {
        hash.update(await readFile(new URL('./gpu.js', import.meta.url)).catch(() => readFile(new URL('./gpu.ts', import.meta.url))));
        hash.update(await readFile(this.options.gpu?.executable ?? new URL('../native/target/release/helios-gpu', import.meta.url)));
        hash.update(JSON.stringify(this.options.gpu ?? {}));
      }
      for (const executable of [this.options.ffmpeg ?? 'ffmpeg', this.options.ffprobe ?? 'ffprobe']) hash.update(await runProcess(executable, ['-version'], { timeoutMs: 10000 }));
      return `${this.identity}/${hash.digest('hex')}`;
    })();
  }
  async preflight(plan: Plan, assets: AssetFiles, signal: AbortSignal): Promise<void> {
    signal.throwIfAborted();
    const prepared = await prepareScene(plan, assets, { ...this.options, signal }, true);
    if (this.options.rasterizer === 'gpu') {
      const { preflightGpuPlan } = await import('./gpu.js');
      await preflightGpuPlan(plan, { ...this.options, signal });
    } else await renderFrame(plan, 0, assets, { ...this.options, signal, prepared });
    await runProcess(this.options.ffmpeg ?? 'ffmpeg', ['-version'], { signal, timeoutMs: 10000 });
    this.cached = { key: JSON.stringify(plan), prepared };
  }
  async chunk(plan: Plan, assets: AssetFiles, output: string, start: number, end: number, signal: AbortSignal): Promise<void> {
    const key = JSON.stringify(plan);
    if (this.cached?.key !== key) this.cached = { key, prepared: await prepareScene(plan, assets, { ...this.options, signal }) };
    // One bounded compiled-scene cache. Per-render mutable maps are never shared.
    const prepared = { ...this.cached.prepared, text: new Map(this.cached.prepared.text), frames: new Map<string, Buffer>() };
    await renderVideo(plan, assets, output, { ...this.options, prepared, start, end, signal });
  }
  async finalize(plan: Plan, assets: AssetFiles, chunks: { path: string; start: number; end: number }[], output: string, signal: AbortSignal): Promise<void> {
    let next = 0;
    for (const chunk of chunks) {
      if (chunk.start !== next || chunk.end <= chunk.start) throw new RenderError('INVALID_CHUNKS', 'Chunk ranges are missing, duplicated or unordered', 500);
      const info = await probeVideo(chunk.path, { ...this.options, signal });
      if (info.frameCount !== chunk.end - chunk.start || info.width !== plan.width || info.height !== plan.height || info.codec !== 'h264' || info.fps.num * plan.fps.den !== plan.fps.num * info.fps.den) throw new RenderError('INVALID_CHUNKS', 'Chunk output does not match its manifest', 500);
      next = chunk.end;
    }
    if (next !== plan.frameCount) throw new RenderError('INVALID_CHUNKS', 'Chunk ranges do not cover the timeline', 500);
    const list = join(output.substring(0, output.lastIndexOf('/')), 'concat.txt');
    // Paths are service-generated, never request-provided ffconcat directives.
    const escape = (path: string) => path.replace(/'/g, "'\\''");
    await writeFile(list, 'ffconcat version 1.0\n' + chunks.map(c => `file '${escape(c.path)}'\nduration ${frameTime(plan.fps, c.end - c.start).toFixed(9)}\n`).join(''));
    const video = `${output}.video.mp4`;
    try {
      await runProcess(this.options.ffmpeg ?? 'ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c:v', 'copy', '-an', '-video_track_timescale', String(plan.fps.num), '-movflags', '+faststart', video], { signal, timeoutMs: 300000 });
      await muxAudio(plan, assets, video, output, { ...this.options, signal });
    } finally { await rm(video, { force: true }); }
    const info = await probeVideo(output, { ...this.options, signal });
    if (info.frameCount !== plan.frameCount || Math.abs(info.duration - frameTime(plan.fps, plan.frameCount)) > frameTime(plan.fps, 1)) throw new RenderError('INVALID_OUTPUT', 'Final video failed timeline verification', 500);
  }
}
