import { Resvg } from '@resvg/resvg-js';
import { availableParallelism } from 'node:os';
import { once } from 'node:events';
import { readFile, rm, open, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import type { Font } from 'fontkit';
import { layoutText, loadFont, TextLayout } from './text.js';
import { VideoInfo, VideoDecoder, videoInfo, wavInfo, activeVideos, muxAudio } from './media.js';
import { Plan, Node, Paint, Fps, RenderError, LIMITS, evaluate, resolveLength, frameTime, sampleCount } from './plan.js';
import { runProcess, startProcess } from './process.js';

export type AssetFiles = Map<string, string>;
export type Rasterizer = 'native' | 'wasm' | 'skia' | 'gpu';
export interface SoftwareEncoderOptions { preset?: 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium' | 'slow' | 'slower' | 'veryslow' | 'placebo'; crf?: number; threads?: number; gop?: number; bframes?: number; sceneCut?: boolean; qmin?: number; qmax?: number; qcompress?: number; maxQdiff?: number; colorConversion?: 'srgb-bt709' | 'rgb-bt601' }
export interface PreparedScene { fonts: Map<string, Font>; text: Map<string, TextLayout>; images: Map<string, Buffer>; videos: Map<string, VideoInfo>; frames: Map<string, Buffer> }
export interface RenderOptions { ffmpeg?: string; ffprobe?: string; signal?: AbortSignal; start?: number; end?: number; rasterizer?: Rasterizer; gpu?: import('./gpu.js').GpuOptions; prepared?: PreparedScene; videoOnly?: boolean; framesReady?: boolean; onFrame?: (index: number) => void | Promise<void> }
const xml = (s: string) => s.replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!);
export async function prepareScene(plan: Plan, assets: AssetFiles, options: RenderOptions = {}, checkCadence = false): Promise<PreparedScene> {
  const prepared: PreparedScene = { fonts: new Map(), text: new Map(), images: new Map(), videos: new Map(), frames: new Map() };
  let imagePixels = 0;
  for (const [id, asset] of Object.entries(plan.assets)) {
    const path = assets.get(id);
    if (!path) throw new RenderError('MISSING_ASSET', `Missing prepared asset ${id}`);
    const hash = createHash('sha256');
    for await (const bytes of createReadStream(path)) { options.signal?.throwIfAborted(); hash.update(bytes); }
    if ((await stat(path)).size !== asset.bytes || hash.digest('hex') !== asset.sha256) throw new RenderError('INVALID_ASSET', `Prepared asset ${id} failed its identity check`);
    if (asset.type === 'font') prepared.fonts.set(id, loadFont(await readFile(path)));
    if (asset.type === 'image') {
      const file = await open(path, 'r'), header = Buffer.alloc(24);
      try { await file.read(header, 0, header.length, 0); } finally { await file.close(); }
      const png = header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      if (!png && !(header[0] === 255 && header[1] === 216 && header[2] === 255)) throw new RenderError('UNSUPPORTED_MEDIA', 'Images must be PNG or JPEG');
      const info = JSON.parse((await runProcess(options.ffprobe ?? 'ffprobe', ['-v', 'error', '-protocol_whitelist', 'file,pipe', '-show_streams', '-of', 'json', path], { signal: options.signal, timeoutMs: 30000 })).toString()).streams[0];
      if (!info?.width || !info?.height || info.width * info.height > 16_000_000) throw new RenderError('RESOURCE_LIMIT', 'Decoded image exceeds 16 MP');
      imagePixels += info.width * info.height;
      if (imagePixels > LIMITS.decodedImagePixels) throw new RenderError('RESOURCE_LIMIT', 'Aggregate decoded images exceed 32 MP');
      if (info.side_data_list?.some((s: any) => s.rotation && s.rotation !== 0)) throw new RenderError('UNSUPPORTED_MEDIA', 'Normalize image orientation before submission');
      prepared.images.set(id, await readFile(path));
    }
    if (asset.type === 'video') prepared.videos.set(id, await videoInfo(path, options, checkCadence));
    if (asset.type === 'audio') await wavInfo(path);
  }
  const visit = (nodes: Node[], width: number, height: number) => {
    for (const node of nodes) {
      const w = resolveLength(node.width, width, 0, width), h = resolveLength(node.height, height, 0, height);
      if (node.type === 'text') prepared.text.set(node.id, layoutText(node, w, prepared.fonts));
      if (node.type === 'video') {
        const source = prepared.videos.get(node.asset!)!;
        if ((node.sourceStart ?? 0) + frameTime(plan.fps, (node.end ?? plan.frameCount) - (node.start ?? 0) - 1) >= source.duration) throw new RenderError('MEDIA_RANGE', `Node ${node.id}: video trim exceeds the source`);
      }
      if (node.children) visit(node.children, w - (node.layout?.padding ?? 0) * 2, h - (node.layout?.padding ?? 0) * 2);
    }
  };
  visit(plan.nodes, plan.width, plan.height);
  for (const track of plan.audio) {
    const source = await wavInfo(assets.get(track.asset)!);
    if (Math.round(track.sourceStart * 48000) + sampleCount(plan.fps, track.end) - sampleCount(plan.fps, track.start) > source.frames) throw new RenderError('MEDIA_RANGE', 'Audio trim exceeds the source');
  }
  return prepared;
}
export function frameSvg(plan: Plan, index: number, prepared?: PreparedScene): string {
  if (!Number.isInteger(index) || index < 0 || index >= plan.frameCount) throw new RenderError('INVALID_FRAME', 'Frame is outside the composition');
  const definitions: string[] = [];
  const paint = (fill: Paint | undefined, id: string) => {
    if (!fill) return '#000000';
    if (typeof fill === 'string') return fill;
    definitions.push(`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${fill.x1}" y1="${fill.y1}" x2="${fill.x2}" y2="${fill.y2}">${fill.stops.map(s => `<stop offset="${s.offset}" stop-color="${s.color}"/>`).join('')}</linearGradient>`);
    return `url(#${id})`;
  };
  const draw = (n: Node, parentWidth: number, parentHeight: number, layoutX = 0, layoutY = 0): string => {
    if (index < (n.start ?? 0) || index >= (n.end ?? plan.frameCount)) return '';
    const width = resolveLength(n.width, parentWidth, index, parentWidth), height = resolveLength(n.height, parentHeight, index, parentHeight);
    const x = resolveLength(n.x, parentWidth, index) + layoutX, y = resolveLength(n.y, parentHeight, index) + layoutY;
    const t = n.transform;
    const transform = `translate(${x} ${y}) translate(${t?.originX ?? 0} ${t?.originY ?? 0}) rotate(${evaluate(t?.rotation ?? 0, index)}) scale(${evaluate(t?.scaleX ?? 1, index)} ${evaluate(t?.scaleY ?? 1, index)}) translate(${-(t?.originX ?? 0)} ${-(t?.originY ?? 0)})`;
    let clipping = '';
    if (n.clip) {
      const clip = n.clip.type === 'rect' ? `<rect width="${n.clip.width}" height="${n.clip.height}" rx="${n.clip.radius ?? 0}"/>` : `<path d="${xml(n.clip.d)}"/>`;
      definitions.push(`<clipPath id="clip_${n.id}">${clip}</clipPath>`);
      clipping = ` clip-path="url(#clip_${n.id})"`;
    }
    const style = `fill="${paint(n.fill, `paint_${n.id}`)}"${n.stroke ? ` stroke="${n.stroke.color}" stroke-width="${n.stroke.width}"` : ''}`;
    let content: string;
    switch (n.type) {
      case 'rect': content = `<rect width="${width}" height="${height}" rx="${n.radius ?? 0}" ${style}/>`; break;
      case 'ellipse': content = `<ellipse cx="${width / 2}" cy="${height / 2}" rx="${width / 2}" ry="${height / 2}" ${style}/>`; break;
      case 'path': content = `<path d="${xml(n.d!)}" ${style}/>`; break;
      case 'text': {
        if (!prepared) throw new RenderError('MISSING_FONT', `Node ${n.id}: text requires prepared fonts`);
        let text = prepared.text.get(n.id);
        if (!text || text.width !== width) { text = layoutText(n, width, prepared.fonts); prepared.text.set(n.id, text); }
        content = `<g ${style}>${text.svg}</g>`;
        break;
      }
      case 'image': content = `<image xlink:href="https://assets.invalid/asset_${n.asset}" width="${width}" height="${height}" preserveAspectRatio="${n.fit === 'fill' ? 'none' : n.fit === 'contain' ? 'xMidYMid meet' : 'xMidYMid slice'}"/>`; break;
      case 'video': content = `<image xlink:href="https://assets.invalid/video_${n.id}" width="${width}" height="${height}" preserveAspectRatio="${n.fit === 'fill' ? 'none' : n.fit === 'contain' ? 'xMidYMid meet' : 'xMidYMid slice'}"/>`; break;
      case 'group': {
        const l = n.layout, padding = l?.padding ?? 0;
        let cursor = padding;
        content = n.children!.map(child => {
          const cw = resolveLength(child.width, width - padding * 2, index, width - padding * 2), ch = resolveLength(child.height, height - padding * 2, index, height - padding * 2);
          let cx = 0, cy = 0;
          if (l) {
            const crossSpace = l.direction === 'row' ? height - padding * 2 - ch : width - padding * 2 - cw;
            const cross = padding + (l.align === 'center' ? crossSpace / 2 : l.align === 'end' ? crossSpace : 0);
            cx = l.direction === 'row' ? cursor : cross; cy = l.direction === 'column' ? cursor : cross;
            cursor += (l.direction === 'row' ? cw : ch) + (l.gap ?? 0);
          }
          return draw(child, width - padding * 2, height - padding * 2, cx, cy);
        }).join('');
        break;
      }
      default: throw new RenderError('UNSUPPORTED_NODE', `Node ${n.id}: ${n.type} requires prepared assets`);
    }
    return `<g transform="${transform}" opacity="${evaluate(n.opacity ?? 1, index)}"${clipping}>${content}</g>`;
  };
  const content = plan.nodes.map(n => draw(n, plan.width, plan.height)).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${plan.width}" height="${plan.height}" viewBox="0 0 ${plan.width} ${plan.height}"><defs>${definitions.join('')}</defs><rect width="100%" height="100%" fill="${plan.background}"/>${content}</svg>`;
}
let wasmReady: Promise<typeof import('@resvg/resvg-wasm')> | undefined;
const skiaScenes = new WeakMap<PreparedScene, Promise<import('./skia.js').SkiaRasterizer>>();
export async function renderFrame(plan: Plan, index: number, assets: AssetFiles, options: RenderOptions = {}): Promise<{ pixels: Buffer; png: Buffer; svg: string }> {
  return rasterize(plan, index, assets, options, true);
}
async function rasterize(plan: Plan, index: number, assets: AssetFiles, options: RenderOptions, encodePng: boolean): Promise<{ pixels: Buffer; png: Buffer; svg: string }> {
  if (options.rasterizer === 'gpu') {
    const { renderGpuPlanFrame } = await import('./gpu.js');
    return renderGpuPlanFrame(plan, index, assets, options);
  }
  const prepared = options.prepared ?? await prepareScene(plan, assets, options);
  if (!options.framesReady) {
    prepared.frames.clear();
    for (const node of activeVideos(plan, index)) {
      const info = prepared.videos.get(node.asset!)!;
      const sourceIndex = Math.floor(((node.sourceStart ?? 0) + frameTime(plan.fps, index - (node.start ?? 0))) * info.fps.num / info.fps.den + 1e-7);
      const decoder = new VideoDecoder(assets.get(node.asset!)!, sourceIndex, info, { ...options, format: options.rasterizer === 'skia' ? 'rgba' : 'png' });
      try { prepared.frames.set(node.id, await decoder.frame(sourceIndex)); } finally { await decoder.close(); }
    }
  }
  if (options.rasterizer === 'skia') {
    let pending = skiaScenes.get(prepared);
    if (!pending) {
      pending = (async () => { const { SkiaRasterizer } = await import('./skia.js'); const scene = new SkiaRasterizer(plan, prepared); await scene.prepare(); return scene; })();
      skiaScenes.set(prepared, pending);
    }
    const scene = await pending, active = activeVideos(plan, index);
    scene.retainVideos(new Set(active.map(node => node.id)));
    for (const node of active) { const info = prepared.videos.get(node.asset!)!; scene.setVideo(node.id, prepared.frames.get(node.id)!, info.width, info.height); }
    return { ...scene.render(index, encodePng), svg: encodePng ? frameSvg(plan, index, prepared) : '' };
  }
  const svg = frameSvg(plan, index, prepared);
  // resvg returns these inert identifiers to our resolver; it never fetches them.
  const image = (href: string) => { const name = href.slice('https://assets.invalid/'.length); return name.startsWith('video_') ? prepared.frames.get(name.slice(6)) : prepared.images.get(name.slice(6)); };
  if (options.rasterizer === 'wasm') {
    wasmReady ??= (async () => {
      const module = await import('@resvg/resvg-wasm');
      const bytes = await readFile(createRequire(import.meta.url).resolve('@resvg/resvg-wasm/index_bg.wasm'));
      await module.initWasm(bytes); return module;
    })();
    const { Resvg: WasmResvg } = await wasmReady;
    const renderer = new WasmResvg(svg, { font: { fontBuffers: [] } });
    try {
      for (const href of renderer.imagesToResolve()) { const bytes = image(String(href)); if (!bytes) throw new RenderError('MISSING_ASSET', 'Image data is unavailable'); renderer.resolveImage(href, bytes); }
      const result = renderer.render();
      try { return { pixels: Buffer.from(result.pixels), png: encodePng ? Buffer.from(result.asPng()) : Buffer.alloc(0), svg }; } finally { result.free(); }
    } finally { renderer.free(); }
  }
  const resvg = new Resvg(svg, { font: { loadSystemFonts: false }, logLevel: 'off' });
  for (const href of resvg.imagesToResolve()) { const bytes = image(href); if (!bytes) throw new RenderError('MISSING_ASSET', 'Image data is unavailable'); resvg.resolveImage(href, bytes); }
  const result = resvg.render();
  return { pixels: result.pixels, png: encodePng ? result.asPng() : Buffer.alloc(0), svg };
}
export async function renderVideo(plan: Plan, assets: AssetFiles, output: string, options: RenderOptions = {}): Promise<void> {
  if (!options.videoOnly && options.start === undefined && options.end === undefined) {
    const temporary = `${output}.video.mp4`;
    try {
      await renderVideo(plan, assets, temporary, { ...options, videoOnly: true });
      await muxAudio(plan, assets, temporary, output, options);
      const info = await probeVideo(output, options);
      if (info.frameCount !== plan.frameCount || info.audioCodec !== 'aac') throw new RenderError('INVALID_OUTPUT', 'Final export failed verification', 500);
    } finally { await rm(temporary, { force: true }); }
    return;
  }
  const start = options.start ?? 0, end = options.end ?? plan.frameCount;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end > plan.frameCount || end <= start) throw new RenderError('INVALID_RANGE', 'Invalid half-open frame range');
  if (options.rasterizer === 'gpu') {
    const { renderGpuPlanVideo } = await import('./gpu.js');
    await renderGpuPlanVideo(plan, assets, output, options); return;
  }
  const prepared = options.prepared ?? await prepareScene(plan, assets, options);
  const decoders = new Map<string, VideoDecoder>();
  const process = startProcess(options.ffmpeg ?? 'ffmpeg', videoEncoderArgs(plan, end - start, output), { signal: options.signal, timeoutMs: 300000 });
  process.child.stdout.resume();
  try {
    for (let index = start; index < end; index++) {
      options.signal?.throwIfAborted();
      const active = activeVideos(plan, index);
      for (const [id, decoder] of decoders) if (!active.some(n => n.id === id)) { await decoder.close(); decoders.delete(id); prepared.frames.delete(id); }
      for (const node of active) {
        const info = prepared.videos.get(node.asset!)!;
        const sourceIndex = Math.floor(((node.sourceStart ?? 0) + frameTime(plan.fps, index - (node.start ?? 0))) * info.fps.num / info.fps.den + 1e-7);
        let decoder = decoders.get(node.id);
        if (!decoder) { decoder = new VideoDecoder(assets.get(node.asset!)!, sourceIndex, info, { ...options, format: options.rasterizer === 'skia' ? 'rgba' : 'png' }); decoders.set(node.id, decoder); }
        prepared.frames.set(node.id, await decoder.frame(sourceIndex));
      }
      const frame = await rasterize(plan, index, assets, { ...options, prepared, framesReady: true }, false);
      if (!process.child.stdin.write(frame.pixels)) await Promise.race([once(process.child.stdin, 'drain'), process.done.then(() => { throw new RenderError('MEDIA_PROCESS', 'Encoder exited before all frames were written'); })]);
      await options.onFrame?.(index);
    }
    process.child.stdin.end();
    await process.done;
  } catch (error) { process.kill(); await process.done.catch(() => {}); throw error; }
  finally { await Promise.all([...decoders.values()].map(d => d.close())); }
  const info = await probeVideo(output, options);
  if (info.frameCount !== end - start || info.width !== plan.width || info.height !== plan.height) throw new RenderError('INVALID_OUTPUT', 'Encoded output does not match the frame contract', 500);
}
/** Shared software-encoder settings for the runtime and controlled capture benchmark. */
export function videoEncoderArgs(plan: Plan, frames: number, output: string, input: 'rgba' | 'png' = 'rgba', encoder: SoftwareEncoderOptions = {}): string[] {
  const { preset = 'fast', threads = 2, crf = 18, gop = 90, bframes = 0, sceneCut = false } = encoder;
  if (!['ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium', 'slow', 'slower', 'veryslow', 'placebo'].includes(preset) || !Number.isInteger(threads) || threads < 1 || threads > 64 || !Number.isFinite(crf) || crf < 0 || crf > 51 || !Number.isInteger(gop) || gop < 1 || gop > 18000 || !Number.isInteger(bframes) || bframes < 0 || bframes > 16 || typeof sceneCut !== 'boolean') throw new RenderError('INVALID_ENCODER', 'Invalid software encoder settings');
  const extra: string[] = [];
  for (const [flag, value, min, max, integer] of [
    ['-qmin', encoder.qmin, 0, 69, true], ['-qmax', encoder.qmax, 0, 69, true], ['-qcomp', encoder.qcompress, 0, 1, false], ['-qdiff', encoder.maxQdiff, 0, 69, true],
  ] as const) if (value !== undefined) {
    if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) throw new RenderError('INVALID_ENCODER', 'Invalid software encoder quantization settings');
    extra.push(flag, String(value));
  }
  if (encoder.qmin !== undefined && encoder.qmax !== undefined && encoder.qmin > encoder.qmax) throw new RenderError('INVALID_ENCODER', 'Minimum quantizer exceeds maximum');
  const conversion = encoder.colorConversion ?? 'srgb-bt709';
  if (!['srgb-bt709', 'rgb-bt601'].includes(conversion)) throw new RenderError('INVALID_ENCODER', 'Unsupported color conversion');
  const filter = conversion === 'srgb-bt709' ? 'scale=out_color_matrix=bt709:out_range=pc,format=yuv444p,colorspace=ispace=bt709:iprimaries=bt709:itrc=srgb:irange=pc:all=bt709:range=tv:format=yuv420p' : 'scale=out_color_matrix=bt601:out_range=tv,format=yuv420p';
  // The explicit BT.601 mode preserves RGB component values without changing
  // transfer/primaries, matching legacy RGB-to-YUV pipelines such as fframes.
  const tags = conversion === 'srgb-bt709' ? ['-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709'] : ['-colorspace', 'smpte170m'];
  return ['-hide_banner', '-loglevel', 'error', '-y', '-filter_threads', '1', ...(input === 'rgba' ? ['-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${plan.width}x${plan.height}`] : ['-f', 'image2pipe', '-c:v', 'png']), '-r', `${plan.fps.num}/${plan.fps.den}`, '-i', 'pipe:0', '-an', '-vf', filter, '-c:v', 'libx264', '-preset', preset, '-threads', String(threads), '-crf', String(crf), '-pix_fmt', 'yuv420p', ...tags, '-color_range', 'tv', '-bf', String(bframes), '-g', String(gop), '-sc_threshold', sceneCut ? '40' : '0', ...extra, '-video_track_timescale', String(plan.fps.num), '-frames:v', String(frames), '-movflags', '+faststart', output];
}
export async function probeVideo(path: string, options: Pick<RenderOptions, 'ffprobe' | 'signal'> = {}): Promise<{ frameCount: number; width: number; height: number; fps: Fps; codec: string; duration: number; audioCodec?: string }> {
  return probeVideoCount(path, options, false);
}
/** For freshly encoded H.264 chunks only; delivery still requires full decode verification. */
export async function probeEncodedChunk(path: string, options: Pick<RenderOptions, 'ffprobe' | 'signal'> = {}) {
  return probeVideoCount(path, options, true);
}
async function probeVideoCount(path: string, options: Pick<RenderOptions, 'ffprobe' | 'signal'>, packets: boolean) {
  const output = await runProcess(options.ffprobe ?? 'ffprobe', ['-v', 'error', '-threads', packets ? '1' : String(Math.min(8, availableParallelism())), packets ? '-count_packets' : '-count_frames', '-show_streams', '-show_format', '-of', 'json', path], { signal: options.signal, timeoutMs: 300000 });
  const info = JSON.parse(output.toString());
  const video = info.streams?.find((s: { codec_type: string }) => s.codec_type === 'video');
  if (!video) throw new RenderError('INVALID_OUTPUT', 'Output contains no video stream', 500);
  const [num, den] = video.avg_frame_rate.split('/').map(Number);
  return { frameCount: Number(packets ? video.nb_read_packets : video.nb_read_frames), width: video.width, height: video.height, fps: { num, den }, codec: video.codec_name, duration: Number(video.duration ?? info.format.duration), audioCodec: info.streams.find((s: { codec_type: string }) => s.codec_type === 'audio')?.codec_name };
}
