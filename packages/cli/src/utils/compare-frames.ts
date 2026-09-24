import { spawnSync } from 'child_process';
import ffmpeg from '@ffmpeg-installer/ffmpeg';

/** A pixel counts as changed when any channel moved by more than this many levels. */
const CHANGED_LEVEL = 32;

export interface FrameComparison {
  /**
   * identical: the same bytes. noise: a handful of pixels differ slightly, as GPU compositing
   * and antialiasing can between two renders of the same frame. different: real change.
   */
  verdict: 'identical' | 'noise' | 'different';
  changedPixels: number;
  totalPixels: number;
}

/** Compares two PNG frames of the given size. */
export function compareFrames(a: Buffer, b: Buffer, width: number, height: number): FrameComparison {
  const totalPixels = width * height;
  if (a.equals(b)) return { verdict: 'identical', changedPixels: 0, totalPixels };

  const pixelsA = decode(a, width, height);
  const pixelsB = decode(b, width, height);
  let changedPixels = 0;
  for (let i = 0; i < pixelsA.length; i += 3) {
    if (
      Math.abs(pixelsA[i] - pixelsB[i]) > CHANGED_LEVEL ||
      Math.abs(pixelsA[i + 1] - pixelsB[i + 1]) > CHANGED_LEVEL ||
      Math.abs(pixelsA[i + 2] - pixelsB[i + 2]) > CHANGED_LEVEL
    ) {
      changedPixels++;
    }
  }
  // A few stray pixels is rendering noise; anything that moved or changed colour
  // touches far more than 0.02% of the frame.
  const tolerance = Math.max(16, Math.round(totalPixels * 0.0002));
  return { verdict: changedPixels > tolerance ? 'different' : 'noise', changedPixels, totalPixels };
}

function decode(png: Buffer, width: number, height: number): Buffer {
  const result = spawnSync(ffmpeg.path, [
    '-v', 'error', '-f', 'png_pipe', '-i', '-', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-',
  ], { input: png, maxBuffer: width * height * 3 + 1024 });
  if (result.status !== 0 || result.stdout.length < width * height * 3) {
    throw new Error(`Could not decode a captured frame: ${result.stderr?.toString().trim() || 'unexpected size'}`);
  }
  return result.stdout.subarray(0, width * height * 3);
}
