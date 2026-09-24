import { describe, it, expect } from 'vitest';
import { spawnSync } from 'child_process';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import { compareFrames } from '../compare-frames.js';

const W = 160;
const H = 90;

/** A grayscale PNG of W x H, black with a white box at (x, y), plus optional per-pixel tweaks. */
function png(x: number, y: number, tweak?: (pixels: Buffer) => void): Buffer {
  const pixels = Buffer.alloc(W * H);
  for (let r = y; r < y + 20; r++) for (let c = x; c < x + 20; c++) pixels[r * W + c] = 255;
  tweak?.(pixels);
  const result = spawnSync(ffmpeg.path, ['-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'gray', '-s', `${W}x${H}`, '-i', '-', '-f', 'image2pipe', '-vcodec', 'png', '-'], { input: pixels });
  return result.stdout;
}

describe('compareFrames', () => {
  it('calls byte-identical frames identical', () => {
    const a = png(10, 10);
    expect(compareFrames(a, Buffer.from(a), W, H).verdict).toBe('identical');
  });

  it('treats a few slightly different pixels (antialiasing, compositing) as noise', () => {
    const a = png(10, 10);
    const b = png(10, 10, (p) => {
      for (let i = 0; i < 12; i++) p[(30 + i) * W + 29] = 6;   // faint edge shimmer
      p[40 * W + 70] = 60; p[41 * W + 70] = 60;                   // two brighter stray pixels
    });
    const result = compareFrames(a, b, W, H);
    expect(result.verdict).toBe('noise');
  });

  it('calls a moved element different', () => {
    const result = compareFrames(png(10, 10), png(15, 10), W, H);
    expect(result.verdict).toBe('different');
    expect(result.changedPixels).toBeGreaterThan(100);
  });
});
