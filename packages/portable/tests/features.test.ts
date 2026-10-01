import { expect, it } from 'vitest';
import { parsePlan } from '../src/plan.js';
import { renderFrame, prepareScene } from '../src/render.js';
import { digest } from '../src/storage.js';

const plan = parsePlan({ version: 'portable-v1', width: 320, height: 180, fps: { num: 30, den: 1 }, frameCount: 31, background: '#ffffff', nodes: [
  { id: 'row', type: 'group', x: 20, y: 20, width: 200, height: 100, layout: { direction: 'row', gap: 10, padding: 10 }, children: [
    { id: 'clipped', type: 'rect', width: '25%', height: 40, fill: '#ff0000', clip: { type: 'rect', width: 25, height: 40 } },
    { id: 'ellipse', type: 'ellipse', width: 50, height: 40, fill: '#0000ff' },
  ] },
  { id: 'turned', type: 'rect', x: 230, y: 20, width: 40, height: 20, transform: { rotation: 90 }, fill: '#00ff00' },
  { id: 'triangle', type: 'path', d: 'M0 0 L40 0 L0 40 Z', x: 270, y: 20, fill: '#000000' },
  { id: 'fade', type: 'rect', x: 20, y: 130, width: 30, height: 30, fill: '#000000', opacity: { keyframes: [{ frame: 0, value: 0 }, { frame: 30, value: 1 }] } },
  { id: 'gradient', type: 'rect', x: 100, y: 130, width: 100, height: 30, fill: { type: 'linear', x1: 0, y1: 0, x2: 100, y2: 0, stops: [{ offset: 0, color: '#ff0000' }, { offset: 1, color: '#0000ff' }] } },
] });
it.each(['native', 'skia'] as const)('renders layout, clipping, rotation, paths, gradients and opacity at known pixels with %s', async rasterizer => {
  const frame = await renderFrame(plan, 15, new Map(), { rasterizer });
  const pixel = (x: number, y: number) => Array.from(frame.pixels.subarray((y * plan.width + x) * 4, (y * plan.width + x) * 4 + 4));
  expect(pixel(40, 50)).toEqual([255, 0, 0, 255]);
  expect(pixel(60, 50)).toEqual([255, 255, 255, 255]);
  expect(pixel(110, 50)).toEqual([0, 0, 255, 255]);
  expect(pixel(220, 40)).toEqual([0, 255, 0, 255]);
  expect(pixel(280, 30)).toEqual([0, 0, 0, 255]);
  expect(pixel(30, 140)[0]).toBeGreaterThanOrEqual(127); expect(pixel(30, 140)[0]).toBeLessThanOrEqual(128);
  expect(pixel(110, 140)[0]).toBeGreaterThan(220); expect(pixel(190, 140)[2]).toBeGreaterThan(220);
});
it('preserves retained Skia output across fresh preparations and shuffled frame schedules', async () => {
  const hashes = new Map<number, string>();
  for (let fresh = 0; fresh < 3; fresh++) {
    const prepared = await prepareScene(plan, new Map());
    for (let order = 0; order < 30; order++) {
      const index = (order * 17 + fresh * 7) % plan.frameCount;
      const hash = digest((await renderFrame(plan, index, new Map(), { prepared, rasterizer: 'skia' })).pixels);
      if (hashes.has(index)) expect(hash).toBe(hashes.get(index)); else hashes.set(index, hash);
    }
  }
});
it('matches three fresh preparations and thirty shuffled frame schedules across native and Wasm', async () => {
  const hashes = new Map<number, string>();
  for (let fresh = 0; fresh < 3; fresh++) {
    const prepared = await prepareScene(plan, new Map());
    for (let order = 0; order < 30; order++) {
      const index = (order * 17 + fresh * 7) % plan.frameCount;
      const native = await renderFrame(plan, index, new Map(), { prepared });
      const wasm = await renderFrame(plan, index, new Map(), { prepared, rasterizer: 'wasm' });
      expect(wasm.pixels).toEqual(native.pixels);
      const hash = digest(native.pixels); if (hashes.has(index)) expect(hash).toBe(hashes.get(index)); else hashes.set(index, hash);
    }
  }
}, 30000);
