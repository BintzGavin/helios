import { expect, it } from 'vitest';
import { mkdtemp, rm, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// Exercise the built worker entry point as it will run on a server.
import { renderCanvasModule } from '../dist/canvas-pool.js';
import { probeVideo } from '../src/render.js';
import { runProcess } from '../src/process.js';

it('stitches concurrent ranges in timeline order without replaying earlier frames', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'helios-canvas-pool-'));
  try {
    const output = join(dir, 'pool.mp4');
    const result = await renderCanvasModule(new URL('./fixtures/canvas-composition.mjs', import.meta.url), output, { concurrency: 2, chunkFrames: 2, start: 2, end: 8 });
    expect(result).toMatchObject({ frames: 6, chunks: 3, workers: 2 });
    expect(result.ranges.filter(range => range.preparationMs > 0)).toHaveLength(2);
    expect(result.ranges.filter(range => range.preparationMs === 0)).toHaveLength(1);
    expect(await probeVideo(output)).toMatchObject({ frameCount: 6, fps: { num: 30, den: 1 } });
    const rgba = await runProcess('ffmpeg', ['-v', 'error', '-i', output, '-f', 'rawvideo', '-pix_fmt', 'rgba', 'pipe:1']);
    for (let frame = 0; frame < 6; frame++) {
      const base = frame * 64 * 32 * 4, x = (frame + 2) * 4 + 2;
      expect(rgba[base + (10 * 64 + x) * 4 + 1]).toBeLessThan(40);
      expect(rgba[base + (10 * 64 + 2) * 4 + 1]).toBeGreaterThan(230);
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
}, 30000);

it('preserves an existing output when a worker composition fails', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'helios-canvas-pool-'));
  try {
    const output = join(dir, 'output.mp4'), module = join(dir, 'broken.mjs'); await writeFile(output, 'original');
    await writeFile(module, `export default {width:32,height:32,fps:{num:30,den:1},frameCount:4,draw(){throw new Error('failed')}}`);
    await expect(renderCanvasModule(module, output, { concurrency: 2, chunkFrames: 2 })).rejects.toMatchObject({ code: 'CANVAS_WORKER' });
    expect(await readFile(output, 'utf8')).toBe('original');
  } finally { await rm(dir, { recursive: true, force: true }); }
}, 30000);

it('rejects invalid CPU budgets and canceled jobs before loading a module', async () => {
  await expect(renderCanvasModule('/not-a-module.mjs', '/unused.mp4', { concurrency: 0 })).rejects.toMatchObject({ code: 'INVALID_CONCURRENCY' });
  const controller = new AbortController(); controller.abort(new Error('stop'));
  await expect(renderCanvasModule('/not-a-module.mjs', '/unused.mp4', { signal: controller.signal })).rejects.toThrow('stop');
});


it('cancels an active worker range and keeps its previous delivered artifact', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'helios-canvas-cancel-'));
  try {
    const output = join(dir, 'output.mp4'), controller = new AbortController(); await writeFile(output, 'original');
    await expect(renderCanvasModule(new URL('./fixtures/canvas-composition.mjs', import.meta.url), output, { concurrency: 2, chunkFrames: 2, signal: controller.signal, onProgress() { controller.abort(new Error('stop')); } })).rejects.toThrow();
    expect(await readFile(output, 'utf8')).toBe('original');
    const { readdir } = await import('node:fs/promises');
    expect((await readdir(dir)).filter(name => name.startsWith('.helios-canvas-'))).toEqual([]);
  } finally { await rm(dir, { recursive: true, force: true }); }
}, 30000);


it('refuses delivery when the final decode count disagrees with complete internal packets', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'helios-canvas-verify-'));
  try {
    const output = join(dir, 'output.mp4'), probe = join(dir, 'probe.mjs'); await writeFile(output, 'original');
    await writeFile(probe, `#!${process.execPath}\nconst packets=process.argv.includes('-count_packets');console.log(JSON.stringify({streams:[{codec_type:'video',codec_name:'h264',width:64,height:32,avg_frame_rate:'30/1',nb_read_packets:'2',nb_read_frames:'7',duration:packets?'0.066666667':'0.266666667'}],format:{duration:'0.266666667'}}));`, { mode: 0o700 });
    await expect(renderCanvasModule(new URL('./fixtures/canvas-composition.mjs', import.meta.url), output, { concurrency: 2, chunkFrames: 2, ffprobe: probe })).rejects.toMatchObject({ code: 'INVALID_OUTPUT' });
    expect(await readFile(output, 'utf8')).toBe('original');
  } finally { await rm(dir, { recursive: true, force: true }); }
}, 30000);
