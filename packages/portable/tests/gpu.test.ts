import { expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { recordGpuCanvas, validateGpuOptions, renderGpuCanvasVideo } from '../src/gpu.js';
import type { CanvasComposition } from '../src/canvas.js';
import { CanvasFrameRenderer, encodeCanvasRange } from '../src/canvas.js';
import { renderCanvasModule } from '../src/canvas-pool.js';

const scene: CanvasComposition = { width: 64, height: 32, fps: { num: 30000, den: 1001 }, frameCount: 4, background: '#000000', draw(ctx, frame) { ctx.fillStyle = '#ff0000'; ctx.fillRect(frame.index * 4, 8, 8, 8); } };

it('rejects explicit unsupported hardware/codec cells without selecting a CPU fallback', () => {
  expect(() => validateGpuOptions({ backend: 'vulkan', codec: 'h264' })).toThrow(/Vulkan/);
  expect(() => validateGpuOptions({ backend: 'metal', codec: 'av1' as any })).toThrow(/codec/);
  expect(() => validateGpuOptions({ backend: 'metal', codec: 'h264', bitrate: 0 })).toThrow(/bitrate/);
});

it('records deterministic requested frames independently and preserves drawing state', async () => {
  const first = await recordGpuCanvas(scene, 3);
  await recordGpuCanvas(scene, 0);
  expect(await recordGpuCanvas(scene, 3)).toEqual(first);
  expect(first.commands).toContainEqual({ op: 'rect', args: [12, 8, 8, 8], color: [1, 0, 0, 1] });
  expect(await recordGpuCanvas(scene, 0)).not.toEqual(first);
});

it('refuses unsupported canvas operations and invalid ranges before hardware execution', async () => {
  await expect(recordGpuCanvas({ ...scene, draw(ctx) { ctx.getImageData(0, 0, 1, 1); } }, 0)).rejects.toMatchObject({ code: 'GPU_UNSUPPORTED_CANVAS' });
  await expect(recordGpuCanvas(scene, 4)).rejects.toMatchObject({ code: 'INVALID_FRAME' });
  await expect(renderGpuCanvasVideo(scene, '/unused.mp4', { start: 2, end: 2 })).rejects.toMatchObject({ code: 'INVALID_RANGE' });
});

it('normalizes negative Canvas rectangle sizes before native drawing', async () => {
  const frame = await recordGpuCanvas({ ...scene, draw(ctx) { ctx.fillRect(12, 16, -8, -4); } }, 0);
  expect(frame.commands[0].args).toEqual([4, 12, 8, 4]);
});

it('refuses GPU selection at CPU-only pool/range boundaries instead of silently using software', async () => {
  const renderer = new CanvasFrameRenderer(scene);
  try { await expect(encodeCanvasRange(renderer, '/unused.mp4', { gpu: {} })).rejects.toMatchObject({ code: 'GPU_UNSUPPORTED' }); }
  finally { renderer.close(); }
  await expect(renderCanvasModule('/missing-module', '/unused.mp4', { gpu: {} })).rejects.toMatchObject({ code: 'GPU_UNSUPPORTED' });
});

it('preserves an existing destination when native initialization fails or a render is interrupted', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'helios-gpu-failure-'));
  const output = join(directory, 'output.mp4');
  try {
    await writeFile(output, 'previous-output');
    await expect(renderGpuCanvasVideo(scene, output, { executable: '/missing-gpu-helper' })).rejects.toMatchObject({ code: process.platform === 'darwin' && process.arch === 'arm64' ? 'PROCESS_START' : 'GPU_UNSUPPORTED' });
    expect((await readFile(output)).toString()).toBe('previous-output');
    const controller = new AbortController(); controller.abort(new Error('stop'));
    await expect(renderGpuCanvasVideo(scene, output, { signal: controller.signal })).rejects.toThrow('stop');
    expect((await readFile(output)).toString()).toBe('previous-output');
  } finally { await rm(directory, { recursive: true, force: true }); }
});
