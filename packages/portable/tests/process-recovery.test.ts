import { expect, it } from 'vitest';
import { fork } from 'node:child_process';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { RenderService } from '../src/jobs.js';
import { NativeBackend } from '../src/backend.js';
import { FileStore, digest } from '../src/storage.js';
import { parsePlan, type Plan } from '../src/plan.js';
import { runProcess } from '../src/process.js';
import { Resvg } from '@resvg/resvg-js';

it.each((['native', 'skia'] as const).flatMap(rasterizer => ['render', 'upload', 'commit', 'finalize'].map(phase => ({ rasterizer, phase }))))('recovers after a real SIGKILL at the $phase boundary with $rasterizer', async ({ phase, rasterizer }) => {
  const dir = await mkdtemp(join(tmpdir(), 'helios-portable-kill-'));
  const fresh = (root = dir) => new RenderService(new FileStore(join(root, 'store')), new NativeBackend({ rasterizer }), { workspace: join(root, 'work'), chunkFrames: 5, leaseMs: 1200, pollMs: 100 });
  let child: ReturnType<typeof fork> | undefined;
  try {
    const service = fresh();
    let plan = parsePlan({ version: 'portable-v1', width: 160, height: 90, fps: { num: 30000, den: 1001 }, frameCount: 11, nodes: [] });
    let expectedOutput: string | undefined;
    if (rasterizer === 'skia') {
      const clean = fresh(join(dir, 'oracle')), source = join(dir, 'source.mp4');
      await runProcess('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=size=160x90:rate=30:duration=1', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', source]);
      const files: [string, Plan['assets'][string]['type'], Buffer][] = [
        ['video', 'video', await readFile(source)],
        ['font', 'font', await readFile(new URL('./fixtures/fonts/NotoSans-Regular.ttf', import.meta.url))],
        ['image', 'image', Buffer.from(new Resvg('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#00ff00"/></svg>').render().asPng())],
      ];
      const assets: Plan['assets'] = {};
      for (const [id, type, bytes] of files) {
        assets[id] = { sha256: digest(bytes), bytes: bytes.length, type };
        await service.upload('tenant', assets[id].sha256, bytes, bytes.length);
        await clean.upload('tenant', assets[id].sha256, bytes, bytes.length);
      }
      plan = parsePlan({ ...plan, assets, nodes: [
        { id: 'footage', type: 'video', asset: 'video', width: 160, height: 90, sourceStart: 0.1 },
        { id: 'badge', type: 'image', asset: 'image', x: 5, y: 5, width: 12, height: 12 },
        { id: 'title', type: 'text', text: 'Durable pixels', fonts: ['font'], width: 150, x: 5, y: 30, fontSize: 18, fill: '#ffffff' },
      ] });
      let oracle = await clean.submit('tenant', 'clean', plan);
      for (let step = 0; step < 8 && oracle.state !== 'succeeded'; step++) oracle = await clean.advance('tenant', oracle.id);
      expect(oracle.state).toBe('succeeded'); expectedOutput = oracle.output!.sha256;
    }
    let job = await service.submit('tenant', `kill-${phase}`, plan);
    await service.advance('tenant', job.id); job = await service.advance('tenant', job.id);
    if (phase === 'finalize') while (job.completedChunks < job.totalChunks) job = await service.advance('tenant', job.id);
    const committed = job.completedChunks;
    child = fork(fileURLToPath(new URL('./fixtures/fault-worker.ts', import.meta.url)), [dir, job.id, phase, rasterizer], { execArgv: ['--import', 'tsx'], stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
    await new Promise<void>((done, reject) => {
      const timeout = setTimeout(() => reject(new Error('Fault checkpoint was not reached')), 10000);
      child!.once('error', reject); child!.once('exit', () => { clearTimeout(timeout); reject(new Error('Fault worker exited before its checkpoint')); });
      child!.once('message', () => { clearTimeout(timeout); done(); });
    });
    const exited = new Promise<void>(done => child!.once('exit', () => done())); child.kill('SIGKILL'); await exited;
    expect((await fresh().get('tenant', job.id)).completedChunks).toBe(committed);
    await expect(fresh().artifact('tenant', job.id)).rejects.toMatchObject({ code: 'NOT_READY' });
    await new Promise(done => setTimeout(done, 1300));
    const resumed = fresh();
    for (let attempt = 0; attempt < 8; attempt++) { job = await resumed.advance('tenant', job.id); if (job.state === 'succeeded') break; }
    expect(job.state).toBe('succeeded'); expect(job.completedChunks).toBe(3);
    expect((await resumed.artifact('tenant', job.id)).size).toBe(job.output!.bytes);
    if (expectedOutput) expect(job.output!.sha256).toBe(expectedOutput);
  } finally { child?.kill('SIGKILL'); await rm(dir, { recursive: true, force: true }); }
}, 20000);
