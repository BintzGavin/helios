import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileStore, readBytes } from '../src/storage.js';
import { RenderService } from '../src/jobs.js';
import { NativeBackend } from '../src/backend.js';

const directories: string[] = [];
afterEach(async () => { await Promise.all(directories.splice(0).map(p => rm(p, { recursive: true, force: true }))); });
async function setup() {
  const dir = await mkdtemp(join(tmpdir(), 'helios-portable-job-')); directories.push(dir);
  const store = new FileStore(join(dir, 'store'));
  return { dir, store, service: () => new RenderService(store, new NativeBackend(), { workspace: join(dir, 'work'), chunkFrames: 5 }) };
}
const plan = () => ({ version: 'portable-v1', width: 160, height: 90, fps: { num: 30, den: 1 }, frameCount: 12, background: '#ffffff', assets: {}, nodes: [{ id: 'rect', type: 'rect', width: 30, height: 30, fill: '#3770ff' }], audio: [] });

describe('durable render jobs', () => {
  it('enforces declared host duration and scratch admission without publishing output', async () => {
    const { dir, store } = await setup();
    const limited = new RenderService(store, new NativeBackend(), { workspace: join(dir, 'work'), maxDurationSeconds: 0.2 });
    await expect(limited.submit('tenant', 'too-long', plan())).rejects.toMatchObject({ code: 'HOST_LIMIT', status: 413 });
    const disk = new RenderService(store, new NativeBackend(), { workspace: join(dir, 'work'), maxWorkBytes: 1 });
    const job = await disk.submit('tenant', 'disk', plan());
    const result = await disk.advance('tenant', job.id);
    expect(result.state).toBe('failed'); expect(result.error?.code).toBe('HOST_LIMIT');
    await expect(disk.artifact('tenant', job.id)).rejects.toMatchObject({ code: 'NOT_READY' });
  });
  it('conditionally commits exactly one competing state transition', async () => {
    const { store } = await setup();
    const results = await Promise.all(Array.from({ length: 20 }, (_, i) => store.put('race', new TextEncoder().encode(String(i)), null)));
    expect(results.filter(Boolean)).toHaveLength(1);
    const first = (await store.get('race'))!;
    expect(await store.put('race', new Uint8Array([1]), first.version)).toBe(true);
    expect(await store.put('race', new Uint8Array([2]), first.version)).toBe(false);
  });
  it('reattaches duplicate submissions, rejects changed inputs, and isolates tenants', async () => {
    const { service } = await setup();
    const jobs = await Promise.all(Array.from({ length: 10 }, () => service().submit('tenant-a', 'same-key', plan())));
    expect(new Set(jobs.map(j => j.id)).size).toBe(1);
    await expect(service().submit('tenant-a', 'same-key', { ...plan(), frameCount: 13 })).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
    await expect(service().get('tenant-b', jobs[0].id)).rejects.toMatchObject({ status: 404 });
  });
  it('renders real chunks across fresh service instances and publishes only a verified video', async () => {
    const { service } = await setup();
    let job = await service().submit('tenant', 'export-1', plan());
    await expect(service().artifact('tenant', job.id)).rejects.toMatchObject({ status: 409 });
    const id = job.id;
    for (let i = 0; i < 10 && job.state !== 'succeeded'; i++) job = await service().advance('tenant', id);
    expect(job.state).toBe('succeeded');
    expect(job.completedChunks).toBe(3);
    const artifact = await service().artifact('tenant', id);
    expect((await readBytes(artifact, 1024 * 1024)).length).toBeGreaterThan(500);
    expect((await service().advance('tenant', id)).state).toBe('succeeded');
  }, 30000);
  it('persists cancellation and never starts canceled work or exposes an output', async () => {
    const { service } = await setup();
    const job = await service().submit('tenant', 'cancel-me', plan());
    expect((await service().cancel('tenant', job.id)).state).toBe('canceled');
    expect((await service().advance('tenant', job.id)).state).toBe('canceled');
    await expect(service().artifact('tenant', job.id)).rejects.toMatchObject({ status: 409 });
  });
});
