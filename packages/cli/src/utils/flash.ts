import { spawn } from 'child_process';

/**
 * Flash check after WCAG 2.3.1 (Three Flashes or Below Threshold).
 *
 * The video is read small, at its own frame rate, and each pixel's sRGB value is turned into
 * linear relative luminance. Per pixel:
 * - a general transition is a change in relative luminance of at least 0.1 (10% of the
 *   maximum) from the last extreme, where the darker of the two states is below 0.8;
 * - a red transition is a change of more than 20 in the red quantity (R − G − B) × 320 (linear
 *   R, G, B; floored at 0) where one of the two states is saturated red, R / (R + G + B) ≥ 0.8.
 * A transition only counts when it opposes the pixel's previous one, so a slow fade is one
 * transition however long it takes, and a flash is a PAIR of opposing transitions.
 *
 * Area: WCAG counts flashes whose combined area covers at least 25% of any 10° visual field.
 * At a typical viewing distance a 10° field is about a third of the screen's width and height
 * (WCAG's own example: 341 × 256 px on a 1024 × 768 screen), so the field is approximated as a
 * window one third of the frame's width and height, tried at every position. A window makes a
 * transition when at least 25% of its pixels make the same transition in the same frame.
 *
 * Counting: per window, transitions that oppose the window's previous one (a frame where 25%
 * go up and 25% go down, like an inverting checkerboard, always counts). The flashes in a
 * one-second span are its transitions / 2: pairs, not transitions. More than 3 general or more
 * than 3 red flashes in any one second fails.
 *
 * Other approximations:
 * - The frame is shrunk to 96 px on its long side by averaging sRGB values, not linear light.
 *   At 1080p each analysis pixel averages a 20 × 20 block, so fine balanced patterns (which
 *   WCAG exempts) read as steady grey, and only large areas can flash.
 * - Frames are timed i / fps from the first frame, which assumes a constant frame rate.
 */

/** Long side of the analysis frame, in pixels: 96 × 54 for 16:9. */
const ANALYSIS_SIZE = 96;
const GENERAL_CHANGE = 0.1;
const DARKER_BELOW = 0.8;
const RED_CHANGE = 20;
const RED_SCALE = 320;
const RED_SATURATION = 0.8;
const FIELD_FRACTION = 1 / 3;
const AREA_FRACTION = 0.25;
export const MAX_FLASHES_PER_SECOND = 3;

const UP = 1;
const DOWN = 2;
const BOTH = 3;

export interface FlashWindow {
  /** Start of the one-second span, in seconds from the first frame. */
  t0: number;
  t1: number;
  /** Flashes (pairs of opposing transitions) in that second. */
  count: number;
}

export interface FlashResult {
  ok: boolean;
  /** The most flashes in any one second, general or red. Halves are a lone transition. */
  maxPerSecond: number;
  /** The second with the most flashes; null when no second holds a whole flash. */
  worst: FlashWindow | null;
  /** True when red flashes go over the limit. */
  red: boolean;
}

/** One kind of flash (general or red): the most in any second, and that second. */
export interface FlashKind {
  maxPerSecond: number;
  worst: FlashWindow | null;
}

export interface FlashAnalysis {
  general: FlashKind;
  red: FlashKind;
}

/** Folds the general and red counts into the check's flash summary. */
export function summarizeFlashes({ general, red }: FlashAnalysis): FlashResult {
  const worse = red.maxPerSecond > general.maxPerSecond ? red : general;
  return {
    ok: general.maxPerSecond <= MAX_FLASHES_PER_SECOND && red.maxPerSecond <= MAX_FLASHES_PER_SECOND,
    maxPerSecond: worse.maxPerSecond,
    worst: worse.worst,
    red: red.maxPerSecond > MAX_FLASHES_PER_SECOND,
  };
}

/** The analysis frame size for a video, keeping its aspect ratio. */
export function analysisSize(width: number, height: number): { width: number; height: number } {
  const scale = ANALYSIS_SIZE / Math.max(width, height, 1);
  return {
    width: Math.max(6, Math.round(width * scale)),
    height: Math.max(6, Math.round(height * scale)),
  };
}

const SRGB_TO_LINEAR = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  SRGB_TO_LINEAR[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Counts, per field-sized window, transitions that cover a quarter of it in the same frame. */
class WindowCounter {
  private readonly cols: number;
  private readonly rows: number;
  private readonly last: Uint8Array;
  private readonly ring: Int32Array;
  private readonly head: Int32Array;
  private readonly length: Int32Array;
  private readonly capacity: number;
  private readonly upSum: Int32Array;
  private readonly downSum: Int32Array;
  bestCount = 0;
  bestStart = 0;

  constructor(
    private readonly width: number,
    private readonly height: number,
    private readonly fieldWidth: number,
    private readonly fieldHeight: number,
    private readonly threshold: number,
    private readonly fps: number,
  ) {
    this.cols = width - fieldWidth + 1;
    this.rows = height - fieldHeight + 1;
    const windows = this.cols * this.rows;
    this.last = new Uint8Array(windows);
    // At most one transition per frame per window, so a second holds at most ceil(fps) + 1.
    this.capacity = Math.ceil(fps) + 1;
    this.ring = new Int32Array(windows * this.capacity);
    this.head = new Int32Array(windows);
    this.length = new Int32Array(windows);
    this.upSum = new Int32Array((width + 1) * (height + 1));
    this.downSum = new Int32Array((width + 1) * (height + 1));
  }

  /** up/down: per-pixel transitions in this frame; upCount/downCount: their totals. */
  add(frame: number, up: Uint8Array, down: Uint8Array, upCount: number, downCount: number) {
    if (upCount < this.threshold && downCount < this.threshold) return;
    integrate(up, this.upSum, this.width, this.height);
    integrate(down, this.downSum, this.width, this.height);
    const stride = this.width + 1;
    const { fieldWidth: fw, fieldHeight: fh } = this;
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const a = y * stride + x;
        const b = a + fw;
        const c = a + fh * stride;
        const d = c + fw;
        const isUp = this.upSum[d] - this.upSum[b] - this.upSum[c] + this.upSum[a] >= this.threshold;
        const isDown = this.downSum[d] - this.downSum[b] - this.downSum[c] + this.downSum[a] >= this.threshold;
        if (!isUp && !isDown) continue;
        const w = y * this.cols + x;
        const direction = isUp && isDown ? BOTH : isUp ? UP : DOWN;
        if (direction !== BOTH && direction === this.last[w]) continue;
        this.last[w] = direction;
        this.record(w, frame);
      }
    }
  }

  private record(w: number, frame: number) {
    const base = w * this.capacity;
    let head = this.head[w];
    let length = this.length[w];
    // Keep only transitions less than one second before this one.
    while (length > 0 && (frame - this.ring[base + head]) / this.fps >= 1 - 1e-9) {
      head = (head + 1) % this.capacity;
      length--;
    }
    this.ring[base + ((head + length) % this.capacity)] = frame;
    length++;
    this.head[w] = head;
    this.length[w] = length;
    if (length > this.bestCount) {
      this.bestCount = length;
      this.bestStart = this.ring[base + head];
    }
  }
}

function integrate(mask: Uint8Array, sum: Int32Array, width: number, height: number) {
  const stride = width + 1;
  for (let y = 0; y < height; y++) {
    let row = 0;
    for (let x = 0; x < width; x++) {
      row += mask[y * width + x];
      sum[(y + 1) * stride + x + 1] = sum[y * stride + x + 1] + row;
    }
  }
}

/** Feed RGB24 frames of the analysis size in order; read the result at the end. */
export class FlashDetector {
  private frame = 0;
  private readonly pixels: number;
  // Per pixel, since its last counted transition: the lowest and highest state, and which way
  // that transition went.
  private readonly lumMin: Float32Array;
  private readonly lumMax: Float32Array;
  private readonly lumLast: Uint8Array;
  private readonly redMin: Float32Array;
  private readonly redMax: Float32Array;
  private readonly redMinSaturated: Uint8Array;
  private readonly redMaxSaturated: Uint8Array;
  private readonly redLast: Uint8Array;
  private readonly masks: Uint8Array[];
  private readonly general: WindowCounter;
  private readonly redCounter: WindowCounter;

  constructor(readonly width: number, readonly height: number, readonly fps: number) {
    this.pixels = width * height;
    this.lumMin = new Float32Array(this.pixels);
    this.lumMax = new Float32Array(this.pixels);
    this.lumLast = new Uint8Array(this.pixels);
    this.redMin = new Float32Array(this.pixels);
    this.redMax = new Float32Array(this.pixels);
    this.redMinSaturated = new Uint8Array(this.pixels);
    this.redMaxSaturated = new Uint8Array(this.pixels);
    this.redLast = new Uint8Array(this.pixels);
    this.masks = [0, 1, 2, 3].map(() => new Uint8Array(this.pixels));
    const fieldWidth = Math.max(1, Math.round(width * FIELD_FRACTION));
    const fieldHeight = Math.max(1, Math.round(height * FIELD_FRACTION));
    const threshold = Math.ceil(fieldWidth * fieldHeight * AREA_FRACTION);
    this.general = new WindowCounter(width, height, fieldWidth, fieldHeight, threshold, fps);
    this.redCounter = new WindowCounter(width, height, fieldWidth, fieldHeight, threshold, fps);
  }

  push(rgb: Uint8Array) {
    const [lumUp, lumDown, redUp, redDown] = this.masks;
    let lumUps = 0, lumDowns = 0, redUps = 0, redDowns = 0;
    const first = this.frame === 0;

    for (let p = 0, i = 0; p < this.pixels; p++, i += 3) {
      const r = SRGB_TO_LINEAR[rgb[i]];
      const g = SRGB_TO_LINEAR[rgb[i + 1]];
      const b = SRGB_TO_LINEAR[rgb[i + 2]];
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const red = Math.max(0, r - g - b) * RED_SCALE;
      const sum = r + g + b;
      const saturated = sum > 0 && r / sum >= RED_SATURATION ? 1 : 0;
      lumUp[p] = lumDown[p] = redUp[p] = redDown[p] = 0;

      if (first) {
        this.lumMin[p] = this.lumMax[p] = lum;
        this.redMin[p] = this.redMax[p] = red;
        this.redMinSaturated[p] = this.redMaxSaturated[p] = saturated;
        continue;
      }

      // General flash: relative luminance.
      if (lum < this.lumMin[p]) this.lumMin[p] = lum;
      if (lum > this.lumMax[p]) this.lumMax[p] = lum;
      if (this.lumLast[p] !== UP && lum - this.lumMin[p] >= GENERAL_CHANGE && this.lumMin[p] < DARKER_BELOW) {
        lumUp[p] = 1; lumUps++;
        this.lumLast[p] = UP;
        this.lumMin[p] = this.lumMax[p] = lum;
      } else if (this.lumLast[p] !== DOWN && this.lumMax[p] - lum >= GENERAL_CHANGE && lum < DARKER_BELOW) {
        lumDown[p] = 1; lumDowns++;
        this.lumLast[p] = DOWN;
        this.lumMin[p] = this.lumMax[p] = lum;
      }

      // Red flash: the red quantity, where one state is saturated red.
      if (red < this.redMin[p]) { this.redMin[p] = red; this.redMinSaturated[p] = saturated; }
      if (red > this.redMax[p]) { this.redMax[p] = red; this.redMaxSaturated[p] = saturated; }
      if (this.redLast[p] !== UP && red - this.redMin[p] > RED_CHANGE && (saturated || this.redMinSaturated[p])) {
        redUp[p] = 1; redUps++;
        this.redLast[p] = UP;
        this.redMin[p] = this.redMax[p] = red;
        this.redMinSaturated[p] = this.redMaxSaturated[p] = saturated;
      } else if (this.redLast[p] !== DOWN && this.redMax[p] - red > RED_CHANGE && (saturated || this.redMaxSaturated[p])) {
        redDown[p] = 1; redDowns++;
        this.redLast[p] = DOWN;
        this.redMin[p] = this.redMax[p] = red;
        this.redMinSaturated[p] = this.redMaxSaturated[p] = saturated;
      }
    }

    if (!first) {
      this.general.add(this.frame, lumUp, lumDown, lumUps, lumDowns);
      this.redCounter.add(this.frame, redUp, redDown, redUps, redDowns);
    }
    this.frame++;
  }

  get frames(): number {
    return this.frame;
  }

  analysis(): FlashAnalysis {
    return { general: this.kind(this.general), red: this.kind(this.redCounter) };
  }

  private kind(counter: WindowCounter): FlashKind {
    const maxPerSecond = counter.bestCount / 2;
    const t0 = round(counter.bestStart / this.fps);
    return { maxPerSecond, worst: maxPerSecond >= 1 ? { t0, t1: round(t0 + 1), count: maxPerSecond } : null };
  }
}

function round(t: number): number {
  return Math.round(t * 1000) / 1000;
}

export interface DecodedVideo {
  frames: number;
  flashes: FlashAnalysis;
}

/**
 * Decodes every frame of a video stream once, small and as RGB, and runs the flash check
 * on it. Frames are timed at i / fps from the first frame (constant frame rate).
 */
export function analyzeVideo(file: string, ffmpegPath: string, stream: { index: number; width: number; height: number; fps: number }): Promise<DecodedVideo> {
  const size = analysisSize(stream.width, stream.height);
  const detector = new FlashDetector(size.width, size.height, stream.fps);
  const frameBytes = size.width * size.height * 3;

  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, [
      '-v', 'error', '-nostdin', '-i', file,
      '-map', `0:v:${stream.index}`,
      // Every stored frame once: no frames dropped or duplicated to fit a rate.
      '-vsync', '0',
      '-vf', `scale=${size.width}:${size.height}:flags=area,format=rgb24`,
      '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1',
    ], { stdio: ['ignore', 'pipe', 'pipe'] });

    const pending = Buffer.alloc(frameBytes);
    let filled = 0;
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => {
      let offset = 0;
      while (offset < chunk.length) {
        const take = Math.min(frameBytes - filled, chunk.length - offset);
        chunk.copy(pending, filled, offset, offset + take);
        filled += take;
        offset += take;
        if (filled === frameBytes) {
          detector.push(pending);
          filled = 0;
        }
      }
    });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`FFmpeg could not decode the video: ${stderr.trim().split('\n').pop() || `exit code ${code}`}`));
        return;
      }
      resolve({ frames: detector.frames, flashes: detector.analysis() });
    });
  });
}
