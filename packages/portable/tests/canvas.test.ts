import { expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CanvasFrameRenderer, renderCanvasVideo, encodeCanvasRange, type CanvasComposition } from '../src/canvas.js';
import { probeVideo } from '../src/render.js';
import { runProcess } from '../src/process.js';

const scene = (): CanvasComposition => ({ width: 64, height: 32, fps: { num: 30, den: 1 }, frameCount: 8, background: '#ffffff', draw(ctx, frame) { ctx.fillStyle = '#ff0000'; ctx.fillRect(frame.index * 4, 8, 8, 8); } });

it('separates rasterization and pixel extraction timing without changing shuffled frame bytes', async () => {
  const renderer = new CanvasFrameRenderer(scene());
  const timings = { rasterizeMs: 0, pixelExtractionMs: 0 };
  try {
    const original = await renderer.render(7);
    await renderer.render(0, timings);
    expect(await renderer.render(7, timings)).toEqual(original);
    expect(timings.rasterizeMs).toBeGreaterThan(0);
    expect(timings.pixelExtractionMs).toBeGreaterThan(0);
  } finally { renderer.close(); }
});

it('retains the combined draw timer while reporting separate frame stages', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'helios-canvas-timing-'));
  const renderer = new CanvasFrameRenderer(scene());
  try {
    const stats = await encodeCanvasRange(renderer, join(dir, 'range.mp4'), { start: 2, end: 4 });
    expect(stats.frames).toBe(2);
    expect(stats.rasterizeMs).toBeGreaterThan(0);
    expect(stats.pixelExtractionMs).toBeGreaterThan(0);
    expect(stats.drawMs).toBeGreaterThanOrEqual(stats.rasterizeMs + stats.pixelExtractionMs);
    expect(stats.encoderWaitMs).toBeGreaterThanOrEqual(0);
  } finally { renderer.close(); await rm(dir, { recursive: true, force: true }); }
}, 30000);

it('resets drawing state and seeks directly to exact frames in any order', async () => {
  const composition = scene(), draw = composition.draw;
  composition.draw = (ctx, frame) => { draw(ctx, frame); ctx.globalAlpha = 0.1; ctx.translate(3, 2); };
  const renderer = new CanvasFrameRenderer(composition);
  try {
    const last = await renderer.render(7);
    const first = await renderer.render(0);
    expect([...first.subarray((10 * 64 + 2) * 4, (10 * 64 + 2) * 4 + 4)]).toEqual([255, 0, 0, 255]);
    expect([...last.subarray((10 * 64 + 2) * 4, (10 * 64 + 2) * 4 + 4)]).toEqual([255, 255, 255, 255]);
    await renderer.render(3);
    expect(await renderer.render(7)).toEqual(last);
    await expect(renderer.render(8)).rejects.toMatchObject({ code: 'INVALID_FRAME' });
  } finally { renderer.close(); }
  await expect(renderer.render(0)).rejects.toMatchObject({ code: 'CLOSED_RENDERER' });
});

it('renders a complete nonzero range with software encoding and exact frame indices', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'helios-canvas-'));
  try {
    const output = join(dir, 'range.mp4'), frames: number[] = [];
    await renderCanvasVideo(scene(), output, { start: 4, end: 8, onFrame: index => { frames.push(index); } });
    expect(frames).toEqual([4, 5, 6, 7]);
    expect(await probeVideo(output)).toMatchObject({ frameCount: 4, width: 64, height: 32, codec: 'h264', fps: { num: 30, den: 1 } });
    const rgba = await runProcess('ffmpeg', ['-v', 'error', '-i', output, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgba', 'pipe:1']);
    expect(rgba[(10 * 64 + 18) * 4]).toBeGreaterThan(230);
    expect(rgba[(10 * 64 + 2) * 4 + 1]).toBeGreaterThan(230);
  } finally { await rm(dir, { recursive: true, force: true }); }
}, 30000);

it('rejects invalid ranges and cancellation before launching an encoder', async () => {
  await expect(renderCanvasVideo(scene(), '/unused.mp4', { start: 3, end: 3, ffmpeg: '/does-not-exist' })).rejects.toMatchObject({ code: 'INVALID_RANGE' });
  const controller = new AbortController(); controller.abort(new Error('stop'));
  await expect(renderCanvasVideo(scene(), '/unused.mp4', { signal: controller.signal, ffmpeg: '/does-not-exist' })).rejects.toThrow('stop');
});

it('rejects concurrent use of one mutable surface and releases it after a failed draw', async () => {
  let release: () => void = () => {}, entered: () => void = () => {};
  const waiting = new Promise<void>(resolve => { entered = resolve; });
  const composition = scene(); composition.draw = async () => { entered(); await new Promise<void>(resolve => { release = resolve; }); throw new Error('draw failed'); };
  const renderer = new CanvasFrameRenderer(composition), first = renderer.render(0);
  await waiting;
  await expect(renderer.render(1)).rejects.toMatchObject({ code: 'BUSY_RENDERER' });
  release(); await expect(first).rejects.toThrow('draw failed');
  composition.draw = () => {};
  expect((await renderer.render(0)).length).toBe(64 * 32 * 4);
  renderer.close();
});


it('keeps explicit fonts alive while another renderer still uses them', async () => {
  const { readFile } = await import('node:fs/promises');
  const font = await readFile(new URL('./fixtures/fonts/NotoSans-Regular.ttf', import.meta.url));
  const composition = scene(); composition.fonts = { latin: font };
  composition.draw = (ctx, frame) => { ctx.font = `12px ${frame.fonts.latin}`; ctx.fillStyle = '#000000'; ctx.fillText('office', 2, 18); };
  const first = new CanvasFrameRenderer(composition), second = new CanvasFrameRenderer(composition);
  try {
    const before = await second.render(0); first.close();
    expect(await second.render(7)).toEqual(before);
    expect(before.some((value, index) => index % 4 !== 3 && value < 200)).toBe(true);
  } finally { first.close(); second.close(); }
});

it.each(['srgb-bt709', 'rgb-bt601'] as const)('preserves its explicit color conversion with %s', async colorConversion => {
  const dir = await mkdtemp(join(tmpdir(), 'helios-canvas-color-'));
  try {
    const composition = scene(); composition.background = '#808080'; composition.draw = () => {};
    const output = join(dir, 'gray.mp4'); await renderCanvasVideo(composition, output, { encoder: { colorConversion } });
    const yuv = await runProcess('ffmpeg', ['-v', 'error', '-i', output, '-frames:v', '1', '-pix_fmt', 'yuv420p', '-f', 'rawvideo', 'pipe:1']);
    const linear = ((128 / 255 + 0.055) / 1.055) ** 2.4;
    const expected = colorConversion === 'srgb-bt709' ? 16 + 219 * (1.099 * linear ** 0.45 - 0.099) : 16 + 219 * 128 / 255;
    expect(Math.abs(yuv[16 * 64 + 16] - expected)).toBeLessThan(2);
  } finally { await rm(dir, { recursive: true, force: true }); }
}, 30000);

it.each([{ threads: 0 }, { crf: -1 }, { gop: 0 }, { bframes: 17 }, { preset: 'fake' }, { qmin: 60, qmax: 15 }, { colorConversion: 'fake' }])('rejects invalid encoder settings before starting FFmpeg: %j', async encoder => {
  await expect(renderCanvasVideo(scene(), '/unused.mp4', { ffmpeg: '/does-not-exist', encoder: encoder as any })).rejects.toMatchObject({ code: 'INVALID_ENCODER' });
});

it('preserves the previous single-process export when an active render is canceled', async () => {
  const { readFile, writeFile, readdir } = await import('node:fs/promises');
  const dir = await mkdtemp(join(tmpdir(), 'helios-canvas-atomic-'));
  try {
    const output = join(dir, 'output.mp4'), controller = new AbortController(); await writeFile(output, 'original');
    await expect(renderCanvasVideo(scene(), output, { signal: controller.signal, onFrame: async () => {
      await new Promise(resolve => setTimeout(resolve, 150)); controller.abort(new Error('stop'));
    } })).rejects.toThrow();
    expect(await readFile(output, 'utf8')).toBe('original');
    expect((await readdir(dir)).filter(name => name.startsWith('.helios-canvas-'))).toEqual([]);
  } finally { await rm(dir, { recursive: true, force: true }); }
}, 30000);
