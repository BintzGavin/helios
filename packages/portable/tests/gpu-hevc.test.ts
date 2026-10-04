import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { renderGpuCanvasVideo, validateGpuOptions } from '../src/gpu.js';
import { probeVideo, renderVideo } from '../src/render.js';
import { parsePlan } from '../src/plan.js';

const supported = process.platform === 'darwin' && process.arch === 'arm64';
const helper = fileURLToPath(new URL('../native/target/release/helios-gpu', import.meta.url));
const scene = { width: 128, height: 128, fps: { num: 30000, den: 1001 }, frameCount: 41, draw(ctx: any, { index }: { index: number }) {
  ctx.fillStyle = '#ff0000'; ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#00ff00'; ctx.fillRect(64, 0, 64, 64);
  ctx.fillStyle = '#0000ff'; ctx.fillRect(0, 64, 64, 64);
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(80 + index % 12, 90, 12, 0, Math.PI * 2); ctx.fill();
} };

it.runIf(supported)('admits explicit HEVC while preserving H264 default and rejecting unknown codecs', () => {
  expect(() => validateGpuOptions({ codec: 'hevc' })).not.toThrow();
  expect(() => validateGpuOptions({})).not.toThrow();
  expect(() => validateGpuOptions({ codec: 'av1' as any })).toThrow(/codec/);
});

it.runIf(supported)('refuses stale, wrong-codec and software capability receipts before replacing the destination', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'helios-hevc-contract-'));
  try {
    const executable = join(directory, 'helper'), output = join(directory, 'video.mp4'), encoded = join(directory, 'encode-started');
    await writeFile(output, 'preserved destination');
    for (const mutation of [{ codec: 'h264' }, { protocol: 4 }, { hardwareRequired: false }, { hardwareUsed: false }]) {
      const receipt = { protocol: 6, codec: 'hevc', hardwareRequired: true, hardwareUsed: true, encoder: 'videotoolbox', ...mutation };
      await writeFile(executable, `#!${process.execPath}\nif (process.argv[2] !== 'probe') require('node:fs').writeFileSync(${JSON.stringify(encoded)}, 'started');\nprocess.stdin.resume(); process.stdin.on('end', () => console.log(JSON.stringify(${JSON.stringify(receipt)})));\n`);
      await chmod(executable, 0o755);
      await expect(renderGpuCanvasVideo(scene, output, { codec: 'hevc', executable })).rejects.toMatchObject({ code: 'INVALID_OUTPUT' });
      expect(await readFile(output, 'utf8')).toBe('preserved destination');
      expect(existsSync(encoded)).toBe(false);
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
});

it.runIf(supported)('refuses stale, wrong-codec and software completion receipts without publishing output', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'helios-hevc-receipt-'));
  try {
    const executable = join(directory, 'helper'), output = join(directory, 'video.mp4');
    await writeFile(output, 'preserved destination');
    for (const mutation of [{ protocol: 5 }, { codec: 'h264' }, { hardwareUsed: false }]) {
      const receipt = { protocol: 7, codec: 'hevc', transport: 'binary', frames: 1, encoder: 'videotoolbox', hardwareRequired: true, hardwareUsed: true, gop: 90, encoderPool: 1, bitrate: 20000000, configuredBitrate: 20000000, ...mutation };
      const probe = { protocol: 6, codec: 'hevc', encoder: 'videotoolbox', hardwareRequired: true, hardwareUsed: true };
      await writeFile(executable, `#!${process.execPath}\nprocess.stdin.resume(); process.stdin.on('end', () => console.log(JSON.stringify(process.argv[2] === 'probe' ? ${JSON.stringify(probe)} : ${JSON.stringify(receipt)})));\n`);
      await chmod(executable, 0o755);
      await expect(renderGpuCanvasVideo(scene, output, { codec: 'hevc', end: 1, executable })).rejects.toMatchObject({ code: 'INVALID_OUTPUT' });
      expect(await readFile(output, 'utf8')).toBe('preserved destination');
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
});

describe.runIf(supported && existsSync(helper))('required hardware HEVC', () => {
  it('preserves the retained Plan API with HEVC capability checks and exact selected range', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'helios-hevc-plan-'));
    try {
      const output = join(directory, 'plan.mp4');
      const plan = parsePlan({ version: 'portable-v1', width: 128, height: 128, fps: { num: 30000, den: 1001 }, frameCount: 4, background: '#ffffff', nodes: [{ id: 'red', type: 'rect', x: 4, y: 8, width: 40, height: 40, fill: '#ff0000' }] });
      const options = { rasterizer: 'gpu' as const, gpu: { codec: 'hevc' as const, bitrate: 4000000 }, start: 1, end: 4, ffmpeg: '/opt/homebrew/bin/ffmpeg', ffprobe: '/opt/homebrew/bin/ffprobe' };
      await renderVideo(plan, new Map(), output, options);
      expect(await probeVideo(output, options)).toMatchObject({ frameCount: 3, width: 128, height: 128, fps: { num: 30000, den: 1001 }, codec: 'hevc' });
    } finally { await rm(directory, { recursive: true, force: true }); }
  }, 30000);
  it('rejects unknown native codecs before initialization or file creation', () => {
    for (const args of [['probe', 'av1'], ['encode', '128', '128', '30', '1', '4000000', '/unused', '', '', '30', '3', 'av1']]) {
      const result = spawnSync(helper, args, { encoding: 'utf8', timeout: 30000 });
      expect(result.status).toBe(1); expect(result.stdout).toBe('');
      expect(result.stderr).toContain('codec'); expect(result.stderr).not.toContain('GPU_INIT_FAILED');
    }
  });
  for (const transport of ['json', 'binary'] as const) it(`publishes actual HEVC Main with exact range/cadence/color and drained pool (${transport})`, async () => {
    const directory = await mkdtemp(join(tmpdir(), 'helios-hevc-video-'));
    try {
      const output = join(directory, 'video.mp4'), trace = join(directory, 'trace.jsonl');
      await renderGpuCanvasVideo(scene, output, { codec: 'hevc', transport, start: 5, end: 41, bitrate: 20000000, gop: 12, ...(transport === 'binary' ? { encoderPool: 3 as const } : {}), trace, ffmpeg: '/opt/homebrew/bin/ffmpeg', ffprobe: '/opt/homebrew/bin/ffprobe' });
      const result = spawnSync('/opt/homebrew/bin/ffprobe', ['-v', 'error', '-count_frames', '-show_streams', '-of', 'json', output], { encoding: 'utf8' });
      expect(result.status, result.stderr).toBe(0);
      expect(JSON.parse(result.stdout).streams[0]).toMatchObject({ codec_name: 'hevc', codec_tag_string: 'hvc1', profile: 'Main', width: 128, height: 128, avg_frame_rate: '30000/1001', nb_read_frames: '36', color_range: 'tv', color_space: 'bt709', color_transfer: 'bt709', color_primaries: 'bt709' });
      const rows = (await readFile(trace, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
      expect(rows[0]).toMatchObject({ protocol: 6, codec: 'hevc', hardwareRequired: true, hardwareUsed: true, poolCapacity: transport === 'binary' ? 3 : 1 });
      expect(rows.at(-1)).toMatchObject({ frames: 36, allCallbacksComplete: true });
      expect(rows.filter(row => row.event === 'conversion-complete')).toHaveLength(36);
      expect(rows.filter(row => row.event === 'encoder-callback')).toHaveLength(36);
    } finally { await rm(directory, { recursive: true, force: true }); }
  }, 30000);
});
