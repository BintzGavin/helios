import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import type { Command } from 'commander';
import { isUrl } from './render-options.js';

/**
 * Canvas modules and portable-v1 plans render with @helios-project/portable, without a
 * browser. Detection only reads the input; the portable package is imported lazily so HTML
 * renders never load it.
 */
export type PortableInput =
  | { kind: 'canvas'; file: string; composition: CanvasModuleInfo }
  | { kind: 'plan'; file: string; json: unknown };

interface CanvasModuleInfo {
  width: number;
  height: number;
  fps: { num: number; den: number };
  frameCount: number;
}

const CANVAS_SHAPE = 'its default export needs width, height, fps, frameCount and draw(ctx, frame)';

async function importDefault(file: string): Promise<any> {
  const loaded = (await import(pathToFileURL(file).href)).default;
  return typeof loaded === 'function' ? await loaded() : loaded;
}

function asCanvasInfo(value: any, file: string): CanvasModuleInfo {
  const { width, height, fps, frameCount } = value;
  if (![width, height, frameCount, fps?.num, fps?.den].every((n) => typeof n === 'number' && Number.isFinite(n))) {
    throw new Error(`${path.basename(file)} is not a Canvas module: ${CANVAS_SHAPE}`);
  }
  return { width, height, fps, frameCount };
}

/** The portable input this is, or undefined for anything the browser renders. */
export async function detectPortableInput(input: string): Promise<PortableInput | undefined> {
  if (isUrl(input)) return undefined;
  const file = path.resolve(process.cwd(), input);
  const ext = path.extname(file).toLowerCase();

  if (ext === '.mjs') {
    if (!fs.existsSync(file)) throw new Error(`Canvas module not found: ${input}`);
    let value: any;
    try {
      value = await importDefault(file);
    } catch (err: any) {
      throw new Error(`Could not load Canvas module ${input}: ${err?.message ?? err}`);
    }
    if (typeof value?.draw !== 'function') {
      throw new Error(`${path.basename(file)} is not a Canvas module: ${CANVAS_SHAPE}`);
    }
    return { kind: 'canvas', file, composition: asCanvasInfo(value, file) };
  }

  if (ext === '.js') {
    // Any other .js keeps its existing meaning: a page loaded in the browser.
    let value: any;
    try {
      value = await importDefault(file);
    } catch {
      return undefined;
    }
    if (typeof value?.draw !== 'function') return undefined;
    return { kind: 'canvas', file, composition: asCanvasInfo(value, file) };
  }

  if (ext === '.json') {
    let json: any;
    try {
      json = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      return undefined;
    }
    if (json && typeof json === 'object' && json.version === 'portable-v1') return { kind: 'plan', file, json };
    return undefined;
  }

  return undefined;
}

type Kind = PortableInput['kind'];
const NOUN: Record<Kind, string> = { canvas: 'Canvas modules', plan: 'portable-v1 plans' };

const BROWSER = 'it configures the browser, and they render without one';
const JOB = 'distributed job specs describe browser renders';
const DECLARED: Record<Kind, string> = {
  canvas: 'the module declares its own size, frame rate and length; change them there, or use --start-frame/--frame-count for a range',
  plan: 'the plan declares its own size, frame rate and length; change them there, or use --start-frame/--frame-count for a range',
};

/** Flags the portable path refuses, keyed by commander option name, and why. */
function rejectedFlags(kind: Kind): Record<string, string> {
  const audio = kind === 'canvas'
    ? 'Canvas modules export video only; add audio tracks to a portable-v1 plan, or mux a soundtrack afterwards with ffmpeg'
    : 'declare audio tracks in the plan\'s "audio" list instead';
  const flags: Record<string, string> = {
    mode: BROWSER,
    gpu: BROWSER,
    headless: BROWSER,
    serve: BROWSER,
    emitJob: JOB,
    baseUrl: JOB,
    jobBaseUrl: JOB,
    width: DECLARED[kind],
    height: DECLARED[kind],
    fps: DECLARED[kind],
    duration: DECLARED[kind],
    audio,
    audioCodec: kind === 'canvas' ? audio : 'portable audio is always encoded as AAC',
    videoCodec: 'portable output is always H.264 (libx264)',
  };
  if (kind === 'canvas') {
    flags.rasterizer = 'Canvas modules always draw with native CPU Skia; --rasterizer applies to portable-v1 plans';
    flags.assets = 'Canvas modules carry their own fonts; --assets applies to portable-v1 plans';
  } else {
    // The plan API takes no encoder settings or worker count yet.
    flags.quality = 'the plan renderer uses fixed encoder settings (x264 preset fast, CRF 18)';
    flags.preset = 'the plan renderer uses fixed encoder settings (x264 preset fast, CRF 18)';
    flags.concurrency = 'plans render frames serially in one process';
  }
  return flags;
}

function flagName(key: string, value: unknown): string {
  switch (key) {
    case 'gpu': return value === false ? '--no-gpu' : '--gpu';
    case 'headless': return '--no-headless';
    case 'serve': return '--no-serve';
    default: return '--' + key.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
  }
}

const passed = (command: Command, key: string) => command.getOptionValueSource(key) === 'cli';

/** HTML renders refuse the flags that only mean something to the portable renderer. */
export function rejectPortableOnlyFlags(command: Command): void {
  for (const key of ['rasterizer', 'assets']) {
    if (passed(command, key)) {
      throw new Error(`--${key} only applies to portable-v1 plans (.json); HTML compositions render in the browser`);
    }
  }
}

function rejectUnsupportedFlags(kind: Kind, options: Record<string, unknown>, command: Command): void {
  for (const [key, why] of Object.entries(rejectedFlags(kind))) {
    if (passed(command, key)) {
      throw new Error(`${flagName(key, options[key])} is not supported for ${NOUN[kind]}: ${why}`);
    }
  }
}

function parseInteger(value: unknown, flag: string, min: number): number | undefined {
  if (value === undefined) return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min) {
    throw new Error(`${flag} must be ${min === 0 ? 'a whole number, 0 or more' : 'a positive whole number'} (got "${value}")`);
  }
  return n;
}

function frameRange(options: Record<string, any>, total: number, noun: string): { start?: number; end?: number } {
  const start = parseInteger(options.startFrame, '--start-frame', 0);
  const count = parseInteger(options.frameCount, '--frame-count', 1);
  if (start === undefined && count === undefined) return {};
  const first = start ?? 0;
  const end = count === undefined ? total : first + count;
  if (first >= total || end > total) {
    throw new Error(`Frames ${first}-${end - 1} are outside the ${noun}, which has ${total} frames (0-${total - 1})`);
  }
  return { start: first, end };
}

const RASTERIZERS = { resvg: 'native', skia: 'skia', wasm: 'wasm' } as const;
type RasterizerName = keyof typeof RASTERIZERS;

function describeFps(fps: { num: number; den: number }): string {
  return fps.den === 1 ? `${fps.num}` : (fps.num / fps.den).toFixed(3).replace(/0+$/, '');
}

/** Renders a Canvas module or portable-v1 plan; throws with a one-line message on failure. */
export async function renderPortable(
  target: PortableInput,
  options: Record<string, any>,
  command: Command,
  parsePreset: (value: string | undefined) => string | undefined,
): Promise<void> {
  rejectUnsupportedFlags(target.kind, options, command);
  const outputPath = path.resolve(process.cwd(), options.output);

  if (target.kind === 'canvas') {
    const info = target.composition;
    const range = frameRange(options, info.frameCount, 'module');
    const concurrency = passed(command, 'concurrency') ? parseInteger(options.concurrency, '--concurrency', 1) : undefined;
    let crf: number | undefined;
    if (options.quality !== undefined) {
      crf = Number(options.quality);
      if (!Number.isFinite(crf) || crf < 0 || crf > 51) throw new Error(`--quality must be a number from 0 to 51 (got "${options.quality}")`);
    }
    const preset = parsePreset(options.preset);
    const engine = 'portable, skia';
    const frames = (range.end ?? info.frameCount) - (range.start ?? 0);

    console.log(`Rendering without a browser (${engine})...`);
    console.log(`Input: ${target.file}`);
    console.log(`Output: ${outputPath}`);
    console.log(`Rendering ${frames} frames at ${describeFps(info.fps)} fps, ${info.width}x${info.height}`);

    const { renderCanvasModule } = await import('@helios-project/portable');
    const encoder = { ...(crf !== undefined ? { crf } : {}), ...(preset !== undefined ? { preset: preset as any } : {}) };
    await renderCanvasModule(target.file, outputPath, {
      ...range,
      ...(concurrency !== undefined ? { concurrency } : {}),
      ...(Object.keys(encoder).length ? { encoder } : {}),
      onProgress: (completed, total) => { console.log(`Progress: ${completed}/${total} frames`); },
    });
    console.log(`Render complete. Rendered without a browser (${engine}): ${outputPath}`);
    return;
  }

  const name = (options.rasterizer ?? 'resvg') as string;
  if (!(name in RASTERIZERS)) throw new Error(`--rasterizer must be resvg, skia or wasm (got "${name}")`);
  const rasterizer = RASTERIZERS[name as RasterizerName];
  const engine = `portable, ${name}`;

  const { parsePlan, renderVideo } = await import('@helios-project/portable');
  const plan = parsePlan(target.json);
  const range = frameRange(options, plan.frameCount, 'plan');
  const assetDir = path.resolve(process.cwd(), options.assets ?? path.dirname(target.file));
  const assets = new Map<string, string>();
  for (const [id, asset] of Object.entries(plan.assets)) {
    const assetPath = path.join(assetDir, asset.sha256);
    if (!fs.existsSync(assetPath)) {
      throw new Error(`Asset "${id}" not found at ${assetPath}; put each asset file in the assets directory named by its SHA-256 (--assets <dir>, default: the plan's folder)`);
    }
    assets.set(id, assetPath);
  }
  const frames = (range.end ?? plan.frameCount) - (range.start ?? 0);

  console.log(`Rendering without a browser (${engine})...`);
  console.log(`Input: ${target.file}`);
  console.log(`Output: ${outputPath}`);
  console.log(`Rendering ${frames} frames at ${describeFps(plan.fps)} fps, ${plan.width}x${plan.height}`);
  if (range.start !== undefined && plan.audio.length > 0) {
    console.log('Note: a frame range renders video only; the plan\'s audio tracks are left out');
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const step = Math.max(1, Math.ceil(frames / 10));
  let done = 0;
  await renderVideo(plan, assets, outputPath, {
    rasterizer,
    ...range,
    onFrame: () => {
      done++;
      if (done % step === 0 || done === frames) console.log(`Progress: ${done}/${frames} frames`);
    },
  });
  console.log(`Render complete. Rendered without a browser (${engine}): ${outputPath}`);
}
