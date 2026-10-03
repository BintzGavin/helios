import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { existsSync } from 'node:fs';
import { renderGpuCanvasVideo, recordGpuCanvas } from '../src/gpu.js';
import { probeVideo, renderFrame, renderVideo } from '../src/render.js';
import { parsePlan } from '../src/plan.js';
import type { CanvasComposition } from '../src/canvas.js';
import { createCanvas } from '../src/skia-binding.js';

// Actual host integration. Build the release helper before running this suite.
// No capability flag or software encoder substitutes for successful initialization.
describe.runIf(process.platform === 'darwin' && process.arch === 'arm64' && existsSync(fileURLToPath(new URL('../native/target/release/helios-gpu', import.meta.url))))('native Metal hardware boundary', () => {
  it('initializes Skia Metal and a required hardware encoder without software fallback', () => {
    const helper = fileURLToPath(new URL('../native/target/release/helios-gpu', import.meta.url));
    const result = spawnSync(helper, ['probe'], { encoding: 'utf8', timeout: 30000 });
    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr).toBe(0);
    const receipt = JSON.parse(result.stdout);
    expect(receipt).toMatchObject({ protocol: 2, gop: 90 });
    expect(receipt.rasterizer).toBe('skia-metal');
    expect(receipt.encoder).toBe('videotoolbox');
    expect(receipt.hardwareRequired).toBe(true);
    expect(receipt.hardwareUsed).toBe(true);
    expect(receipt.surface).toBe('iosurface-nv12');
  });
  const scene: CanvasComposition = { width: 64, height: 32, frameCount: 8, fps: { num: 30000, den: 1001 }, background: '#ffffff', draw(ctx, { index }) { ctx.fillStyle = '#ff0000'; ctx.fillRect(index * 4, 8, 8, 8); } };
  it('renders transformed circle paths with CPU Canvas geometry and fill semantics', async () => {
    const helper = fileURLToPath(new URL('../native/target/release/helios-gpu', import.meta.url));
    const circles: CanvasComposition = { ...scene, width: 128, height: 128, draw(ctx) {
      ctx.scale(2, 1); ctx.translate(10, 10); ctx.beginPath(); ctx.arc(20, 30, 12, 0, Math.PI * 2);
      ctx.save(); ctx.translate(100, 100); ctx.fillStyle = '#ff0000'; ctx.fill(); ctx.restore();
      ctx.beginPath(); ctx.arc(40, 70, 8, 0, Math.PI * 2); ctx.fillStyle = '#0000ff'; ctx.fill();
    } };
    const frame = await recordGpuCanvas(circles, 0);
    const result = spawnSync(helper, ['raster', '128', '128', '30', '1', '4000000', '/unused'], { input: JSON.stringify({ fonts: {} }) + '\n' + JSON.stringify(frame) + '\n', timeout: 30000 });
    expect(result.status, result.stderr.toString()).toBe(0);
    const cpu = createCanvas(128, 128), ctx = cpu.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 128, 128);
    await circles.draw(ctx, { index: 0, time: 0, fonts: {} });
    const expected = ctx.getImageData(0, 0, 128, 128).data;
    expect(result.stdout.length).toBe(expected.length);
    let difference = 0;
    for (let i = 0; i < expected.length; i++) difference += Math.abs(result.stdout[i] - expected[i]);
    expect(difference / expected.length).toBeLessThan(1);
    const pixel = (x: number, y: number) => [...result.stdout.subarray((y * 128 + x) * 4, (y * 128 + x) * 4 + 4)];
    expect(pixel(60, 40)).toEqual([255, 0, 0, 255]);
    expect(pixel(100, 80)).toEqual([0, 0, 255, 255]);
    expect(pixel(60, 60)).toEqual([255, 255, 255, 255]);
  });
  it('records explicit GOP30 and encodes keyframes within that maximum interval', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'helios-gpu-gop-'));
    try {
      const output = join(directory, 'gop.mp4'), trace = join(directory, 'trace.jsonl');
      await renderGpuCanvasVideo({ ...scene, frameCount: 95, draw(ctx, { index }) { ctx.fillStyle = index % 2 ? '#ff0000' : '#0000ff'; ctx.beginPath(); ctx.arc(20 + index % 20, 16, 10, 0, Math.PI * 2); ctx.fill(); } }, output, { gop: 30, trace, ffmpeg: '/opt/homebrew/bin/ffmpeg', ffprobe: '/opt/homebrew/bin/ffprobe', bitrate: 4_000_000 });
      const rows = (await readFile(trace, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
      expect(rows[0]).toMatchObject({ gop: 30, protocol: 2 });
      const probe = spawnSync('/opt/homebrew/bin/ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_frames', '-show_entries', 'frame=key_frame', '-of', 'json', output], { encoding: 'utf8', timeout: 30000 });
      expect(probe.status, probe.stderr).toBe(0);
      const frames = JSON.parse(probe.stdout).frames;
      expect(frames).toHaveLength(95);
      const keys = frames.flatMap((frame: any, index: number) => frame.key_frame === 1 ? [index] : []);
      expect(keys[0]).toBe(0);
      const ends = [...keys.slice(1), frames.length];
      for (let i = 0; i < keys.length; i++) expect(ends[i] - keys[i]).toBeLessThanOrEqual(30);
    } finally { await rm(directory, { recursive: true, force: true }); }
  }, 30000);
  it('rejects invalid GOP and oversized direct-native frame messages', () => {
    const helper = fileURLToPath(new URL('../native/target/release/helios-gpu', import.meta.url));
    for (const gop of ['0', '301', '1.5']) {
      const result = spawnSync(helper, ['raster', '64', '32', '30', '1', '4000000', '/unused', '', '', gop], { encoding: 'utf8', timeout: 30000 });
      expect(result.status).toBe(1); expect(result.stderr).toMatch(/GOP|integer/);
    }
    const result = spawnSync(helper, ['raster', '64', '32', '30', '1', '4000000', '/unused'], { input: '{"fonts":{}}\n' + ' '.repeat(32 * 1024 * 1024 + 1) + '\n', encoding: 'utf8', timeout: 30000 });
    expect(result.status).toBe(1); expect(result.stderr).toContain('message budget');
  });
  it('preserves the frame-returning API with explicitly requested GPU readback', async () => {
    const plan = parsePlan({ version: 'portable-v1', width: 64, height: 32, fps: { num: 30, den: 1 }, frameCount: 2, background: '#ffffff', nodes: [{ id: 'red', type: 'rect', x: 4, y: 8, width: 8, height: 8, fill: '#ff0000' }] });
    const frame = await renderFrame(plan, 1, new Map(), { rasterizer: 'gpu' });
    expect([...frame.pixels.subarray((10 * 64 + 6) * 4, (10 * 64 + 6) * 4 + 4)]).toEqual([255, 0, 0, 255]);
    expect(frame.png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    expect(frame.svg).toContain('#ff0000');
  });
  it('converts known sRGB colors to limited-range BT.709 NV12 on the GPU', async () => {
    const helper = fileURLToPath(new URL('../native/target/release/helios-gpu', import.meta.url));
    const colors = [[0,0,0], [1,1,1], [1,0,0], [0,1,0], [0,0,1], [0.5,0.5,0.5]];
    const expected = [[16,128,128], [235,128,128], [63,102,240], [173,42,26], [32,240,118], [115,128,128]];
    const messages = [JSON.stringify({ fonts: {} }), ...colors.map(rgb => JSON.stringify({ background: [...rgb, 1], commands: [] }))];
    const result = spawnSync(helper, ['reference', '64', '32', '30', '1', '4000000', '/unused'], { input: messages.join('\n') + '\n', timeout: 30000 });
    expect(result.status, result.stderr.toString()).toBe(0);
    const bytes = 64 * 32 * 3 / 2;
    for (let frame = 0; frame < colors.length; frame++) {
      const actual = [result.stdout[frame * bytes], result.stdout[frame * bytes + 64 * 32], result.stdout[frame * bytes + 64 * 32 + 1]];
      actual.forEach((component, index) => expect(Math.abs(component - expected[frame][index])).toBeLessThanOrEqual(1));
    }
    expect(JSON.parse(result.stderr.toString())).toMatchObject({ explicitRawReadbackBytes: bytes * colors.length });
  });
  it('seeks directly into the GPU rasterizer and produces identical lossless bytes in shuffled order', async () => {
    const helper = fileURLToPath(new URL('../native/target/release/helios-gpu', import.meta.url));
    const messages = [JSON.stringify({ fonts: {} })];
    for (const index of [7, 0, 7]) messages.push(JSON.stringify(await recordGpuCanvas(scene, index)));
    const result = spawnSync(helper, ['raster', '64', '32', '30000', '1001', '1000000', '/unused'], { input: messages.join('\n') + '\n', timeout: 30000 });
    expect(result.error).toBeUndefined(); expect(result.status, result.stderr.toString()).toBe(0);
    const bytes = 64 * 32 * 4;
    expect(result.stdout.length).toBe(3 * bytes);
    expect(result.stdout.subarray(0, bytes)).toEqual(result.stdout.subarray(bytes * 2));
    expect([...result.stdout.subarray(bytes + (10 * 64 + 2) * 4, bytes + (10 * 64 + 2) * 4 + 4)]).toEqual([255, 0, 0, 255]);
    expect(JSON.parse(result.stderr.toString())).toMatchObject({ explicitRawReadbackBytes: 3 * bytes, zeroCopyProved: false });
  });
  it('encodes all changing surfaces at exact rational cadence and publishes only a verified range', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'helios-gpu-hardware-'));
    try {
      const output = join(directory, 'range.mp4'), frames: number[] = [];
      const trace = join(directory, 'trace.jsonl');
      await renderGpuCanvasVideo(scene, output, { start: 2, end: 8, trace, onFrame: index => { frames.push(index); }, ffmpeg: '/opt/homebrew/bin/ffmpeg', ffprobe: '/opt/homebrew/bin/ffprobe', bitrate: 4_000_000 });
      expect(frames).toEqual([2, 3, 4, 5, 6, 7]);
      expect(await probeVideo(output, { ffprobe: '/opt/homebrew/bin/ffprobe' })).toMatchObject({ frameCount: 6, width: 64, height: 32, fps: { num: 30000, den: 1001 }, codec: 'h264' });
      const rows = (await readFile(trace, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
      const surface = rows.shift(); expect(surface.encoderPool).toBe(true);
      expect(rows.filter(row => row.event.includes('readback'))).toHaveLength(0);
      for (let index = 0; index < 6; index++) {
        const events = rows.filter(row => row.frame === index);
        expect(events.map(row => row.event)).toEqual(['raster-submitted', 'conversion-complete', 'encoder-submit', 'encoder-callback', 'surface-recyclable']);
        expect(events[1].sameIOSurfacePlanes).toBe(true);
        expect(events[1].gpuEndSeconds).toBeGreaterThan(events[1].gpuStartSeconds);
        expect(events[2].surfaceId).toBe(surface.surfaceId);
        if (index < 5) expect(rows.indexOf(events[4])).toBeLessThan(rows.findIndex(row => row.frame === index + 1));
      }
    } finally { await rm(directory, { recursive: true, force: true }); }
  }, 30000);
  it('kills an interrupted native render and preserves the previous published artifact', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'helios-gpu-abort-'));
    const controller = new AbortController();
    try {
      const output = join(directory, 'range.mp4'); await writeFile(output, 'previous');
      await expect(renderGpuCanvasVideo(scene, output, { signal: controller.signal, onFrame: index => { if (index === 2) controller.abort(new Error('interrupt')); } })).rejects.toBeDefined();
      expect((await readFile(output)).toString()).toBe('previous');
    } finally { await rm(directory, { recursive: true, force: true }); }
  }, 30000);
  it('selects GPU video through the retained Plan API and refuses unsupported scene media', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'helios-gpu-plan-'));
    try {
      const plan = parsePlan({ version: 'portable-v1', width: 64, height: 32, fps: { num: 30, den: 1 }, frameCount: 2, nodes: [{ id: 'box', type: 'rect', x: 4, y: 8, width: 8, height: 8, fill: '#ff0000' }] });
      const output = join(directory, 'plan.mp4');
      const options = { rasterizer: 'gpu' as const, ffmpeg: '/opt/homebrew/bin/ffmpeg', ffprobe: '/opt/homebrew/bin/ffprobe' };
      await renderVideo(plan, new Map(), output, options);
      expect(await probeVideo(output, options)).toMatchObject({ frameCount: 2, width: 64, height: 32, codec: 'h264' });
      await expect(renderVideo({ ...plan, nodes: [{ ...plan.nodes[0], type: 'image' }] }, new Map(), output, options)).rejects.toMatchObject({ code: 'GPU_UNSUPPORTED_MEDIA' });
      expect(await probeVideo(output, options)).toMatchObject({ frameCount: 2 });
    } finally { await rm(directory, { recursive: true, force: true }); }
  }, 30000);
});
