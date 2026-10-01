import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileStore, readJson, jsonBytes, digest, ObjectStore, ByteSource } from '../src/storage.js';
import { RenderService } from '../src/jobs.js';
import { NativeBackend, RenderBackend } from '../src/backend.js';

const dirs: string[] = [];
afterEach(async () => { await Promise.all(dirs.splice(0).map(d => rm(d, { recursive: true, force: true }))); });
const plan = { version: 'portable-v1', width: 160, height: 90, fps: { num: 30000, den: 1001 }, frameCount: 11, background: '#ffffff', assets: {}, nodes: [], audio: [] };
const latch = () => { let resolve!: () => void; const promise = new Promise<void>(r => { resolve = r; }); return { promise, resolve }; };
async function setup() {
  const dir = await mkdtemp(join(tmpdir(), 'helios-portable-recovery-')); dirs.push(dir);
  const store = new FileStore(join(dir, 'store'));
  return { dir, store, options: { workspace: join(dir, 'work'), chunkFrames: 5, leaseMs: 3000, pollMs: 100 } };
}
describe('render recovery and fencing', () => {
  it('rejects a corrupted immutable artifact collision instead of publishing a second false success', async () => {
    const { store, options, dir } = await setup();
    const service = new RenderService(store, new NativeBackend(), options);
    let first = await service.submit('tenant', 'first-output', plan);
    while (first.state !== 'succeeded') first = await service.advance('tenant', first.id);
    const key = `a/${digest('tenant').slice(0, 32)}/${first.output!.sha256}`;
    const object = (await store.get(key))!;
    await writeFile(join(dir, 'store', 'objects', Buffer.from(key).toString('base64url'), `${object.version}.data`), Buffer.alloc(object.size));
    let second = await service.submit('tenant', 'second-output', plan);
    for (let i = 0; i < 12 && !['failed', 'succeeded'].includes(second.state); i++) second = await service.advance('tenant', second.id);
    expect(second.state).toBe('failed'); expect(second.error?.code).toBe('CORRUPT_OBJECT');
    await expect(service.artifact('tenant', second.id)).rejects.toMatchObject({ code: 'NOT_READY' });
  }, 30000);
  it('allows one of many competing workers to own the next step', async () => {
    const { store, options } = await setup(), started = latch(), release = latch(); let calls = 0;
    class BlockingBackend extends NativeBackend { async preflight() { calls++; started.resolve(); await release.promise; } }
    const backend = new BlockingBackend(), service = new RenderService(store, backend, options);
    const job = await service.submit('tenant', 'race', plan);
    const first = service.advance('tenant', job.id); await started.promise;
    await Promise.all(Array.from({ length: 20 }, () => new RenderService(store, backend, options).advance('tenant', job.id)));
    expect(calls).toBe(1); release.resolve(); await first;
  });
  it('persists cancellation in another process and fences the old executor', async () => {
    const { store, options } = await setup(), started = latch(), release = latch();
    class BlockingBackend extends NativeBackend { async preflight() { started.resolve(); await release.promise; } }
    const backend = new BlockingBackend(), service = new RenderService(store, backend, options);
    const job = await service.submit('tenant', 'cancel-running', plan), work = service.advance('tenant', job.id);
    await started.promise;
    await new RenderService(store, backend, options).cancel('tenant', job.id);
    release.resolve(); expect((await work).state).toBe('canceled');
    await expect(service.artifact('tenant', job.id)).rejects.toMatchObject({ code: 'NOT_READY' });
  });
  it('recovers an expired lease and rejects a late completion from its former owner', async () => {
    const { store, options } = await setup(), started = latch(), release = latch(); let time = 10000;
    class BlockingBackend extends NativeBackend { async preflight() { started.resolve(); await release.promise; } }
    const old = new RenderService(store, new BlockingBackend(), { ...options, now: () => time });
    const job = await old.submit('tenant', 'expired', plan), work = old.advance('tenant', job.id);
    await started.promise; time += 4000;
    const fresh = new RenderService(store, new NativeBackend(), { ...options, now: () => time });
    expect((await fresh.advance('tenant', job.id)).state).toBe('rendering');
    release.resolve(); expect((await work).state).toBe('rendering');
    expect((await fresh.advance('tenant', job.id)).completedChunks).toBe(1);
  }, 30000);
  it('reattaches after a manifest commit fails and reuses verified state', async () => {
    const { store, options } = await setup(); let failCommit = true;
    const wrapped: ObjectStore = {
      get: key => store.get(key), list: prefix => store.list(prefix),
      async put(key, body, expected, bytes) {
        if (key.startsWith('j/') && body instanceof Uint8Array) {
          const state = JSON.parse(new TextDecoder().decode(body));
          if (state.completedChunks === 1 && !state.lease && failCommit) { failCommit = false; throw new Error('Simulated durable-store interruption'); }
        }
        return store.put(key, body, expected);
      },
    };
    let time = 10000;
    const service = () => new RenderService(wrapped, new NativeBackend(), { ...options, now: () => time });
    const job = await service().submit('tenant', 'interrupted-commit', plan);
    await service().advance('tenant', job.id);
    await expect(service().advance('tenant', job.id)).rejects.toThrow('interruption');
    time += 4000;
    for (let i = 0; i < 8; i++) { const result = await service().advance('tenant', job.id); if (result.state === 'succeeded') break; }
    expect((await service().get('tenant', job.id)).state).toBe('succeeded');
    expect((await service().get('tenant', job.id)).completedChunks).toBe(3);
  }, 30000);
  it('rejects corrupted committed chunks and never publishes false success', async () => {
    const { store, options } = await setup();
    const service = new RenderService(store, new NativeBackend(), { ...options, maxAttempts: 1 });
    const job = await service.submit('tenant', 'corrupt', { ...plan, frameCount: 3 });
    await service.advance('tenant', job.id); await service.advance('tenant', job.id);
    for await (const key of store.list('a/')) {
      const object = (await store.get(key))!;
      await store.put(key, new Uint8Array(object.size), object.version);
    }
    const result = await service.advance('tenant', job.id);
    expect(result.state).toBe('failed'); expect(result.error?.code).toBe('CORRUPT_OBJECT');
    await expect(service.artifact('tenant', job.id)).rejects.toMatchObject({ status: 409 });
  });
  it('bounds retries and rejects engine changes on an in-flight job', async () => {
    const { store, options } = await setup();
    class BrokenBackend extends NativeBackend { async preflight() { throw new Error('Temporary failure'); } }
    const service = new RenderService(store, new BrokenBackend(), options);
    const job = await service.submit('tenant', 'retry-limit', plan);
    await service.advance('tenant', job.id); await service.advance('tenant', job.id);
    expect((await service.advance('tenant', job.id)).state).toBe('failed');
    const second = await service.submit('tenant', 'engine-change', plan);
    await expect(new RenderService(store, new NativeBackend({ rasterizer: 'wasm' }), options).advance('tenant', second.id)).rejects.toMatchObject({ code: 'ENGINE_MISMATCH' });
  });
});
