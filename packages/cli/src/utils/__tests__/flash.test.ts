import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import { FlashDetector, analysisSize, analyzeVideo, summarizeFlashes, type FlashAnalysis } from '../flash.js';

type Rgb = [number, number, number];
const BLACK: Rgb = [0, 0, 0];
const WHITE: Rgb = [255, 255, 255];
const W = 96;
const H = 54;

/** Runs frames through the detector: paint(x, y, frame) gives each pixel's sRGB colour. */
function detect(seconds: number, fps: number, paint: (x: number, y: number, frame: number) => Rgb): FlashAnalysis {
  const detector = new FlashDetector(W, H, fps);
  const frame = new Uint8Array(W * H * 3);
  for (let n = 0; n < Math.round(seconds * fps); n++) {
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        frame.set(paint(x, y, n), (y * W + x) * 3);
      }
    }
    detector.push(frame);
  }
  return detector.analysis();
}

/** A square wave at hz: frames alternate between two colours, `on` first. */
const toggle = (hz: number, fps: number, on: Rgb, off: Rgb) => (frame: number): Rgb =>
  Math.floor((frame * 2 * hz) / fps) % 2 === 0 ? on : off;

describe('FlashDetector', () => {
  it('counts a full-frame flash as a pair of transitions', () => {
    // 2 Hz: four transitions a second. Counting transitions reads that as 4 and fails it.
    const twoHz = detect(3, 30, (_x, _y, n) => toggle(2, 30, BLACK, WHITE)(n));
    expect(twoHz.general.maxPerSecond).toBe(2);
    expect(summarizeFlashes(twoHz).ok).toBe(true);
  });

  it('fails more than three flashes a second and passes three', () => {
    const five = summarizeFlashes(detect(2, 30, (_x, _y, n) => toggle(5, 30, BLACK, WHITE)(n)));
    expect(five).toMatchObject({ ok: false, maxPerSecond: 5, red: false });
    expect(five.worst).toMatchObject({ count: 5 });

    const three = summarizeFlashes(detect(3, 30, (_x, _y, n) => toggle(3, 30, BLACK, WHITE)(n)));
    expect(three).toMatchObject({ ok: true, maxPerSecond: 3 });

    // 4 Hz at 24 fps: a transition every 3 frames, 8 a second.
    expect(summarizeFlashes(detect(2, 24, (_x, _y, n) => toggle(4, 24, BLACK, WHITE)(n)))).toMatchObject({ ok: false, maxPerSecond: 4 });
  });

  it('reports the worst second', () => {
    // Steady black, then 5 Hz from 1 s to 2 s, then black again.
    const result = summarizeFlashes(detect(3, 30, (_x, _y, n) => (n >= 30 && n < 60 ? toggle(5, 30, WHITE, BLACK)(n - 30) : BLACK)));
    expect(result.ok).toBe(false);
    expect(result.worst!.t0).toBe(1);
    expect(result.worst!.t1).toBe(2);
    expect(result.worst!.count).toBe(5);
  });

  it('ignores flashing under a quarter of a third-of-the-frame window', () => {
    // The field is 32 x 18 = 576 px, so 144 px must flash together.
    const square = (side: number) => (x: number, y: number, n: number): Rgb =>
      x >= 40 && x < 40 + side && y >= 20 && y < 20 + side ? toggle(5, 30, WHITE, BLACK)(n) : BLACK;
    expect(summarizeFlashes(detect(2, 30, square(11)))).toMatchObject({ ok: true, maxPerSecond: 0, worst: null }); // 121 px
    expect(summarizeFlashes(detect(2, 30, square(13)))).toMatchObject({ ok: false, maxPerSecond: 5 }); // 169 px
  });

  it('ignores small and bright changes', () => {
    // 0 to sRGB 80 is a relative luminance change of 0.08.
    const dim: Rgb = [80, 80, 80];
    expect(detect(2, 30, (_x, _y, n) => toggle(5, 30, BLACK, dim)(n)).general.maxPerSecond).toBe(0);
    // Between 0.85 and 1.0 the darker state is above 0.8.
    const light: Rgb = [237, 237, 237];
    expect(detect(2, 30, (_x, _y, n) => toggle(5, 30, light, WHITE)(n)).general.maxPerSecond).toBe(0);
  });

  it('passes a slow fade: one transition each way, never two in a second', () => {
    const fade = detect(4, 30, (_x, _y, n) => {
      const level = Math.round(255 * (n < 60 ? n / 60 : (120 - n) / 60));
      return [level, level, level];
    });
    expect(fade.general.maxPerSecond).toBe(0.5);
    expect(summarizeFlashes(fade)).toMatchObject({ ok: true, worst: null });
  });

  it('does not pair changes that go the same way', () => {
    // Four steps up within one second, then hold.
    const steps = detect(2, 30, (_x, _y, n) => {
      const level = [0, 100, 160, 210, 255][Math.min(4, Math.floor(n / 6))];
      return [level, level, level];
    });
    expect(steps.general.maxPerSecond).toBe(0.5);
  });

  it('counts an inverting checkerboard of large squares', () => {
    const board = (x: number, y: number, n: number): Rgb =>
      ((x < W / 2 ? 0 : 1) + (y < H / 2 ? 0 : 1) + Math.floor((n * 10) / 30)) % 2 ? WHITE : BLACK;
    expect(summarizeFlashes(detect(2, 30, board))).toMatchObject({ ok: false, maxPerSecond: 5 });
  });

  it('fails saturated red flashing that is too dark to be a general flash', () => {
    // sRGB 150 red has relative luminance 0.065: under the general threshold, but saturated red.
    const red = detect(2, 30, (_x, _y, n) => toggle(5, 30, [150, 0, 0], BLACK)(n));
    expect(red.general.maxPerSecond).toBe(0);
    expect(red.red.maxPerSecond).toBe(5);
    expect(summarizeFlashes(red)).toMatchObject({ ok: false, maxPerSecond: 5, red: true });
  });

  it('does not count unsaturated colour changes as red flashes', () => {
    const pink: Rgb = [255, 150, 150];
    const pinkGrey = detect(2, 30, (_x, _y, n) => toggle(5, 30, pink, [200, 200, 200])(n));
    expect(pinkGrey.red.maxPerSecond).toBe(0);
  });
});

describe('analysisSize', () => {
  it('keeps the aspect ratio with a long side of 96', () => {
    expect(analysisSize(1920, 1080)).toEqual({ width: 96, height: 54 });
    expect(analysisSize(1080, 1920)).toEqual({ width: 54, height: 96 });
    expect(analysisSize(1000, 1000)).toEqual({ width: 96, height: 96 });
  });
});

describe('analyzeVideo on encoded clips', () => {
  let dir: string;

  /** Encodes a 30 fps clip (160x90 unless given) from a lavfi source and filter chain. */
  function clip(name: string, seconds: number, filters: string, size = '160x90'): string {
    const file = path.join(dir, `${name}.mp4`);
    const result = spawnSync(ffmpeg.path, [
      '-v', 'error', '-y', '-f', 'lavfi', '-i', `color=c=black:s=${size}:r=30:d=${seconds}`,
      '-vf', filters, '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '12', '-pix_fmt', 'yuv420p', file,
    ]);
    if (result.status !== 0) throw new Error(result.stderr.toString());
    return file;
  }

  const analyze = async (file: string, width = 160, height = 90) => {
    const decoded = await analyzeVideo(file, ffmpeg.path, { index: 0, width, height, fps: 30 });
    return { frames: decoded.frames, flash: summarizeFlashes(decoded.flashes) };
  };

  // drawbox shows the box while mod(t*2*hz, 2) < 1: a square wave at hz.
  const blink = (hz: number, box: string, color = 'white') =>
    `drawbox=${box}:color=${color}:t=fill:enable='lt(mod(t*${2 * hz},2),1)'`;

  beforeAll(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'helios-flash-')); });
  afterAll(() => { fs.rmSync(dir, { recursive: true, force: true }); });

  it('fails a full frame toggling black and white at 5 Hz', async () => {
    const { frames, flash } = await analyze(clip('five-hz', 2, blink(5, 'x=0:y=0:w=iw:h=ih')));
    expect(frames).toBe(60);
    expect(flash).toMatchObject({ ok: false, maxPerSecond: 5, red: false });
  });

  it('passes the same toggle at 1 Hz', async () => {
    const { flash } = await analyze(clip('one-hz', 3, blink(1, 'x=0:y=0:w=iw:h=ih')));
    expect(flash).toMatchObject({ ok: true, maxPerSecond: 1, worst: { count: 1 } });
  });

  it('passes a small square flashing at 5 Hz', async () => {
    // 16 x 16 of 160 x 90: under a quarter of a 53 x 30 window.
    const { flash } = await analyze(clip('small-square', 2, blink(5, 'x=72:y=37:w=16:h=16')));
    expect(flash).toMatchObject({ ok: true, maxPerSecond: 0, worst: null });
  });

  it('passes a slow fade in and out', async () => {
    const { flash } = await analyze(clip('fade', 4, 'drawbox=x=0:y=0:w=iw:h=ih:color=white:t=fill,fade=t=in:st=0:d=2,fade=t=out:st=2:d=2'));
    expect(flash).toMatchObject({ ok: true, worst: null });
    expect(flash.maxPerSecond).toBeLessThan(1);
  });

  it('fails saturated red flashing at 5 Hz as a red flash', async () => {
    const { flash } = await analyze(clip('red', 2, blink(5, 'x=0:y=0:w=iw:h=ih', '0x960000')));
    expect(flash).toMatchObject({ ok: false, maxPerSecond: 5, red: true });
  });

  it('passes a fine checkerboard inverting at 5 Hz, which averages to steady grey', async () => {
    // WCAG exempts fine, balanced patterns; reading the video small averages them away.
    const { flash } = await analyze(clip('fine-checks', 2,
      "geq=lum='if(mod(X+Y+floor(T*10+0.001),2),235,16)':cb=128:cr=128", '480x270'), 480, 270);
    expect(flash).toMatchObject({ ok: true, maxPerSecond: 0 });
  });
});
