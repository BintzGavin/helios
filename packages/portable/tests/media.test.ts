import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { digest } from '../src/storage.js';
import { parsePlan } from '../src/plan.js';
import { runProcess } from '../src/process.js';
import { prepareScene, renderFrame, renderVideo, probeVideo } from '../src/render.js';
import { mixAudio, VideoDecoder, videoInfo } from '../src/media.js';

const dirs: string[] = [];
afterEach(async () => { await Promise.all(dirs.splice(0).map(d => rm(d, { recursive: true, force: true }))); });
async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), 'helios-portable-media-')); dirs.push(dir);
  const video = join(dir, 'source.mp4'), audio = join(dir, 'audio.wav'), image = join(dir, 'image.png');
  await runProcess('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=size=160x90:rate=30:duration=1', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-g', '15', video]);
  await runProcess('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000:duration=1', '-ac', '2', '-c:a', 'pcm_f32le', audio]);
  await writeFile(image, new Resvg('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="#00ff00"/></svg>').render().asPng());
  const paths = new Map([['video', video], ['audio', audio], ['image', image]]), assets: any = {};
  for (const [id, path] of paths) { const bytes = await readFile(path); assets[id] = { sha256: digest(bytes), bytes: bytes.length, type: id }; }
  const plan = parsePlan({ version: 'portable-v1', width: 160, height: 90, fps: { num: 30, den: 1 }, frameCount: 15, background: '#ffffff', assets, nodes: [{ id: 'footage', type: 'video', asset: 'video', width: 160, height: 90, sourceStart: 0.2 }, { id: 'badge', type: 'image', asset: 'image', x: 5, y: 5, width: 20, height: 20 }], audio: [{ asset: 'audio', start: 0, end: 15, sourceStart: 0.1, gain: 0.5, fadeIn: 0.05, fadeOut: 0.05 }] });
  return { dir, paths, plan };
}
describe('complete media pipeline', () => {
  it('streams raw RGBA frames identical to the existing PNG decode path', async () => {
    const { paths } = await fixture(), path = paths.get('video')!;
    const info = await videoInfo(path);
    const raw = new VideoDecoder(path, 3, info, { format: 'rgba' });
    const png = new VideoDecoder(path, 3, info, {});
    try {
      for (const index of [3, 4, 4, 10]) {
        const pixels = await raw.frame(index);
        expect(pixels.length).toBe(info.width * info.height * 4);
        const bytes = await png.frame(index);
        const renderer = new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="${info.width}" height="${info.height}"><image href="data:image/png;base64,${bytes.toString('base64')}" width="${info.width}" height="${info.height}"/></svg>`);
        expect(pixels).toEqual(renderer.render().pixels);
      }
    } finally { await raw.close(); await png.close(); }
  });
  it.each(['native', 'skia'] as const)('seeks video independently and composites a still image with %s', async rasterizer => {
    const { plan, paths } = await fixture();
    const prepared = await prepareScene(plan, paths);
    const first = await renderFrame(plan, 0, paths, { prepared, rasterizer });
    const later = await renderFrame(plan, 10, paths, { prepared, rasterizer });
    expect(first.pixels).not.toEqual(later.pixels);
    expect((await renderFrame(plan, 0, paths, { prepared, rasterizer })).pixels).toEqual(first.pixels);
    const offset = (10 * 160 + 10) * 4;
    expect(Array.from(first.pixels.subarray(offset, offset + 4))).toEqual([0, 255, 0, 255]);
  }, 30000);
  it('mixes exactly the rational timeline sample count with deterministic fades', async () => {
    const { plan, paths, dir } = await fixture();
    const output = join(dir, 'mix.f32');
    await mixAudio(plan, paths, output);
    const bytes = await readFile(output);
    expect(bytes.length).toBe(24000 * 2 * 4);
    expect(bytes.readFloatLE(0)).toBe(0);
    expect(bytes.some(v => v !== 0)).toBe(true);
    await mixAudio(plan, paths, output);
    expect(await readFile(output)).toEqual(bytes);
  });
  it.each(['native', 'skia'] as const)('exports real H.264 + AAC with video, an image and timed audio with %s', async rasterizer => {
    const { plan, paths, dir } = await fixture();
    const output = join(dir, 'final.mp4');
    await renderVideo(plan, paths, output, { rasterizer });
    const info = await probeVideo(output);
    expect(info.frameCount).toBe(15);
    expect(info.audioCodec).toBe('aac');
    expect(info.duration).toBeCloseTo(0.5, 2);
  }, 30000);
  it('rejects mislabeled media and source trims beyond the available duration', async () => {
    const { plan, paths } = await fixture();
    plan.nodes[0].sourceStart = 2;
    await expect(prepareScene(plan, paths)).rejects.toMatchObject({ code: 'MEDIA_RANGE' });
    plan.nodes[0].sourceStart = 0;
    paths.set('video', paths.get('image')!);
    await expect(prepareScene(plan, paths)).rejects.toMatchObject({ code: 'INVALID_ASSET' });
  });
});
