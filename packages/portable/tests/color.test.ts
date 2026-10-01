import { it, expect } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parsePlan } from '../src/plan.js';
import { renderVideo } from '../src/render.js';
import { runProcess } from '../src/process.js';

it.each(['native', 'skia'] as const)('converts sRGB mid-gray to BT.709 luminance with %s', async rasterizer => {
  const dir = await mkdtemp(join(tmpdir(), 'helios-portable-color-'));
  try {
    const path = join(dir, 'gray.mp4');
    await renderVideo(parsePlan({ version: 'portable-v1', width: 32, height: 32, fps: { num: 30, den: 1 }, frameCount: 2, background: '#808080', nodes: [] }), new Map(), path, { rasterizer });
    const frame = await runProcess('ffmpeg', ['-v', 'error', '-i', path, '-frames:v', '1', '-pix_fmt', 'yuv420p', '-f', 'rawvideo', 'pipe:1']);
    const linear = ((128 / 255 + 0.055) / 1.055) ** 2.4;
    const expectedY = 16 + 219 * (1.099 * linear ** 0.45 - 0.099);
    expect(Math.abs(frame[16 * 32 + 16] - expectedY)).toBeLessThan(2);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
