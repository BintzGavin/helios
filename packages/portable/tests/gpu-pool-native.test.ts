import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { recordGpuCanvas, renderGpuCanvasVideo } from '../src/gpu.js';
import { probeVideo } from '../src/render.js';
import { NV12_REFERENCE_FILTER } from '../benchmarks/gpu-reference.js';
import type { CanvasComposition } from '../src/canvas.js';

const helper = fileURLToPath(new URL('../native/target/release/helios-gpu', import.meta.url));
const scene: CanvasComposition = { width: 320, height: 180, fps: { num: 30000, den: 1001 }, frameCount: 36, background: '#18202c', draw(ctx, { index }) {
  ctx.fillStyle = '#ff0000'; ctx.beginPath(); ctx.arc(32 + index * 4, 64, 22, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.scale(1.5, 0.75); ctx.fillStyle = '#00ff00'; ctx.beginPath(); ctx.arc(128, 140 - index, 20, 0, Math.PI * 2); ctx.fill(); ctx.restore();
} };
const ffmpeg = '/opt/homebrew/bin/ffmpeg', ffprobe = '/opt/homebrew/bin/ffprobe';
const run = (command: string, args: string[], input?: Buffer | string) => {
  const result = spawnSync(command, args, { input, timeout: 30000, maxBuffer: 16 * 1024 * 1024 });
  expect(result.error).toBeUndefined(); expect(result.status, result.stderr?.toString()).toBe(0); return result.stdout;
};
describe.runIf(process.platform === 'darwin' && process.arch === 'arm64' && existsSync(helper))('bounded native encoder pool', () => {
  it('drains every pooled frame at exact cadence, retains the direct oracle and passes unchanged per-frame floors', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'helios-gpu-pool-quality-'));
    try {
      const input = [JSON.stringify({ fonts: {} })];
      for (let index = 0; index < scene.frameCount; index++) input.push(JSON.stringify(await recordGpuCanvas(scene, index)));
      const messages = input.join('\n') + '\n';
      const raw = run(helper, ['reference', '320', '180', '30000', '1001', '4000000', '/unused', '', '', '30', '3'], messages);
      expect(raw.length).toBe(320 * 180 * 3 / 2 * scene.frameCount);
      const reference = join(directory, 'reference.mkv');
      run(ffmpeg, ['-v', 'error', '-f', 'rawvideo', '-pixel_format', 'nv12', '-video_size', '320x180', '-framerate', '30000/1001', '-i', 'pipe:0', '-vf', NV12_REFERENCE_FILTER, '-c:v', 'ffv1', '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', reference], raw);
      expect(run(ffmpeg, ['-v', 'error', '-i', reference, '-pix_fmt', 'nv12', '-f', 'rawvideo', 'pipe:1'])).toEqual(raw);
      for (const encoderPool of [1, 3] as const) {
        const output = join(directory, `pool${encoderPool}.mp4`), trace = join(directory, `pool${encoderPool}.jsonl`);
        await renderGpuCanvasVideo(scene, output, { encoderPool, gop: 30, bitrate: 4_000_000, ffmpeg, ffprobe, trace });
        expect(await probeVideo(output, { ffprobe })).toMatchObject({ frameCount: 36, fps: { num: 30000, den: 1001 } });
        const rows = (await readFile(trace, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
        expect(rows.at(-1)).toMatchObject({ event: 'encoder-finish', frames: 36, capacity: encoderPool, allCallbacksComplete: true });
        expect(rows.at(-1).peakInFlight).toBeLessThanOrEqual(encoderPool);
        expect(rows.filter(row => row.event === 'encoder-callback')).toHaveLength(36);
        const ssim = join(directory, `pool${encoderPool}-ssim.log`), psnr = join(directory, `pool${encoderPool}-psnr.log`);
        run(ffmpeg, ['-v', 'error', '-filter_complex_threads', '1', '-i', output, '-i', reference, '-filter_complex', `[0:v]settb=1/30,setpts=N,split=2[a][b];[1:v]settb=1/30,setpts=N,split=2[c][d];[a][c]ssim=stats_file=${ssim}:shortest=1:repeatlast=0[s];[b][d]psnr=stats_file=${psnr}:shortest=1:repeatlast=0[p]`, '-map', '[s]', '-map', '[p]', '-f', 'null', '-']);
        const stat = (text: string, key: string) => [...text.matchAll(new RegExp(`(?:^| )${key}:([0-9.]+|inf)`, 'gm'))].map(match => match[1] === 'inf' ? Infinity : Number(match[1]));
        const ssimRows = stat(await readFile(ssim, 'utf8'), 'Y'), psnrText = await readFile(psnr, 'utf8');
        expect(ssimRows).toHaveLength(36); expect(Math.min(...ssimRows)).toBeGreaterThanOrEqual(0.995);
        for (const [key, floor] of [['psnr_y', 40], ['psnr_u', 35], ['psnr_v', 35]] as const) { const values = stat(psnrText, key); expect(values).toHaveLength(36); expect(Math.min(...values)).toBeGreaterThanOrEqual(floor); }
      }
    } finally { await rm(directory, { recursive: true, force: true }); }
  }, 30000);
  it('preserves an existing destination on pooled cancellation', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'helios-gpu-pool-abort-')), controller = new AbortController();
    try {
      const output = join(directory, 'output.mp4'); await writeFile(output, 'previous');
      await expect(renderGpuCanvasVideo(scene, output, { encoderPool: 3, signal: controller.signal, onFrame: index => { if (index === 4) controller.abort(); } })).rejects.toBeDefined();
      expect(await readFile(output, 'utf8')).toBe('previous');
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
});
