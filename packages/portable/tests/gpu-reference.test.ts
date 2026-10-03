import { it, expect } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runProcess } from '../src/process.js';
import { NV12_REFERENCE_FILTER } from '../benchmarks/gpu-reference.js';

it('preserves GPU NV12 values byte for byte in the tagged lossless oracle', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'helios-gpu-reference-'));
  try {
    // Independent known limited-range BT.709 red samples, not an RGB converter.
    const source = Buffer.from([63, 63, 63, 63, 102, 240]);
    const input = join(directory, 'source.nv12'), output = join(directory, 'reference.mkv');
    await writeFile(input, source);
    await runProcess('ffmpeg', ['-v', 'error', '-filter_threads', '1', '-f', 'rawvideo', '-pix_fmt', 'nv12', '-s', '2x2', '-r', '30', '-i', input, '-vf', NV12_REFERENCE_FILTER, '-c:v', 'ffv1', '-level', '3', '-threads', '1', '-color_range', 'tv', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-frames:v', '1', output]);
    const pixels = await runProcess('ffmpeg', ['-v', 'error', '-threads', '1', '-i', output, '-frames:v', '1', '-pix_fmt', 'yuv420p', '-f', 'rawvideo', 'pipe:1']);
    expect(pixels).toEqual(source);
    const metadata = JSON.parse((await runProcess('ffprobe', ['-v', 'error', '-show_streams', '-of', 'json', output])).toString());
    expect(metadata.streams[0]).toMatchObject({ color_range: 'tv', color_space: 'bt709', color_transfer: 'bt709', color_primaries: 'bt709' });
  } finally { await rm(directory, { recursive: true, force: true }); }
}, 30000);
