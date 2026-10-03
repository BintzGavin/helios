/** Matched Canvas/TextGrid comparator. CDP capture/tracing is outside jev-browser's contract API. */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { TEXT_GRID, drawTextGrid, hslToRgb } from './fframes-textgrid.mjs';
import { parsePlan } from '../src/plan.js';
import { videoEncoderArgs, probeVideo } from '../src/render.js';
import { runProcess, startProcess } from '../src/process.js';

const args = process.argv.slice(2), option = (name: string, fallback = '') => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
if (!option('--out') || !option('--font') || !option('--chrome')) throw new Error('--out, --font and --chrome are required');
const directory = resolve(option('--out')), font = await readFile(resolve(option('--font')));
const fontSha256 = createHash('sha256').update(font).digest('hex');
if (fontSha256 !== '9ae2da663d64342031e59b5fa680dd355171d021b7ebf83774efc7c0330ae7b5') throw new Error('Pinned font identity mismatch');
const mode = option('--mode', 'software'), purpose = option('--purpose', 'screen');
if (!['software', 'reference-software'].includes(mode) || !['smoke', 'screen', 'reference', 'warmup', 'timed', 'profile'].includes(purpose)) throw new Error('Unsupported Chromium lane/purpose');
const frames = Number(option('--frames', '300')), crf = Number(option('--crf', '11'));
if (!Number.isInteger(frames) || frames < 1 || frames > 300 || (purpose === 'timed' && frames !== 300)) throw new Error('Invalid continuity cadence');
const executablePath = resolve(option('--chrome'));
const enginePin = createHash('sha256').update(await readFile(executablePath)).digest('hex');
const ffmpeg = option('--ffmpeg', 'ffmpeg'), ffprobe = option('--ffprobe', 'ffprobe');
if (purpose === 'timed') {
  const quality = JSON.parse(await readFile(resolve(option('--qualification')), 'utf8'));
  if (!quality.passed || quality.frames !== 300 || quality.engine !== 'chromium-canvas' || quality.enginePin !== enginePin || quality.fontSha256 !== fontSha256 || quality.crf !== crf) throw new Error('Timed Chromium lane lacks matching all-frame quality qualification');
}
await mkdir(directory, { recursive: true });
const receiptPath = join(directory, 'attempt.json');
const attempt: Record<string, unknown> = { status: 'running', engine: 'chromium-canvas', enginePin, mode, purpose, timingQualified: false, gpuRasterProved: false, rawReadback: true, screenshotTransport: 'lossless-PNG-CDP-base64', width: 1920, height: 1080, fps: '30/1', nodes: 3334, frames, fontSha256, software: { preset: 'medium', crf, threads: 2, colorConversion: 'srgb-bt709' }, startedAt: new Date().toISOString() };
await writeFile(receiptPath, JSON.stringify(attempt, null, 2), { flag: 'wx' });
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
let encoder: ReturnType<typeof startProcess> | undefined;
const started = performance.now();
try {
  browser = await chromium.launch({ executablePath, headless: true, args: ['--force-color-profile=srgb'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.setContent('<!doctype html><style>html,body{margin:0;overflow:hidden;background:#0b1020}canvas{display:block}</style><canvas width="1920" height="1080"></canvas>');
  await page.addScriptTag({ content: `const TEXT_GRID=${JSON.stringify(TEXT_GRID)};const hslToRgb=${hslToRgb.toString()};const drawTextGrid=${drawTextGrid.toString()};const ctx=document.querySelector('canvas').getContext('2d');window.ready=(async()=>{const font=new FontFace('BenchDM','url(data:font/ttf;base64,${font.toString('base64')})');await font.load();document.fonts.add(font);await document.fonts.ready;window.drawFrame=index=>{ctx.reset();ctx.fillStyle='#0b1020';ctx.fillRect(0,0,1920,1080);drawTextGrid(ctx,{index,fonts:{dm:'BenchDM'}});};})();` });
  await page.evaluate(() => (window as any).ready);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false, screenWidth: 1920, screenHeight: 1080 });
  const system = await browser.newBrowserCDPSession();
  await writeFile(join(directory, 'gpu-capability.json'), JSON.stringify(await system.send('SystemInfo.getInfo'), null, 2));
  let traceDone: Promise<{ stream: string }> | undefined;
  if (purpose === 'profile') {
    traceDone = new Promise(resolve => system.once('Tracing.tracingComplete', resolve));
    await system.send('Tracing.start', { categories: 'gpu,cc,blink,disabled-by-default-skia.gpu,disabled-by-default-gpu.service,disabled-by-default-cc.debug', transferMode: 'ReturnAsStream' });
  }
  const output = join(directory, mode === 'software' ? 'video.mp4' : 'reference.mkv');
  const plan = parsePlan({ version: 'portable-v1', width: 1920, height: 1080, fps: { num: 30, den: 1 }, frameCount: frames, nodes: [] });
  const software = videoEncoderArgs(plan, frames, output, 'png', { preset: 'medium', crf, threads: 2, colorConversion: 'srgb-bt709' });
  const filter = software[software.indexOf('-vf') + 1];
  const encoding = mode === 'reference-software' ? ['-hide_banner', '-loglevel', 'error', '-y', '-filter_threads', '1', '-f', 'image2pipe', '-c:v', 'png', '-r', '30', '-i', 'pipe:0', '-vf', filter, '-c:v', 'ffv1', '-level', '3', '-threads', '2', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv', '-frames:v', String(frames), output] : software;
  encoder = startProcess(ffmpeg, encoding, { timeoutMs: 300000 }); encoder.child.stdout.resume();
  for (let index = 0; index < frames; index++) {
    await page.evaluate(index => (window as any).drawFrame(index), index);
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', optimizeForSpeed: true, clip: { x: 0, y: 0, width: 1920, height: 1080, scale: 1 }, captureBeyondViewport: true });
    const pixels = Buffer.from(data, 'base64');
    if (pixels.readUInt32BE(16) !== 1920 || pixels.readUInt32BE(20) !== 1080) throw new Error('Chromium screenshot violated exact capture dimensions');
    if (index === 0 && purpose === 'profile') await writeFile(join(directory, 'frame-0.png'), pixels);
    if (!encoder.child.stdin.write(pixels)) await Promise.race([once(encoder.child.stdin, 'drain'), encoder.done.then(() => { throw new Error('Chromium software encoder ended early'); })]);
  }
  encoder.child.stdin.end(); await encoder.done;
  const renderingMs = performance.now() - started;
  if (traceDone) {
    await system.send('Tracing.end'); const { stream } = await traceDone;
    let trace = '';
    for (;;) { const part = await system.send('IO.read', { handle: stream }); trace += part.data; if (part.eof) break; }
    await system.send('IO.close', { handle: stream });
    await writeFile(join(directory, 'chrome-trace.json'), trace);
  }
  await browser.close(); browser = undefined;
  const info = await probeVideo(output, { ffprobe });
  if (info.frameCount !== frames || info.width !== 1920 || info.height !== 1080 || info.fps.num !== 30 * info.fps.den || info.audioCodec) throw new Error('Chromium output violates cadence');
  await writeFile(join(directory, 'ffprobe.json'), await runProcess(ffprobe, ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', output]));
  Object.assign(attempt, { status: 'complete', renderingMs, verificationMs: performance.now() - started - renderingMs, output, timingQualified: purpose === 'timed' });
} catch (error) {
  encoder?.kill(); await encoder?.done.catch(() => {});
  Object.assign(attempt, { status: 'failed', elapsedMs: performance.now() - started, error: error instanceof Error ? error.message : String(error) }); process.exitCode = 1;
} finally {
  await browser?.close();
  if (encoder) await writeFile(join(directory, 'encoder.stderr.log'), encoder.diagnostic());
  attempt.finishedAt = new Date().toISOString(); await writeFile(receiptPath, JSON.stringify(attempt, null, 2)); console.log(JSON.stringify(attempt));
}
