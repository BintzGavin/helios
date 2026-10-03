import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { runProcess } from '../src/process.js';
import { probeVideo } from '../src/render.js';

const args = process.argv.slice(2), option = (name: string, fallback = '') => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
if (!option('--attempt') || !option('--reference')) throw new Error('--attempt and --reference directories are required');
const directory = resolve(option('--attempt')), referenceDirectory = resolve(option('--reference'));
const attempt = JSON.parse(await readFile(join(directory, 'attempt.json'), 'utf8'));
const reference = JSON.parse(await readFile(join(referenceDirectory, 'attempt.json'), 'utf8'));
if (attempt.status !== 'complete' || reference.status !== 'complete' || attempt.frames !== 300 || reference.frames !== 300 || attempt.mode !== reference.mode.replace('reference-', '') || attempt.fontSha256 !== reference.fontSha256 || attempt.nativeSha256 !== reference.nativeSha256) throw new Error('Incomplete or mismatched own-rasterizer oracle');
const ffmpeg = option('--ffmpeg', 'ffmpeg'), ffprobe = option('--ffprobe', 'ffprobe');
const name = option('--receipt', 'quality');
if (!/^[a-z0-9-]+$/.test(name)) throw new Error('Invalid quality receipt name');
for (const file of [attempt.output, reference.output]) {
  const info = await probeVideo(file, { ffprobe });
  if (info.frameCount !== 300 || info.width !== 1920 || info.height !== 1080 || info.fps.num !== 30 * info.fps.den || info.audioCodec) throw new Error('Quality input violates continuity cadence');
  const raw = await runProcess(ffprobe, ['-v', 'error', '-threads', '1', '-select_streams', 'v:0', '-show_frames', '-show_entries', 'frame=best_effort_timestamp:stream=time_base,color_range,color_space,color_transfer,color_primaries', '-of', 'json', file]);
  const decoded = JSON.parse(raw.toString()), stream = decoded.streams[0];
  const [num, den] = stream.time_base.split('/').map(Number);
  if (!Number.isInteger(num) || !Number.isInteger(den) || num <= 0 || den <= 0 || decoded.frames.length !== 300 || stream.color_range !== 'tv' || stream.color_space !== 'bt709' || stream.color_transfer !== 'bt709' || stream.color_primaries !== 'bt709') throw new Error('Quality input violates delivery color/time-base contract');
  for (let index = 0; index < 300; index++) {
    const pts = decoded.frames[index].best_effort_timestamp;
    // References use a millisecond container clock; allow at most half a tick
    // of quantization. MP4's exact 30-fps clock must match every frame exactly.
    if (!Number.isSafeInteger(pts) || Math.abs(pts * num * 30 - index * den) > num * 15) throw new Error(`Decoded frame ${index} violates rational cadence`);
  }
  await writeFile(join(directory, `${name}-cadence-${file === attempt.output ? 'candidate' : 'reference'}.json`), raw, { flag: 'wx' });
}
const ssimPath = join(directory, `${name}-ssim.txt`), psnrPath = join(directory, `${name}-psnr.txt`);
// Both inputs have independently passed the decoded cadence contract. Normalize
// their container time bases by decoded frame index before comparing pixels;
// Matroska's millisecond timestamps otherwise create spurious framesync repeats.
const graph = `[0:v]settb=1/30,setpts=N,split=2[a][b];[1:v]settb=1/30,setpts=N,split=2[c][d];[a][c]ssim=shortest=1:repeatlast=0:stats_file='${ssimPath}'[s];[b][d]psnr=shortest=1:repeatlast=0:stats_file='${psnrPath}'[p]`;
await runProcess(ffmpeg, ['-v', 'error', '-filter_complex_threads', '1', '-threads', '1', '-i', attempt.output, '-threads', '1', '-i', reference.output, '-filter_complex', graph, '-map', '[s]', '-map', '[p]', '-f', 'null', 'pipe:1'], { timeoutMs: 300000 });
function stats(text: string) { return text.trim().split('\n').filter(Boolean).map(line => Object.fromEntries([...line.matchAll(/([A-Za-z_]+):([\d.e+\-]+|inf)/g)].map(([, key, value]) => [key, value === 'inf' ? Infinity : Number(value)]))); }
const ssim = stats(await readFile(ssimPath, 'utf8')), psnr = stats(await readFile(psnrPath, 'utf8'));
const minimum = (rows: Record<string, number>[], key: string) => Math.min(...rows.map(row => row[key]));
if (attempt.engine !== reference.engine || attempt.enginePin !== reference.enginePin) throw new Error('Reference engine identity differs from candidate');
const result = { frames: ssim.length, psnrFrames: psnr.length, minSsimY: minimum(ssim, 'Y'), minPsnrY: minimum(psnr, 'psnr_y'), minPsnrU: minimum(psnr, 'psnr_u'), minPsnrV: minimum(psnr, 'psnr_v'), mode: attempt.mode, engine: attempt.engine, enginePin: attempt.enginePin, bitrate: attempt.bitrate, gop: attempt.gop ?? 90, nativeProtocol: attempt.nativeProtocol, crf: attempt.software.crf, nativeSha256: attempt.nativeSha256, fontSha256: attempt.fontSha256, reference: reference.output, video: attempt.output, deliveryColor: 'bt709-limited', passed: false };
result.passed = result.frames === 300 && result.psnrFrames === 300 && result.minSsimY >= 0.995 && result.minPsnrY >= 40 && result.minPsnrU >= 35 && result.minPsnrV >= 35;
await writeFile(join(directory, `${name}.json`), JSON.stringify(result, null, 2), { flag: 'wx' });
console.log(JSON.stringify(result)); if (!result.passed) process.exitCode = 1;
