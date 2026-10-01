import { expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRenderServer, runWorker } from '../src/server.js';
import { RenderService } from '../src/jobs.js';
import { FileStore, digest } from '../src/storage.js';
import { NativeBackend } from '../src/backend.js';
import { RenderClient } from '../src/client.js';

it('serves real HTTP, reassembles bounded asset uploads and completes a background workflow', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'helios-portable-http-'));
  const service = new RenderService(new FileStore(dir), new NativeBackend(), { workspace: join(dir, 'work'), chunkFrames: 4 });
  const server = createRenderServer(service, { authorize: async () => 'private', maxUploadBytes: 2 * 1024 * 1024, maxDownloadBytes: 1024 });
  const stop = new AbortController(); let worker: Promise<void> | undefined;
  try {
    await new Promise<void>(done => server.listen(0, '127.0.0.1', done));
    const address = server.address() as { port: number };
    const client = new RenderClient(`http://127.0.0.1:${address.port}`, { pollMs: 5 });
    const bytes = new Uint8Array(3 * 1024 * 1024).fill(37);
    expect(await client.upload(bytes)).toEqual({ sha256: digest(bytes), bytes: bytes.length });
    worker = runWorker(service, stop.signal, 5);
    const job = await client.render({ version: 'portable-v1', width: 160, height: 90, fps: { num: 30000, den: 1001 }, frameCount: 11, nodes: [] }, { idempotencyKey: 'http', drive: false });
    expect(job.completedChunks).toBe(3);
    const output = new Uint8Array(await (await client.download(job.id)).arrayBuffer());
    expect(digest(output)).toBe(job.output!.sha256);
  } finally {
    stop.abort(); service.shutdown(); await worker;
    await new Promise<void>(done => server.close(() => done()));
    await rm(dir, { recursive: true, force: true });
  }
}, 30000);
