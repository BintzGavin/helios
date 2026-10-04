import { once } from 'node:events';
import { mkdir, mkdtemp, rename, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SKRSContext2D } from './skia-binding.js';
import type { CanvasComposition, CanvasRenderOptions } from './canvas.js';
import { frameTime, parsePlan, RenderError, LIMITS } from './plan.js';
import { probeVideo, prepareScene, frameSvg, type AssetFiles, type RenderOptions } from './render.js';
import type { Plan } from './plan.js';
import { runProcess, startProcess } from './process.js';
import { loadFont } from './text.js';
import { createCanvas, ImageData } from './skia-binding.js';
import { BinaryCommands, JsonCommands, GPU_LIMITS, resourceLimit, type CommandSink, type Color } from './gpu-commands.js';
export { GPU_LIMITS, type GpuCommand } from './gpu-commands.js';

export interface GpuOptions {
  backend?: 'metal' | 'vulkan'; codec?: 'h264' | 'hevc'; bitrate?: number;
  /** Maximum keyframe interval, 1..300. Defaults to 90. */
  gop?: number;
  /** 1 preserves serial submission; 3 enables bounded encoder overlap. */
  encoderPool?: 1 | 3;
  /** Canvas defaults to binary command transport; JSON remains a fidelity control. */
  transport?: 'binary' | 'json';
  /** Trusted worker executable, never a JSON scene field. */
  executable?: string;
  /** Optional task-owned transfer receipts and Metal capture, outside the repository. */
  trace?: string; capture?: string;
}
export interface GpuTimings { preflightMs: number; nativeProcessMs: number; muxMs: number; verificationMs: number }
export interface GpuCanvasOptions extends CanvasRenderOptions, GpuOptions { onTimings?: (timings: GpuTimings) => void }
function serializeMessage(message: unknown, limit = GPU_LIMITS.frameBytes): string {
  const line = JSON.stringify(message);
  if (Buffer.byteLength(line) > limit) resourceLimit();
  return line;
}

export function validateGpuOptions(options: GpuOptions): void {
  if ((options.backend ?? 'metal') !== 'metal') throw new RenderError('GPU_UNSUPPORTED', 'Vulkan encoder surface interoperability is not implemented');
  if (options.codec !== undefined && options.codec !== 'h264' && options.codec !== 'hevc') throw new RenderError('GPU_UNSUPPORTED', 'Unsupported GPU codec; expected H.264 or HEVC');
  const bitrate = options.bitrate ?? 20_000_000;
  if (!Number.isSafeInteger(bitrate) || bitrate < 100_000 || bitrate > 1_000_000_000) throw new RenderError('INVALID_ENCODER', 'Invalid GPU bitrate; expected100,000..1,000,000,000bps');
  const gop = options.gop ?? 90;
  if (!Number.isSafeInteger(gop) || gop < 1 || gop > 300) throw new RenderError('INVALID_ENCODER', 'Invalid GPU GOP; expected an integer from 1 to 300');
  if ((options.encoderPool ?? 1) !== 1 && options.encoderPool !== 3) throw new RenderError('INVALID_ENCODER', 'Invalid GPU encoder pool; expected 1 or 3');
  if (options.transport !== undefined && options.transport !== 'binary' && options.transport !== 'json') throw new RenderError('GPU_UNSUPPORTED', 'Invalid GPU command transport');
  if (process.platform !== 'darwin' || process.arch !== 'arm64') throw new RenderError('GPU_UNSUPPORTED', 'Metal GPU encoding requires macOS arm64');
}

function color(value: unknown, alpha: number): Color {
  if (typeof value !== 'string' || !/^#[\da-f]{6}$/i.test(value)) throw new RenderError('GPU_UNSUPPORTED_CANVAS', 'GPU paint requires an explicit six-digit RGB color');
  return [parseInt(value.slice(1, 3), 16) / 255, parseInt(value.slice(3, 5), 16) / 255, parseInt(value.slice(5, 7), 16) / 255, alpha];
}

function wellFormed(value: string): boolean {
  for (const character of value) { const code = character.codePointAt(0)!; if (code >= 0xd800 && code <= 0xdfff) return false; }
  return true;
}

/** Records a deliberately bounded Canvas subset; unsupported operations fail explicitly. */
export async function recordGpuCanvas(composition: CanvasComposition, index: number) {
  const sink = new JsonCommands();
  const background = await recordCommands(composition, index, sink);
  const frame = { background, commands: sink.commands };
  serializeMessage(frame);
  return frame;
}

export async function recordGpuCanvasBinary(composition: CanvasComposition, index: number, initialBytes = 1024): Promise<Buffer> {
  const sink = new BinaryCommands(initialBytes);
  return sink.finish(await recordCommands(composition, index, sink));
}

async function recordCommands(composition: CanvasComposition, index: number, sink: CommandSink): Promise<Color> {
  if (!Number.isInteger(index) || index < 0 || index >= composition.frameCount) throw new RenderError('INVALID_FRAME', 'Frame is outside the composition');
  let state = { fillStyle: '#000000', globalAlpha: 1, font: '', textBaseline: 'alphabetic' };
  let matrix = [1, 0, 0, 1, 0, 0];
  const stack: { state: typeof state; matrix: number[] }[] = [];
  let pathMatrix: number[] | undefined, pathX = 0, pathY = 0, pathRadius = 0;
  let characters = 0;
  const colors = new Map<string, Color>();
  const paint = () => {
    let parsed = colors.get(state.fillStyle);
    if (!parsed) { parsed = color(state.fillStyle, 1); if (colors.size < 1024) colors.set(state.fillStyle, parsed); }
    parsed[3] = state.globalAlpha; return parsed;
  };
  const fonts: Record<string, string> = Object.create(null);
  for (const name of Object.keys(composition.fonts ?? {})) fonts[name] = name;
  const unsupported = () => { throw new RenderError('GPU_UNSUPPORTED_CANVAS', 'Canvas operation is outside the native GPU subset'); };
  const numeric = (values: number[]) => { if (values.some(value => !Number.isFinite(value) || Math.abs(value) > 1e7)) throw new RenderError('INVALID_COMPOSITION', 'Invalid GPU drawing coordinate'); return values; };
  const coordinate = (value: number) => { if (!Number.isFinite(value) || Math.abs(value) > 1e7) throw new RenderError('INVALID_COMPOSITION', 'Invalid GPU drawing coordinate'); };
  const transform = (right: number[]) => {
    const [a, b, c, d, e, f] = matrix, [g, h, i, j, k, l] = right;
    matrix = numeric([a * g + c * h, b * g + d * h, a * i + c * j, b * i + d * j, a * k + c * l + e, b * k + d * l + f]);
  };
  const methods: Record<string, (...args: any[]) => unknown> = {
    fillRect: (x: number, y: number, width: number, height: number) => {
      coordinate(x); coordinate(y); coordinate(width); coordinate(height);
      x = width < 0 ? x + width : x; y = height < 0 ? y + height : y; coordinate(x); coordinate(y);
      sink.rect(x, y, Math.abs(width), Math.abs(height), paint());
    },
    fillText: (text: string, x: number, y: number, maxWidth?: number) => {
      const match = /^(\d+(?:\.\d+)?)px (.+)$/.exec(state.font);
      if (!match || !Object.hasOwn(fonts, match[2]) || state.textBaseline !== 'alphabetic' || maxWidth !== undefined || typeof text !== 'string') unsupported();
      characters += text.length; if (characters > LIMITS.textCharacters) resourceLimit();
      if (!wellFormed(text) || !wellFormed(match![2])) unsupported();
      const size = Number(match![1]); if (!Number.isFinite(size) || size <= 0 || size > 4096) unsupported();
      coordinate(x); coordinate(y); sink.text(text, x, y, match![2], size, paint());
    },
    beginPath: () => { pathMatrix = undefined; },
    arc: (x: number, y: number, radius: number, start: number, end: number, anticlockwise = false) => {
      coordinate(x); coordinate(y); coordinate(radius); coordinate(start); coordinate(end);
      if (radius < 0) throw new RenderError('INVALID_COMPOSITION', 'Negative GPU circle radius');
      if (pathMatrix || typeof anticlockwise !== 'boolean' || (anticlockwise ? start - end : end - start) < Math.PI * 2) return unsupported();
      pathX = x; pathY = y; pathRadius = radius; pathMatrix = matrix;
    },
    closePath: () => {},
    fill: (rule: unknown = 'nonzero') => {
      if (rule !== 'nonzero' && rule !== 'evenodd') return unsupported();
      if (pathMatrix && pathRadius > 0) sink.circle(pathX, pathY, pathRadius, pathMatrix, paint());
    },
    save: () => { if (stack.length >= GPU_LIMITS.stack) resourceLimit(); stack.push({ state: { ...state }, matrix }); sink.stack('save'); },
    restore: () => { const previous = stack.pop(); if (previous) { state = previous.state; matrix = previous.matrix; sink.stack('restore'); } },
    translate: (x: number, y: number) => { numeric([x, y]); transform([1, 0, 0, 1, x, y]); sink.transform('translate', x, y); },
    scale: (x: number, y: number) => { numeric([x, y]); transform([x, 0, 0, y, 0, 0]); sink.transform('scale', x, y); },
    rotate: (radians: number) => { numeric([radians]); const c = Math.cos(radians), s = Math.sin(radians); transform([c, s, -s, c, 0, 0]); sink.transform('rotate', radians); },
  };
  const context = new Proxy(Object.create(null), {
    get: (_target, property) => typeof property === 'string' && Object.hasOwn(methods, property) ? methods[property] : typeof property === 'string' && Object.hasOwn(state, property) ? state[property as keyof typeof state] : unsupported(),
    set: (_target, property, value) => {
      if (typeof property !== 'string' || !Object.hasOwn(state, property)) return unsupported();
      if (property === 'globalAlpha') { if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) throw new RenderError('INVALID_COMPOSITION', 'Invalid GPU alpha'); }
      else if (typeof value !== 'string') return unsupported();
      (state as Record<string, unknown>)[property] = value; return true;
    },
  }) as SKRSContext2D;
  await composition.draw(context, { index, time: frameTime(composition.fps, index), fonts: Object.freeze(fonts) });
  return color(composition.background ?? '#000000', 1);
}

export async function renderGpuCanvasVideo(composition: CanvasComposition, output: string, options: GpuCanvasOptions = {}): Promise<void> {
  options.signal?.throwIfAborted();
  const plan = parsePlan({ version: 'portable-v1', width: composition.width, height: composition.height, fps: composition.fps, frameCount: composition.frameCount, nodes: [] });
  const start = options.start ?? 0, end = options.end ?? plan.frameCount;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end > plan.frameCount || end <= start) throw new RenderError('INVALID_RANGE', 'Invalid half-open GPU frame range');
  validateGpuOptions(options);
  if (options.encoder) throw new RenderError('INVALID_ENCODER', 'Software x264 options cannot configure VideoToolbox');
  const fontBytes = Object.values(composition.fonts ?? {});
  if (fontBytes.length > LIMITS.assets || fontBytes.some(bytes => !(bytes instanceof Uint8Array)) || fontBytes.reduce((sum, bytes) => sum + bytes.length, 0) > LIMITS.fontBytes) throw new RenderError('RESOURCE_LIMIT', 'GPU font bytes exceed the resource envelope');
  for (const bytes of fontBytes) loadFont(bytes);
  const binary = (options.transport ?? 'binary') === 'binary';
  let initialBytes = 1024;
  await encodeGpuMessages(plan, composition.fonts ?? {}, async index => {
    if (!binary) return recordGpuCanvas(composition, index);
    const packet = await recordGpuCanvasBinary(composition, index, initialBytes); initialBytes = packet.byteLength; return packet;
  }, output, options);
}

export async function renderGpuPlanVideo(plan: Plan, assets: AssetFiles, output: string, options: RenderOptions): Promise<void> {
  validateGpuPlan(plan);
  const prepared = options.prepared ?? await prepareScene(plan, assets, options);
  await encodeGpuMessages(plan, {}, async index => ({ svg: frameSvg(plan, index, prepared) }), output, { ...options, ...options.gpu });
}

function validateGpuPlan(plan: Plan): void {
  const visit = (nodes: Plan['nodes']): void => { for (const node of nodes) { if (node.type === 'video' || node.type === 'image') throw new RenderError('GPU_UNSUPPORTED_MEDIA', 'GPU scene media upload/decoding is not implemented; select a retained CPU backend'); if (node.children) visit(node.children); } };
  visit(plan.nodes);
}

export async function preflightGpuPlan(plan: Plan, options: RenderOptions): Promise<void> {
  options.signal?.throwIfAborted(); validateGpuOptions(options.gpu ?? {}); validateGpuPlan(plan);
  if (plan.width % 2 || plan.height % 2 || plan.width > 4096 || plan.height > 4096) throw new RenderError('GPU_UNSUPPORTED', 'GPU surface dimensions must be even and at most 4096');
  await probeGpu(options.gpu?.executable ?? fileURLToPath(new URL('../native/target/release/helios-gpu', import.meta.url)), { ...options, ...options.gpu });
}

async function probeGpu(executable: string, options: GpuCanvasOptions): Promise<void> {
  const hevc = options.codec === 'hevc';
  const bytes = await runProcess(executable, hevc ? ['probe', 'hevc'] : ['probe'], { signal: options.signal, timeoutMs: 30000, maxBytes: 8192 });
  if (hevc) {
    let result;
    try { result = JSON.parse(bytes.toString()); } catch { throw new RenderError('INVALID_OUTPUT', 'Native HEVC capability receipt is invalid'); }
    if (result.protocol !== 6 || result.codec !== 'hevc' || result.encoder !== 'videotoolbox' || result.hardwareRequired !== true || result.hardwareUsed !== true) throw new RenderError('INVALID_OUTPUT', 'Native HEVC capability does not match required hardware codec');
  }
}

/** Explicit lossless readback for the existing pixel-returning API, never the hardware video lane. */
export async function renderGpuPlanFrame(plan: Plan, index: number, assets: AssetFiles, options: RenderOptions): Promise<{ pixels: Buffer; png: Buffer; svg: string }> {
  options.signal?.throwIfAborted(); validateGpuOptions(options.gpu ?? {}); validateGpuPlan(plan);
  const prepared = options.prepared ?? await prepareScene(plan, assets, options);
  const svg = frameSvg(plan, index, prepared);
  const worker = startProcess(options.gpu?.executable ?? fileURLToPath(new URL('../native/target/release/helios-gpu', import.meta.url)), ['raster', String(plan.width), String(plan.height), String(plan.fps.num), String(plan.fps.den), '1000000', '/unused'], { signal: options.signal, timeoutMs: 30000 });
  const chunks: Buffer[] = []; let bytes = 0;
  worker.child.stdout.on('data', (chunk: Buffer) => { bytes += chunk.length; if (bytes > plan.width * plan.height * 4) worker.kill(); else chunks.push(chunk); });
  worker.child.stdin.end(JSON.stringify({ fonts: {} }) + '\n' + JSON.stringify({ svg }) + '\n');
  await worker.done;
  if (bytes !== plan.width * plan.height * 4) throw new RenderError('INVALID_OUTPUT', 'GPU lossless readback size does not match the frame');
  const pixels = Buffer.concat(chunks), canvas = createCanvas(plan.width, plan.height);
  canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(pixels.buffer, pixels.byteOffset, pixels.byteLength), plan.width, plan.height), 0, 0);
  return { pixels, png: canvas.toBuffer('image/png'), svg };
}

async function encodeGpuMessages(plan: Plan, fonts: Record<string, Uint8Array>, frame: (index: number) => Promise<unknown>, output: string, options: GpuCanvasOptions): Promise<void> {
  const preflightStarted = performance.now();
  options.signal?.throwIfAborted();
  validateGpuOptions(options);
  const start = options.start ?? 0, end = options.end ?? plan.frameCount;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end > plan.frameCount || end <= start) throw new RenderError('INVALID_RANGE', 'Invalid half-open GPU frame range');
  if (plan.width % 2 || plan.height % 2 || plan.width > 4096 || plan.height > 4096) throw new RenderError('GPU_UNSUPPORTED', 'GPU surface dimensions must be even and at most 4096');
  // Reject unsupported drawing before opening a device or touching the destination.
  const first = await frame(start);
  const binary = Buffer.isBuffer(first);
  const executable = options.executable ?? fileURLToPath(new URL('../native/target/release/helios-gpu', import.meta.url));
  await probeGpu(executable, options);
  const preflightMs = performance.now() - preflightStarted;
  const destination = resolve(output);
  await mkdir(dirname(destination), { recursive: true });
  const directory = await mkdtemp(join(dirname(destination), '.helios-gpu-'));
  try {
    const codec = options.codec ?? 'h264';
    const elementary = join(directory, `video.${codec}`), staged = join(directory, 'video.mp4');
    const nativeStarted = performance.now();
    const worker = startProcess(executable, [binary ? 'encode-binary' : 'encode', String(plan.width), String(plan.height), String(plan.fps.num), String(plan.fps.den), String(options.bitrate ?? 20_000_000), elementary, options.trace ?? '', options.capture ?? '', String(options.gop ?? 90), String(options.encoderPool ?? 1), ...(codec === 'hevc' ? ['hevc'] : [])], { signal: options.signal, timeoutMs: 300000 });
    let receipt = '';
    worker.child.stdout.on('data', (bytes: Buffer) => { receipt += bytes.toString(); if (receipt.length > 8192) worker.kill(); });
    const send = async (message: unknown, limit = GPU_LIMITS.frameBytes) => {
      const bytes = Buffer.isBuffer(message) ? message : serializeMessage(message, limit) + '\n';
      if (Buffer.isBuffer(bytes) && bytes.length > limit) resourceLimit();
      if (!worker.child.stdin.write(bytes)) await Promise.race([once(worker.child.stdin, 'drain'), worker.done.then(() => { throw new RenderError('GPU_PROCESS', 'GPU helper stopped before receiving all frames'); })]);
    };
    try {
      if (Object.values(fonts).reduce((sum, bytes) => sum + bytes.byteLength, 0) > LIMITS.fontBytes) resourceLimit();
      await send({ fonts: Object.fromEntries(Object.entries(fonts).map(([name, bytes]) => [name, Buffer.from(bytes).toString('base64')])) }, GPU_LIMITS.fontHeaderBytes);
      for (let index = start; index < end; index++) {
        options.signal?.throwIfAborted();
        await send(index === start ? first : await frame(index));
        await options.onFrame?.(index);
      }
      worker.child.stdin.end(); await worker.done;
      const result = JSON.parse(receipt);
      if (result.frames !== end - start || result.encoder !== 'videotoolbox' || (result.codec ?? 'h264') !== codec || result.protocol !== (codec === 'hevc' ? (binary ? 7 : 6) : (binary ? 5 : 4)) || result.transport !== (binary ? 'binary' : 'json') || result.gop !== (options.gop ?? 90) || result.encoderPool !== (options.encoderPool ?? 1) || result.bitrate !== (options.bitrate ?? 20_000_000) || result.configuredBitrate !== result.bitrate || (codec === 'hevc' && (result.hardwareRequired !== true || result.hardwareUsed !== true))) throw new RenderError('INVALID_OUTPUT', 'Native GPU receipt does not match the requested range/codec/protocol/transport/GOP/pool/bitrate/hardware');
    } catch (error) { worker.kill(); await worker.done.catch(() => {}); throw error; }
    const nativeProcessMs = performance.now() - nativeStarted, muxStarted = performance.now();
    await runProcess(options.ffmpeg ?? 'ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-r', `${plan.fps.num}/${plan.fps.den}`, '-f', codec, '-i', elementary, '-c:v', 'copy', ...(codec === 'hevc' ? ['-tag:v', 'hvc1'] : []), '-an', '-video_track_timescale', String(plan.fps.num), '-movflags', '+faststart', staged], { signal: options.signal, timeoutMs: 300000 });
    const muxMs = performance.now() - muxStarted, verifyStarted = performance.now();
    const info = await probeVideo(staged, options);
    if (info.codec !== codec || info.frameCount !== end - start || info.width !== plan.width || info.height !== plan.height || info.fps.num * plan.fps.den !== plan.fps.num * info.fps.den) throw new RenderError('INVALID_OUTPUT', 'Hardware video failed codec, count, dimensions or cadence verification');
    options.onTimings?.({ preflightMs, nativeProcessMs, muxMs, verificationMs: performance.now() - verifyStarted });
    options.signal?.throwIfAborted(); await rename(staged, destination);
  } finally { await rm(directory, { recursive: true, force: true }); }
}
