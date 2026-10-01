import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parsePlan } from '../src/plan.js';
import { renderFrame, renderVideo, probeVideo } from '../src/render.js';

const scene = () => parsePlan({
  version: 'portable-v1', width: 160, height: 90, fps: { num: 30, den: 1 }, frameCount: 15,
  background: '#ffffff', assets: {}, audio: [],
  nodes: [{ id: 'box', type: 'rect', x: { keyframes: [{ frame: 0, value: 0 }, { frame: 14, value: 100 }] }, y: 20, width: 30, height: 30, fill: '#ff0000' }],
});

describe('real browser-free rendering', () => {
  it('seeks in shuffled order and produces repeatable visible pixels', async () => {
    const plan = scene();
    const last = await renderFrame(plan, 14, new Map());
    const first = await renderFrame(plan, 0, new Map());
    expect(last.pixels).not.toEqual(first.pixels);
    expect((await renderFrame(plan, 14, new Map())).pixels).toEqual(last.pixels);
    expect(Array.from(first.pixels.subarray((30 * 160 + 10) * 4, (30 * 160 + 10) * 4 + 4))).toEqual([255, 0, 0, 255]);
    expect(Array.from(last.pixels.subarray((30 * 160 + 10) * 4, (30 * 160 + 10) * 4 + 4))).toEqual([255, 255, 255, 255]);
  });
  it('renders a playable MP4 with an exact frame count and cadence', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'helios-portable-render-'));
    try {
      const output = join(dir, 'video.mp4');
      await renderVideo(scene(), new Map(), output);
      const info = await probeVideo(output);
      expect(info.frameCount).toBe(15);
      expect(info.width).toBe(160);
      expect(info.height).toBe(90);
      expect(info.fps).toEqual({ num: 30, den: 1 });
      expect(info.codec).toBe('h264');
      expect((await readFile(output)).length).toBeGreaterThan(500);
    } finally { await rm(dir, { recursive: true, force: true }); }
  }, 30000);
});
