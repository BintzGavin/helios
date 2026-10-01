import { readFile, writeFile, mkdir, mkdtemp } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { tmpdir, platform, arch } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { buildCorpus } from './corpus.js';
import { parsePlan } from '../src/plan.js';
import { FileStore, digest } from '../src/storage.js';
import { RenderService } from '../src/jobs.js';
import { NativeBackend } from '../src/backend.js';
import { probeVideo, renderFrame, prepareScene } from '../src/render.js';

const args = process.argv.slice(2), flag = (name: string) => { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1]; };
const execute = promisify(execFile);
const mediaTools = { ffmpeg: flag('--ffmpeg'), ffprobe: flag('--ffprobe') };
async function treeRss(pid: number): Promise<number> {
  const { stdout } = await execute('ps', ['-A', '-o', 'pid=,ppid=,rss=']);
  const rows = stdout.trim().split('\n').map(line => line.trim().split(/\s+/).map(Number));
  const included = new Set([pid]); let changed = true;
  while (changed) { changed = false; for (const [child, parent] of rows) if (included.has(parent) && !included.has(child)) { included.add(child); changed = true; } }
  return rows.filter(([child]) => included.has(child)).reduce((sum, row) => sum + row[2], 0) / 1024;
}
if (args.includes('--worker')) {
  const directory = flag('--out')!, id = flag('--case')!, rasterizer = flag('--rasterizer') === 'wasm' ? 'wasm' : flag('--rasterizer') === 'skia' ? 'skia' : 'native';
  const plan = parsePlan(JSON.parse(await readFile(join(directory, 'assets', `${id}.json`), 'utf8')));
  const assets = new Map(Object.entries(plan.assets).map(([key, asset]) => [key, join(directory, 'assets', asset.sha256)]));
  const started = performance.now(), cpu = process.cpuUsage();
  const service = new RenderService(new FileStore(join(directory, `${id}-${rasterizer}-store`)), new NativeBackend({ ...mediaTools, rasterizer }), { workspace: join(directory, 'work'), chunkFrames: 90 });
  for (const [key, asset] of Object.entries(plan.assets)) await service.upload('benchmark', asset.sha256, createReadStream(assets.get(key)!), asset.bytes);
  let job = await service.submit('benchmark', `${id}-${Date.now()}`, plan); const stages = [];
  while (!['succeeded', 'failed', 'canceled'].includes(job.state)) { const t = performance.now(), phase = job.state; job = await service.advance('benchmark', job.id); stages.push({ phase, ms: performance.now() - t, completedChunks: job.completedChunks }); }
  const deliveredMs = performance.now() - started;
  process.send?.({ phase: 'delivered' });
  if (job.state !== 'succeeded') throw new Error(`${id}: ${job.error?.code ?? job.state}`);
  const file = join(directory, `${id}-${rasterizer}.mp4`), object = await service.artifact('benchmark', job.id), pieces = [];
  for await (const bytes of object.stream()) pieces.push(bytes); await writeFile(file, Buffer.concat(pieces));
  const info = await probeVideo(file, mediaTools), prepareStart = performance.now(), prepared = await prepareScene(plan, assets, mediaTools);
  const first = await renderFrame(plan, 0, assets, { ...mediaTools, prepared, rasterizer }), firstFrameMs = performance.now() - prepareStart;
  await writeFile(join(directory, `${id}-${rasterizer}.png`), first.png);
  const indices = [...new Set([plan.frameCount - 1, 0, Math.floor(plan.frameCount / 2)])], hashes: Record<number, string> = {};
  for (const index of indices) hashes[index] = digest((await renderFrame(plan, index, assets, { ...mediaTools, prepared, rasterizer })).pixels);
  for (const index of [...indices].reverse()) if (digest((await renderFrame(plan, index, assets, { ...mediaTools, prepared, rasterizer })).pixels) !== hashes[index]) throw new Error('Shuffled frame determinism failed');
  const used = process.cpuUsage(cpu);
  await writeFile(join(directory, `${id}-${rasterizer}.result.json`), JSON.stringify({ id, rasterizer, engine: job.engine, planSha256: digest(JSON.stringify(plan)), status: 'passed', deliveredMs, fps: plan.frameCount / (deliveredMs / 1000), outputSeconds: info.duration, frameCount: info.frameCount, dimensions: [info.width, info.height], bytes: job.output!.bytes, assetBytes: Object.values(plan.assets).reduce((s, a) => s + a.bytes, 0), firstFrameWarmProcessMs: firstFrameMs, parentCpuMs: (used.user + used.system) / 1000, parentCpuExcludesCodecChildren: true, stages, shuffledFrameHashes: hashes }, null, 2));
} else {
  const directory = flag('--out') ? resolve(flag('--out')!) : await mkdtemp(join(tmpdir(), 'helios-portable-bench-'));
  await mkdir(directory, { recursive: true });
  const full = args.includes('--full'), rasterizer = flag('--rasterizer') === 'wasm' ? 'wasm' : flag('--rasterizer') === 'skia' ? 'skia' : 'native';
  const fixtures = await buildCorpus(join(directory, 'assets'), !full), wanted = flag('--cases')?.split(',');
  const results: unknown[] = [];
  for (const fixture of fixtures.filter(f => !wanted || wanted.includes(f.id))) {
    console.log(`Running ${fixture.id}: ${fixture.name} (${full ? 'full' : 'smoke'})`);
    const child = spawn(process.execPath, ['--import', 'tsx', fileURLToPath(import.meta.url), '--worker', '--case', fixture.id, '--rasterizer', rasterizer, '--out', directory, ...(mediaTools.ffmpeg ? ['--ffmpeg', mediaTools.ffmpeg] : []), ...(mediaTools.ffprobe ? ['--ffprobe', mediaTools.ffprobe] : [])], { stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
    let peak: number | null = null, renderPeak: number | null = null, delivered = false, pending = false, stderr = ''; child.stderr!.on('data', b => { stderr = (stderr + b.toString()).slice(-2000); });
    child.on('message', message => { if ((message as { phase?: string }).phase === 'delivered') delivered = true; });
    const timer = setInterval(() => { if (!pending && child.pid) { pending = true; const rendering = !delivered; treeRss(child.pid).then(rss => { peak = Math.max(peak ?? 0, rss); if (rendering) renderPeak = Math.max(renderPeak ?? 0, rss); }).catch(() => {}).finally(() => { pending = false; }); } }, 200);
    const started = performance.now();
    const code = await new Promise<number | null>((done, reject) => { child.once('error', reject); child.once('close', done); }); clearInterval(timer);
    const wallMs = performance.now() - started;
    const result = code === 0 ? { ...JSON.parse(await readFile(join(directory, `${fixture.id}-${rasterizer}.result.json`), 'utf8')), peakRenderProcessTreeMiB: renderPeak, peakIncludingOracleMiB: peak, isolatedProcessWallMs: wallMs } : { id: fixture.id, status: 'failed', code, diagnostic: stderr, peakRenderProcessTreeMiB: renderPeak, peakIncludingOracleMiB: peak, isolatedProcessWallMs: wallMs };
    results.push(result); console.log(JSON.stringify({ id: fixture.id, status: result.status, peakProcessTreeMiB: peak, seconds: wallMs / 1000 }));
    await writeFile(join(directory, 'results.json'), JSON.stringify({ mode: full ? 'full-synthetic' : 'smoke', host: { platform: platform(), arch: arch(), node: process.version }, rasterizer, measurement: 'One fresh process per fixture; local durable workflow. RSS sampled every 200ms across renderer and descendants. No economic or cloud qualification; no Chromium comparator.', results }, null, 2));
  }
  console.log(`Results and playable videos: ${directory}`);
  if (results.some((r: any) => r.status !== 'passed')) process.exitCode = 1;
}
