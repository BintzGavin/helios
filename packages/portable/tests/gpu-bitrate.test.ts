import { expect, it, describe } from 'vitest';
import { validateGpuOptions, renderGpuCanvasVideo } from '../src/gpu.js';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

it('admits the bounded higher bitrate targets while rejecting overflow and invalid numbers', () => {
  for (const bitrate of [0, -1, 99999, 1.5, NaN, Infinity, 1000000001, 4294967296, Number.MAX_SAFE_INTEGER]) expect(() => validateGpuOptions({ bitrate })).toThrow(/bitrate/);
  if (process.platform === 'darwin' && process.arch === 'arm64') for (const bitrate of [100000, 200000000, 500000000, 1000000000]) expect(() => validateGpuOptions({ bitrate })).not.toThrow();
});

const helper = fileURLToPath(new URL('../native/target/release/helios-gpu', import.meta.url));
describe.runIf(process.platform === 'darwin' && process.arch === 'arm64' && existsSync(helper))('hardware bitrate budget', () => {
  it('independently refuses native over-bound and integer-overflow requests', () => {
    for (const bitrate of ['1000000001', '4294967296', '-1', '1.5']) {
      const result = spawnSync(helper, ['raster', '64', '32', '30', '1', bitrate, '/unused'], { encoding: 'utf8', timeout: 30000 });
      expect(result.status).toBe(1); expect(result.stdout).toBe('');
      expect(result.stderr).not.toContain('missing font header');
      expect(result.stderr).not.toContain('GPU_INIT_FAILED');
    }
  });
  it('accepts and records 500Mbps on required VideoToolbox hardware', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'helios-gpu-bitrate-'));
    try {
      const trace = join(directory, 'trace.jsonl');
      await renderGpuCanvasVideo({ width: 128, height: 128, fps: { num: 30, den: 1 }, frameCount: 3, draw(ctx, { index }) { ctx.fillStyle = '#ff0000'; ctx.beginPath(); ctx.arc(32 + index, 64, 24, 0, Math.PI * 2); ctx.fill(); } }, join(directory, 'video.mp4'), { bitrate: 500000000, gop: 30, encoderPool: 3, trace, ffmpeg: '/opt/homebrew/bin/ffmpeg', ffprobe: '/opt/homebrew/bin/ffprobe' });
      const rows = (await readFile(trace, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
      expect(rows[0]).toMatchObject({ protocol: 4, bitrate: 500000000, configuredBitrate: 500000000 });
      expect(rows.at(-1)).toMatchObject({ frames: 3, allCallbacksComplete: true });
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
});
