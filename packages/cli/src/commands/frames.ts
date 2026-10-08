import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import util from 'util';
import { captureFrames, captureContactSheet, probeComposition, readFrameText } from '@helios-project/renderer';
import type { CompositionInfo, ReadFrameTextOptions } from '@helios-project/renderer';
import { compareFrames } from '../utils/compare-frames.js';
import { checkCues, cueSampleTimes, readCueFile } from '../utils/cues.js';
import type { Cue, CueCheck } from '../utils/cues.js';
import { DEFAULT_FPS, DEFAULT_HEIGHT, DEFAULT_WIDTH, parseCrop, parsePositive, parseRange, parseTimes, withCompositionUrl } from '../utils/render-options.js';

/** More than this and a sheet stops being readable (and gets slow to build). */
const MAX_SHEET_FRAMES = 60;
const DEFAULT_SHEET_FRAMES = 12;

function browserConfig(options: any) {
  return {
    headless: options.headless,
    args: process.env.HELIOS_BROWSER_ARGS ? process.env.HELIOS_BROWSER_ARGS.split(' ') : undefined,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    ...(options.gpu !== undefined ? { gpu: options.gpu as boolean } : {}),
  };
}

/** Rounds away float noise so 2.1 stays 2.1 in labels and file names. */
function round(t: number): number {
  return Math.round(t * 1e6) / 1e6;
}

function addPageOptions(command: Command): Command {
  return command
    .option('--width <number>', `Viewport width (default: the composition's, else ${DEFAULT_WIDTH})`)
    .option('--height <number>', `Viewport height (default: the composition's, else ${DEFAULT_HEIGHT})`)
    .option('--crop <x,y,w,h>', 'Cut each frame to this region, in pixels')
    .option('--gpu', 'Enable GPU acceleration in the browser (WebGL)')
    .option('--no-gpu', 'Disable GPU acceleration in the browser')
    .option('--no-headless', 'Run in a visible browser window')
    .option('--no-serve', 'Load a local page from file:// instead of serving it over http');
}

export function registerFrameCommands(program: Command) {
  addPageOptions(
    program
      .command('still <input>')
      .description('Render frames of a composition as PNGs, without encoding a video')
      .requiredOption('--at <seconds>', 'Time(s) to capture, comma-separated (e.g. 0.5,3,7.25)')
      .option('-o, --output <path>', 'Output file for one time, or a directory for several (default: still-<t>s.png)')
  ).action(async (input, options) => {
    try {
      const times = parseTimes(options.at, '--at');
      await withCompositionUrl(input, options.serve !== false, async (url) => {
        const { width, height } = await pageSize(url, options);
        const frames = await captureFrames(url, times, {
          width,
          height,
          crop: parseCrop(options.crop),
          browserConfig: browserConfig(options),
        });

        const single = times.length === 1 && options.output;
        if (options.output && !single) fs.mkdirSync(path.resolve(process.cwd(), options.output), { recursive: true });
        frames.forEach((png, i) => {
          const name = `still-${round(times[i])}s.png`;
          const file = single ? options.output : path.join(options.output ?? '.', name);
          const target = path.resolve(process.cwd(), file);
          fs.writeFileSync(target, png);
          console.log(`Wrote ${path.relative(process.cwd(), target)} (t=${round(times[i])}s)`);
        });
      });
    } catch (err: any) {
      console.error('Still failed:', err.message);
      process.exit(1);
    }
  });

  addPageOptions(
    program
      .command('verify <input>')
      .description('Check that every frame depends only on its time, as rendering in chunks or out of order needs, and that timed text is on screen at its time')
      .option('--duration <seconds>', "Duration to sample (default: the composition's)")
      .option('--samples <number>', 'Frames to compare', '6')
      .option('--cues <file>', 'Timed text that must be on screen at its time (lyrics, captions): an .srt, .vtt or .json file')
      .option('--json', 'Print the results as one JSON object')
  ).action(async (input, options) => {
    const restoreConsole = options.json ? consoleToStderr() : undefined;
    try {
      const samples = parsePositive(options.samples, '--samples', true)!;
      const durationFlag = parsePositive(options.duration, '--duration');
      const cues = options.cues ? readCueFile(options.cues) : undefined;

      const result = await withCompositionUrl(input, options.serve !== false, async (url) => {
        const needsProbe = durationFlag === undefined || options.width === undefined || options.height === undefined;
        const info = needsProbe ? await probe(url, options) : undefined;
        const duration = durationFlag ?? info?.durationInSeconds;
        if (duration === undefined) {
          throw new Error('The page declares no duration: pass --duration <seconds>');
        }
        const { width, height } = await pageSize(url, options, info);
        const purity = await checkPurity(url, duration, samples, { width, height, crop: parseCrop(options.crop), browserConfig: browserConfig(options) });
        const cueCheck = cues ? await checkCuesOnScreen(url, cues, { width, height, browserConfig: browserConfig(options) }) : undefined;
        return { ok: purity.ok && (cueCheck?.ok ?? true), purity, ...(cueCheck ? { cues: cueCheck } : {}) };
      });

      restoreConsole?.();
      if (options.json) {
        process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      } else {
        if (result.purity.ok) console.log(result.purity.message);
        // Same wording as before timed text existed: tools read "Verify failed: Frames at …".
        else console.error('Verify failed:', result.purity.message);
        if (result.cues?.ok) console.log(result.cues.message);
        else if (result.cues) console.error(result.cues.message);
      }
      if (!result.ok) process.exit(1);
    } catch (err: any) {
      restoreConsole?.();
      console.error('Verify failed:', err.message);
      process.exit(1);
    }
  });

  addPageOptions(
    program
      .command('sheet <input>')
      .description('Render a labelled contact sheet of frames (one PNG), without encoding a video')
      .option('--at <seconds>', 'Times to show, comma-separated')
      .option('--every <seconds>', 'One frame every N seconds across the duration')
      .option('--strip <start:end>', 'Every frame from start to end, in seconds')
      .option('--duration <seconds>', "Duration for --every and the default sheet (default: the composition's)")
      .option('--fps <number>', `Frame rate for --strip (default: the composition's, else ${DEFAULT_FPS})`)
      .option('--cols <number>', 'Frames per row (default: up to 4)')
      .option('--cell-width <px>', 'Width of each frame on the sheet (default: 480)')
      .option('-o, --output <path>', 'Output PNG', 'sheet.png')
  ).action(async (input, options) => {
    try {
      await withCompositionUrl(input, options.serve !== false, async (url) => {
        const durationFlag = parsePositive(options.duration, '--duration');
        const fpsFlag = parsePositive(options.fps, '--fps');
        const every = parsePositive(options.every, '--every');
        const strip = options.strip ? parseRange(options.strip, '--strip') : undefined;
        const at = options.at ? parseTimes(options.at, '--at') : undefined;

        const needsDuration = !at && !strip && durationFlag === undefined;
        const needsFps = strip !== undefined && fpsFlag === undefined;
        const needsSize = options.width === undefined || options.height === undefined;
        const info = needsDuration || needsFps || needsSize ? await probe(url, options) : undefined;
        const { width, height } = await pageSize(url, options, info);

        let times: number[];
        if (at) {
          times = at;
        } else if (strip) {
          const fps = fpsFlag ?? info?.fps ?? DEFAULT_FPS;
          const first = Math.ceil(strip[0] * fps - 1e-9);
          const last = Math.floor(strip[1] * fps + 1e-9);
          times = Array.from({ length: Math.max(0, last - first + 1) }, (_, i) => round((first + i) / fps));
        } else {
          const duration = durationFlag ?? info?.durationInSeconds;
          if (duration === undefined) {
            throw new Error('The page declares no duration: pass --duration <seconds>, or pick frames with --at or --strip');
          }
          const step = every ?? duration / DEFAULT_SHEET_FRAMES;
          const count = Math.ceil(duration / step - 1e-9);
          times = Array.from({ length: count }, (_, i) => round(i * step));
        }

        if (times.length === 0) throw new Error('No frames selected');
        if (times.length > MAX_SHEET_FRAMES) {
          throw new Error(`That selects ${times.length} frames; a sheet holds up to ${MAX_SHEET_FRAMES}. Narrow --strip, or use a larger --every.`);
        }

        const sheet = await captureContactSheet(url, times, {
          width,
          height,
          crop: parseCrop(options.crop),
          columns: parsePositive(options.cols, '--cols', true),
          cellWidth: parsePositive(options.cellWidth, '--cell-width', true),
          browserConfig: browserConfig(options),
        });
        const target = path.resolve(process.cwd(), options.output);
        fs.writeFileSync(target, sheet);
        console.log(`Wrote ${path.relative(process.cwd(), target)} (${times.length} frames: ${times.slice(0, 6).join('s, ')}s${times.length > 6 ? ', …' : ''})`);
      });
    } catch (err: any) {
      console.error('Sheet failed:', err.message);
      process.exit(1);
    }
  });
}

interface PurityCheck {
  ok: boolean;
  samples: number;
  differing: number[];
  noisy: number[];
  message: string;
}

/**
 * Renders sample frames once in order, then in reverse on a fresh page: the reverse pass
 * starts cold at the last frame, the way a chunk of a distributed render does, and revisits
 * every frame after later ones. Any frame that comes out different depends on history.
 */
async function checkPurity(
  url: string,
  duration: number,
  samples: number,
  capture: { width: number; height: number; crop?: { x: number; y: number; width: number; height: number }; browserConfig: ReturnType<typeof browserConfig> },
): Promise<PurityCheck> {
  const times = Array.from({ length: samples }, (_, i) => round((i * duration) / samples));
  const forward = await captureFrames(url, times, capture);
  const reversed = await captureFrames(url, [...times].reverse(), capture);
  const frameWidth = capture.crop?.width ?? capture.width;
  const frameHeight = capture.crop?.height ?? capture.height;
  const comparisons = times.map((_, i) => compareFrames(forward[i], reversed[times.length - 1 - i], frameWidth, frameHeight));
  const differing = times.filter((_, i) => comparisons[i].verdict === 'different');
  const noisy = times.filter((_, i) => comparisons[i].verdict === 'noise');
  const list = (ts: number[]) => ts.map((t) => `${Number(t.toFixed(3))}s`).join(', ');

  if (differing.length > 0) {
    return {
      ok: false,
      samples: times.length,
      differing,
      noisy,
      message:
        `Frames at ${list(differing)} differ depending on what was rendered before them. ` +
        'Every frame must be a function of t alone: replace counters, `x += speed`, randomness drawn per frame ' +
        'and timers with values computed from t, or the video breaks when rendered in chunks or seeked. ' +
        'If the frames differ only at the edges of text or shapes, look for CSS will-change: it makes Chrome ' +
        'reuse rasterization from earlier frames. Remove it. ' +
        'A 2D canvas can do the same after a pixel readback (getImageData, or drawing a WebGL canvas into it): ' +
        'Chrome may then switch it between GPU and CPU rasterization, so its antialiasing depends on history. ' +
        "Create canvases you read back with getContext('2d', { willReadFrequently: true }), and reset the " +
        'context state (transform, globalAlpha, globalCompositeOperation, filter) at the start of every frame.',
    };
  }
  const message = noisy.length > 0
    ? `${times.length} sampled frames match rendered in order and in reverse: each frame depends only on t. ` +
      `(Frames at ${list(noisy)} differ by a few pixels of rendering noise, such as antialiasing; that is ignored.)`
    : `${times.length} sampled frames are identical rendered in order and in reverse: each frame depends only on t.`;
  return { ok: true, samples: times.length, differing, noisy, message };
}

/**
 * Reads the text on screen a few times inside each cue (see cueSampleTimes), all in one page
 * session, and checks every cue's words against it.
 */
async function checkCuesOnScreen(url: string, cues: Cue[], options: ReadFrameTextOptions): Promise<CueCheck> {
  const times = [...new Set(cues.flatMap(cueSampleTimes))].sort((a, b) => a - b);
  const frames = await readFrameText(url, times, options);
  const byTime = new Map(times.map((t, i) => [t, frames[i]]));
  return checkCues(cues, (t) => byTime.get(t));
}

/**
 * With --json, stdout carries only the result, so everything else that logs (the renderer's
 * progress, the page's console) goes to stderr. Returns a function that undoes it.
 */
function consoleToStderr(): () => void {
  const saved = { log: console.log, info: console.info, debug: console.debug, warn: console.warn };
  const toStderr = (...args: unknown[]) => {
    process.stderr.write(`${util.format(...args)}\n`);
  };
  console.log = toStderr;
  console.info = toStderr;
  console.debug = toStderr;
  console.warn = toStderr;
  return () => Object.assign(console, saved);
}

function probe(url: string, options: any): Promise<CompositionInfo> {
  return probeComposition(url, {
    browserConfig: browserConfig(options),
    width: parsePositive(options.width, '--width', true) ?? DEFAULT_WIDTH,
    height: parsePositive(options.height, '--height', true) ?? DEFAULT_HEIGHT,
  });
}

async function pageSize(url: string, options: any, info?: CompositionInfo): Promise<{ width: number; height: number }> {
  const widthFlag = parsePositive(options.width, '--width', true);
  const heightFlag = parsePositive(options.height, '--height', true);
  if (widthFlag !== undefined && heightFlag !== undefined) return { width: widthFlag, height: heightFlag };
  const declared = info ?? await probe(url, options);
  return {
    width: widthFlag ?? declared.width ?? DEFAULT_WIDTH,
    height: heightFlag ?? declared.height ?? DEFAULT_HEIGHT,
  };
}
