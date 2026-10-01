import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { once } from 'node:events';
import { parsePlan, frameTime, type Plan } from '../src/plan.js';
import { prepareScene, videoEncoderArgs } from '../src/render.js';
import { SkiaRasterizer } from '../src/skia.js';
import { VideoDecoder, activeVideos } from '../src/media.js';
import { startProcess, runProcess } from '../src/process.js';

const args = process.argv.slice(2), option = (key: string, fallback: string) => args.includes(key) ? args[args.indexOf(key) + 1] : fallback;
const directory = resolve(option('--out', '/private/tmp/helios-compare-final'));
const assetDirectory = resolve(option('--assets', '/private/tmp/helios-portable-bench-final/assets'));
const ffmpeg = option('--ffmpeg', 'ffmpeg'), ffprobe = option('--ffprobe', 'ffprobe');
const results: any[] = [];
function stats(text: string): Record<string, number>[] {
  return text.trim().split('\n').filter(Boolean).map(line => Object.fromEntries([...line.matchAll(/([A-Za-z_]+):([\d.e+\-]+|inf)/g)].map(([, name, value]) => [name, value === 'inf' ? Infinity : Number(value)])));
}
async function measured(label: string, plan: Plan, input: string[], write?: (child: ReturnType<typeof startProcess>) => Promise<void>) {
  const ssimPath = join(directory, `${label}.ssim.txt`), psnrPath = join(directory, `${label}.psnr.txt`);
  // Both inputs have the same dimensions, cadence and time origin. The optional
  // producer supplies raw sRGB; conversion exactly matches the production encoder.
  const planArgs = videoEncoderArgs(plan, 1, 'unused');
  const conversion = write ? planArgs[planArgs.indexOf('-vf') + 1] + ',' : '';
  const graph = `[0:v]split=2[a][b];[1:v]${conversion}split=2[c][d];[a][c]ssim=stats_file='${ssimPath}'[s];[b][d]psnr=stats_file='${psnrPath}'[p]`;
  const child = startProcess(ffmpeg, ['-v', 'error', '-y', '-filter_complex_threads', '1', ...input, '-filter_complex', graph, '-map', '[s]', '-map', '[p]', '-f', 'null', 'pipe:1'], { timeoutMs: 300000 });
  child.child.stdout.resume();
  try { if (write) await write(child); child.child.stdin.end(); await child.done; }
  catch (error) { child.kill(); await child.done.catch(() => {}); throw error; }
  const ssim = stats(await readFile(ssimPath, 'utf8')), psnr = stats(await readFile(psnrPath, 'utf8'));
  const min = (values: number[]) => Math.min(...values), mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
  return { frames: ssim.length, psnrFrames: psnr.length, minSsimY: min(ssim.map(x => x.Y)), meanSsimY: mean(ssim.map(x => x.Y)), minPsnrY: min(psnr.map(x => x.psnr_y)), minPsnrU: min(psnr.map(x => x.psnr_u)), minPsnrV: min(psnr.map(x => x.psnr_v)) };
}
async function pngPixels(path: string): Promise<Buffer> {
  return runProcess(ffmpeg, ['-v', 'error', '-threads', '1', '-i', path, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-threads', '1', 'pipe:1'], { maxBytes: 1920 * 1920 * 4 });
}
function pixelDifference(a: Buffer, b: Buffer) {
  if (a.length !== b.length) throw new Error('Frame pixel dimensions differ');
  const histogram = new Float64Array(256); let sum = 0, square = 0;
  for (let i = 0; i < a.length; i++) if (i % 4 !== 3) { const delta = Math.abs(a[i] - b[i]); histogram[delta]++; sum += delta; square += delta * delta; }
  const count = a.length / 4 * 3; let cumulative = 0, p99 = 0;
  for (let i = 0; i < 256; i++) { cumulative += histogram[i]; if (cumulative >= count * 0.99) { p99 = i; break; } }
  return { meanAbsoluteRgbError: sum / count, p99AbsoluteRgbError: p99, fractionRgbChannelsOver8: histogram.slice(9).reduce((a, b) => a + b, 0) / count, rgbPsnr: square ? 10 * Math.log10(255 ** 2 / (square / count)) : null };
}
for (const id of option('--cases', 'B01,B02,B03,B05,B08').split(',')) {
  const plan = parsePlan(JSON.parse(await readFile(join(directory, `${id}.json`), 'utf8')));
  const assets = new Map(Object.entries(plan.assets).map(([id, asset]) => [id, join(assetDirectory, asset.sha256)]));
  const input = (variant: string) => ['-threads', '1', '-i', join(directory, `${id}-${variant}-0.mp4`)];
  const comparisons: Record<string, unknown> = {};
  for (const variant of ['reference', 'chromium']) comparisons[variant] = await measured(`${id}-skia-vs-${variant}`, plan, [...input('skia'), ...input(variant)]);
  const prepared = await prepareScene(plan, assets, { ffmpeg, ffprobe }), scene = new SkiaRasterizer(plan, prepared), decoders = new Map<string, VideoDecoder>();
  await scene.prepare();
  let encoded;
  try {
    encoded = await measured(`${id}-skia-vs-uncompressed`, plan, [...input('skia'), '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${plan.width}x${plan.height}`, '-r', `${plan.fps.num}/${plan.fps.den}`, '-i', 'pipe:0'], async child => {
      for (let frame = 0; frame < plan.frameCount; frame++) {
        const active = activeVideos(plan, frame), ids = new Set(active.map(node => node.id)); scene.retainVideos(ids);
        for (const [id, decoder] of decoders) if (!ids.has(id)) { await decoder.close(); decoders.delete(id); }
        for (const node of active) {
          const info = prepared.videos.get(node.asset!)!;
          const source = Math.floor(((node.sourceStart ?? 0) + frameTime(plan.fps, frame - (node.start ?? 0))) * info.fps.num / info.fps.den + 1e-7);
          let decoder = decoders.get(node.id);
          if (!decoder) { decoder = new VideoDecoder(assets.get(node.asset!)!, source, info, { ffmpeg, format: 'rgba' }); decoders.set(node.id, decoder); }
          scene.setVideo(node.id, await decoder.frame(source), info.width, info.height);
        }
        if (!child.child.stdin.write(scene.render(frame).pixels)) await Promise.race([once(child.child.stdin, 'drain'), child.done.then(() => { throw new Error('Quality comparison ended early'); })]);
      }
    });
  } finally { await Promise.all([...decoders.values()].map(decoder => decoder.close())); }
  const samples = [];
  for (const frame of [0, Math.floor(plan.frameCount / 2), plan.frameCount - 1]) {
    const skia = await pngPixels(join(directory, `${id}-skia-0-frame${frame}.png`));
    for (const variant of ['reference', 'chromium']) samples.push({ frame, variant, ...pixelDifference(skia, await pngPixels(join(directory, `${id}-${variant}-0-frame${frame}.png`))) });
  }
  const frameCountsPass = [encoded, ...Object.values(comparisons) as typeof encoded[]].every(row => row.frames === plan.frameCount && row.psnrFrames === plan.frameCount);
  const outputQualityGatePass = frameCountsPass && encoded.minSsimY >= 0.995 && encoded.minPsnrY >= 40 && encoded.minPsnrU >= 35 && encoded.minPsnrV >= 35;
  const result = { id, frameCount: plan.frameCount, outputQualityGatePass, encodedVsUncompressedAfterPinnedYuvConversion: encoded, encodedCrossRendererComparisons: comparisons, uncompressedSamples: samples };
  results.push(result); console.log(JSON.stringify(result));
  await writeFile(join(directory, 'quality.json'), JSON.stringify({ note: 'Repeat-zero videos; all-frame output quality and cross-renderer comparison. Cross-renderer comparisons are not codec-loss gates. No full-corpus or deployed qualification claim.', results }, null, 2));
}
if (results.some(result => !result.outputQualityGatePass)) process.exitCode = 1;
