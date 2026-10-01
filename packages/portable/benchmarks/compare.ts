import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { platform, arch, cpus, totalmem } from 'node:os';
import { parsePlan, evaluate, type Node, type Plan } from '../src/plan.js';
import { digest } from '../src/storage.js';

const args = process.argv.slice(2), value = (key: string, fallback = '') => args.includes(key) ? args[args.indexOf(key) + 1] : fallback;
const output = resolve(value('--out', '/private/tmp/helios-portable-comparison'));
const assetsPath = resolve(value('--assets', '/private/tmp/helios-portable-bench-final/assets'));
const tools = { ffmpeg: value('--ffmpeg', 'ffmpeg'), ffprobe: value('--ffprobe', 'ffprobe') };
const execute = promisify(execFile);
await mkdir(output, { recursive: true });
function windowPlan(plan: Plan, count: number): Plan {
  count = Math.min(count, plan.frameCount);
  const visit = (nodes: Node[]): Node[] => nodes.filter(n => (n.start ?? 0) < count).map(node => {
    const n = structuredClone(node); if (n.end) n.end = Math.min(n.end, count);
    for (const object of [n, n.transform]) if (object) for (const [key, val] of Object.entries(object)) if (val && typeof val === 'object' && 'keyframes' in val) {
      const keys = val.keyframes.filter((k: any) => k.frame < count);
      if (keys.length && keys[keys.length - 1].frame < count - 1) keys.push({ frame: count - 1, value: evaluate(val, count - 1) });
      (object as any)[key] = keys.length ? { keyframes: keys } : evaluate(val, 0);
    }
    if (n.children) n.children = visit(n.children); return n;
  });
  return parsePlan({ ...plan, frameCount: count, nodes: visit(plan.nodes), audio: plan.audio.filter(a => a.start < count).map(a => ({ ...a, end: Math.min(a.end, count) })) });
}
if (args.includes('--worker')) {
  const id = value('--case'), variant = value('--variant'), repeat = Number(value('--repeat', '0')), label = `${id}-${variant}-${repeat}`;
  const packageRoot = ['reference', 'baseline-skia'].includes(variant) ? resolve(value('--reference', '/private/tmp/helios-perf-baseline/packages/portable')) : fileURLToPath(new URL('../', import.meta.url));
  const [runtime, storage, jobs, render] = await Promise.all(['backend', 'storage', 'jobs', 'render'].map(name => import(pathToFileURL(join(packageRoot, 'src', `${name}.ts`)).href)));
  const plan = parsePlan(JSON.parse(await readFile(join(output, `${id}.json`), 'utf8')));
  const assets = new Map(Object.entries(plan.assets).map(([id, asset]) => [id, join(assetsPath, asset.sha256)]));
  const started = performance.now();
  const backend = variant === 'chromium' ? new (await import('./chromium.js')).ChromiumBackend(value('--chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'), tools) : new runtime.NativeBackend({ ...tools, rasterizer: ['skia', 'baseline-skia'].includes(variant) ? 'skia' : 'native' });
  try {
    const service = new jobs.RenderService(new storage.FileStore(join(output, `${label}-store`)), backend, { workspace: join(output, `${label}-work`), chunkFrames: 90 });
    for (const [id, asset] of Object.entries(plan.assets)) await service.upload('benchmark', asset.sha256, createReadStream(assets.get(id)!), asset.bytes);
    let job = await service.submit('benchmark', label, plan); const phases = [];
    while (!['succeeded', 'failed', 'canceled'].includes(job.state)) {
      const start = performance.now(), phase = job.state; job = await service.advance('benchmark', job.id);
      phases.push({ phase, ms: performance.now() - start, completedChunks: job.completedChunks });
    }
    const renderMs = performance.now() - started; process.send?.({ phase: 'delivered' });
    if (job.state !== 'succeeded') throw new Error(`Render failed: ${job.error?.code ?? job.state}`);
    const artifact = await service.artifact('benchmark', job.id), chunks = [];
    for await (const chunk of artifact.stream()) chunks.push(chunk);
    const video = join(output, `${label}.mp4`); await writeFile(video, Buffer.concat(chunks));
    const metadata = await render.probeVideo(video, tools);
    const samples = [...new Set([0, Math.floor(plan.frameCount / 2), plan.frameCount - 1])];
    const prepared = variant === 'chromium' ? undefined : await render.prepareScene(plan, assets, tools);
    for (const frame of samples) {
      const png = variant === 'chromium' ? await backend.screenshot(frame) : (await render.renderFrame(plan, frame, assets, { ...tools, prepared, rasterizer: ['skia', 'baseline-skia'].includes(variant) ? 'skia' : 'native' })).png;
      await writeFile(join(output, `${label}-frame${frame}.png`), png);
    }
    await writeFile(join(output, `${label}.json`), JSON.stringify({ id, variant, repeat, status: 'passed', engine: job.engine, browser: backend.version, planSha256: digest(JSON.stringify(plan)), renderMs, bytes: job.output.bytes, metadata, phases, samples }, null, 2));
  } finally { await backend.close?.(); }
} else {
  const wanted = value('--cases', 'B01,B02,B03,B05,B08').split(','), variants = value('--variants', 'reference,skia,chromium').split(','), repeats = Number(value('--repeats', '3')), count = Number(value('--frames', '150'));
  for (const id of wanted) { const plan = windowPlan(parsePlan(JSON.parse(await readFile(join(assetsPath, `${id}.json`), 'utf8'))), count); await writeFile(join(output, `${id}.json`), JSON.stringify(plan, null, 2)); }
  const results: any[] = [];
  for (const id of wanted) for (let repeat = 0; repeat < repeats; repeat++) for (let offset = 0; offset < variants.length; offset++) {
    const variant = variants[(repeat + offset) % variants.length], label = `${id}-${variant}-${repeat}`;
    console.log(`Running ${label}`);
    const child = spawn(process.execPath, ['--import', 'tsx', fileURLToPath(import.meta.url), ...args, '--worker', '--case', id, '--variant', variant, '--repeat', String(repeat)], { stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
    let diagnostic = '', peak: number | null = null, pending = false, delivered = false;
    child.stderr!.on('data', bytes => { diagnostic = (diagnostic + bytes.toString()).slice(-3000); });
    child.on('message', message => { if ((message as any).phase === 'delivered') delivered = true; });
    const sample = async () => {
      if (pending || delivered || !child.pid) return; pending = true;
      try {
        const { stdout } = await execute('ps', ['-A', '-o', 'pid=,ppid=,rss=']);
        const rows = stdout.trim().split('\n').map(line => line.trim().split(/\s+/).map(Number)), ids = new Set([child.pid]);
        for (let changed = true; changed;) { changed = false; for (const [pid, parent] of rows) if (ids.has(parent) && !ids.has(pid)) { ids.add(pid); changed = true; } }
        peak = Math.max(peak ?? 0, rows.filter(([pid]) => ids.has(pid)).reduce((sum, row) => sum + row[2], 0) / 1024);
      } catch { /* Missing memory data remains null. */ } finally { pending = false; }
    };
    const timer = setInterval(sample, 200), start = performance.now();
    const code = await new Promise<number | null>((done, reject) => { child.once('error', reject); child.once('close', done); }); clearInterval(timer);
    const result = code === 0 ? { ...JSON.parse(await readFile(join(output, `${label}.json`), 'utf8')), peakRenderProcessTreeMiB: peak, processWallMsIncludingOracles: performance.now() - start } : { id, variant, repeat, status: 'failed', diagnostic, code, peakRenderProcessTreeMiB: peak };
    results.push(result); console.log(JSON.stringify({ id, variant, repeat, status: result.status, renderSeconds: result.renderMs ? result.renderMs / 1000 : undefined, peakMiB: peak, diagnostic: result.diagnostic }));
    await writeFile(join(output, 'results.json'), JSON.stringify({ host: { platform: platform(), arch: arch(), node: process.version, cpu: cpus()[0].model, cpuCount: cpus().length, memoryGiB: totalmem() / 1024 ** 3 }, protocol: 'Sequential alternating fresh processes; OS caches uncontrolled. Identical frozen plans/assets, software H.264 fast/CRF18/two threads, AAC192k, 90-frame durable chunks, full output verification. Chromium uses the same drawing interpreter and pre-shaped glyphs, browser-native media and lossless CDP screenshots; not arbitrary HTML or WebCodecs export.', frames: count, repeats, tools, results }, null, 2));
  }
  if (results.some(result => result.status !== 'passed')) process.exitCode = 1;
}
