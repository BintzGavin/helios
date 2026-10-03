/** One fresh-process attempt. Orchestration must balance sequential repetitions. */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import { pipeline } from 'node:stream/promises';
import { createTextGrid, TEXT_GRID } from './fframes-textgrid.mjs';
import { recordGpuCanvas, renderGpuCanvasVideo } from '../src/gpu.js';
import { parsePlan } from '../src/plan.js';
import { probeVideo, videoEncoderArgs } from '../src/render.js';
import { runProcess, startProcess } from '../src/process.js';
import { NV12_REFERENCE_FILTER } from './gpu-reference.js';

const args = process.argv.slice(2);
const option = (name: string, fallback = '') => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const directory = resolve(option('--out'));
if (!option('--out') || !option('--font')) throw new Error('--out and --font are required');
const mode = option('--mode', 'hardware');
if (!['hardware', 'software', 'reference-hardware', 'reference-software'].includes(mode)) throw new Error('Unknown GPU lane');
const purpose = option('--purpose', 'screen');
if (!['smoke', 'screen', 'reference', 'warmup', 'timed'].includes(purpose)) throw new Error('Unknown attempt purpose');
const font = await readFile(resolve(option('--font')));
const fontSha256 = createHash('sha256').update(font).digest('hex');
if (fontSha256 !== '9ae2da663d64342031e59b5fa680dd355171d021b7ebf83774efc7c0330ae7b5') throw new Error('Continuity fixture font identity mismatch');
const composition = createTextGrid(font), frames = Number(option('--frames', '300'));
if (!Number.isInteger(frames) || frames < 1 || frames > TEXT_GRID.frames || (purpose === 'timed' && frames !== TEXT_GRID.frames)) throw new Error('Invalid continuity frame range');
const bitrate = Number(option('--bitrate', '20000000'));
if (!Number.isSafeInteger(bitrate) || bitrate < 100000 || bitrate > 200000000) throw new Error('Invalid bitrate');
const gop = Number(option('--gop', '90'));
if (!Number.isSafeInteger(gop) || gop < 1 || gop > 300) throw new Error('Invalid GOP');
const executable = fileURLToPath(new URL('../native/target/release/helios-gpu', import.meta.url));
const nativeSha256 = createHash('sha256').update(await readFile(executable)).digest('hex');
const ffmpeg = option('--ffmpeg', 'ffmpeg'), ffprobe = option('--ffprobe', 'ffprobe');
const software = { preset: 'medium' as const, crf: Number(option('--crf', '11')), threads: 2, colorConversion: 'srgb-bt709' as const };
if (purpose === 'timed') {
  const qualification = JSON.parse(await readFile(resolve(option('--qualification')), 'utf8'));
  if (!qualification.passed || qualification.frames !== 300 || qualification.fontSha256 !== fontSha256 || qualification.nativeSha256 !== nativeSha256 || qualification.mode !== mode || (mode === 'hardware' && (qualification.bitrate !== bitrate || qualification.gop !== gop)) || (mode === 'software' && qualification.crf !== software.crf)) throw new Error('Timed lane lacks matching all-frame quality qualification');
}
await mkdir(directory, { recursive: true });
// Never overwrite an earlier failed/slow/interrupted attempt.
const receiptPath = join(directory, 'attempt.json');
const attempt: Record<string, unknown> = { status: 'running', purpose, mode, timingQualified: false, frames, width: 1920, height: 1080, fps: '30/1', nodes: 3334, fontSha256, nativeSha256, bitrate, gop, nativeProtocol: 2, software, rawReadback: mode !== 'hardware', zeroCopyProved: false, startedAt: new Date().toISOString() };
await writeFile(receiptPath, JSON.stringify(attempt, null, 2), { flag: 'wx' });
const started = performance.now();
try {
  const output = join(directory, mode.startsWith('reference-') ? 'reference.mkv' : 'video.mp4');
  if (mode === 'hardware') {
    await renderGpuCanvasVideo(composition, output, { end: frames, bitrate, gop, ffmpeg, ffprobe, trace: join(directory, 'transfer.jsonl'), onTimings: timings => { attempt.apiTimings = timings; }, ...(option('--capture') ? { capture: resolve(option('--capture')) } : {}) });
  } else {
    const reference = mode.startsWith('reference-');
    const helperMode = mode === 'reference-hardware' ? 'reference' : 'raster';
    const plan = parsePlan({ version: 'portable-v1', width: 1920, height: 1080, fps: { num: 30, den: 1 }, frameCount: frames, nodes: [] });
    const filterArgs = videoEncoderArgs(plan, frames, output, 'rgba', software);
    const filter = filterArgs[filterArgs.indexOf('-vf') + 1];
    const encoding = reference ? ['-hide_banner', '-loglevel', 'error', '-y', '-filter_threads', '1', '-f', 'rawvideo', '-pix_fmt', helperMode === 'reference' ? 'nv12' : 'rgba', '-s', '1920x1080', '-r', '30', '-i', 'pipe:0', '-vf', helperMode === 'reference' ? NV12_REFERENCE_FILTER : filter, '-c:v', 'ffv1', '-level', '3', '-threads', '2', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv', '-frames:v', String(frames), output] : filterArgs;
    const encoder = startProcess(ffmpeg, encoding, { timeoutMs: 300000 }); encoder.child.stdout.resume();
    const producer = startProcess(executable, [helperMode, '1920', '1080', '30', '1', String(bitrate), '/unused', join(directory, 'transfer.jsonl'), '', String(gop)], { timeoutMs: 300000 });
    const feeding = (async () => {
      const send = async (message: unknown) => { if (!producer.child.stdin.write(JSON.stringify(message) + '\n')) await Promise.race([once(producer.child.stdin, 'drain'), producer.done.then(() => { throw new Error('Native producer exited before all frames'); })]); };
      await send({ fonts: { dm: font.toString('base64') } });
      for (let frame = 0; frame < frames; frame++) await send(await recordGpuCanvas(composition, frame));
      producer.child.stdin.end();
    })();
    try { await Promise.all([feeding, pipeline(producer.child.stdout, encoder.child.stdin), producer.done, encoder.done]); }
    catch (error) { producer.kill(); encoder.kill(); await Promise.allSettled([producer.done, encoder.done, feeding]); throw error; }
    finally { await writeFile(join(directory, 'native.stderr.log'), producer.diagnostic()); await writeFile(join(directory, 'encoder.stderr.log'), encoder.diagnostic()); }
  }
  const apiVerificationMs = (attempt.apiTimings as { verificationMs: number } | undefined)?.verificationMs ?? 0;
  const renderingMs = performance.now() - started - apiVerificationMs;
  const info = await probeVideo(output, { ffprobe });
  if (info.frameCount !== frames || info.width !== 1920 || info.height !== 1080 || info.fps.num !== 30 * info.fps.den) throw new Error('Output violates dimensions/count/cadence');
  await writeFile(join(directory, 'ffprobe.json'), await runProcess(ffprobe, ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', output], { maxBytes: 65536 }));
  Object.assign(attempt, { status: 'complete', renderingMs, verificationMs: performance.now() - started - renderingMs, apiVerificationMs, timingQualified: purpose === 'timed', output });
} catch (error) {
  Object.assign(attempt, { status: 'failed', elapsedMs: performance.now() - started, error: error instanceof Error ? error.message : String(error) });
  process.exitCode = 1;
} finally {
  attempt.finishedAt = new Date().toISOString(); await writeFile(receiptPath, JSON.stringify(attempt, null, 2)); console.log(JSON.stringify(attempt));
}
