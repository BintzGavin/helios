import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRenderHandler } from '../src/server.js';
import { RenderClient } from '../src/client.js';
import { RenderService } from '../src/jobs.js';
import { FileStore, digest } from '../src/storage.js';
import { NativeBackend } from '../src/backend.js';

const dirs: string[] = [];
afterEach(async () => { await Promise.all(dirs.splice(0).map(d => rm(d, { recursive: true, force: true }))); });
async function setup() {
  const dir = await mkdtemp(join(tmpdir(), 'helios-portable-api-')); dirs.push(dir);
  const service = new RenderService(new FileStore(join(dir, 'store')), new NativeBackend(), { workspace: join(dir, 'work'), chunkFrames: 5 });
  const handle = createRenderHandler(service, { authorize: async request => request.headers.get('x-test-tenant') });
  const fetcher: typeof fetch = async (url, init) => handle(new Request(url, init));
  return { handle, client: new RenderClient('https://render.invalid', { fetch: fetcher, headers: { 'x-test-tenant': 'tenant' }, pollMs: 1 }) };
}
const plan = { version: 'portable-v1', width: 160, height: 90, fps: { num: 30, den: 1 }, frameCount: 9, background: '#112233', assets: {}, nodes: [], audio: [] };
describe('render API and workflow SDK', () => {
  it('rejects unauthenticated access and malformed or unsupported requests', async () => {
    const { handle } = await setup();
    expect((await handle(new Request('https://render.invalid/v1/renders', { method: 'POST', body: '{}' }))).status).toBe(401);
    const response = await handle(new Request('https://render.invalid/v1/renders', { method: 'POST', headers: { 'x-test-tenant': 'tenant' }, body: JSON.stringify({ idempotencyKey: 'invalid', plan: { ...plan, renderScript: 'arbitrary code' } }) }));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('INVALID_PLAN');
  });
  it('submits, advances and downloads a verified MP4 using the same handler a function calls', async () => {
    const { client } = await setup();
    const progress: string[] = [];
    const job = await client.render(plan, { idempotencyKey: 'sdk-render', onProgress: j => { progress.push(j.state); } });
    expect(job.state).toBe('succeeded');
    expect(progress).toContain('rendering');
    const response = await client.download(job.id);
    expect(response.headers.get('content-type')).toBe('video/mp4');
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(500);
  }, 30000);
  it('validates asset identities, including duplicate uploads with corrupted bytes', async () => {
    const { handle, client } = await setup();
    const bytes = new TextEncoder().encode('an immutable asset');
    expect((await client.upload(bytes)).sha256).toBe(digest(bytes));
    const response = await handle(new Request(`https://render.invalid/v1/assets/${digest(bytes)}`, { method: 'PUT', headers: { 'x-test-tenant': 'tenant' }, body: 'corrupt' }));
    expect(response.status).toBe(400);
  });
  it('supports range requests on completed artifacts and rejects invalid ranges', async () => {
    const { client, handle } = await setup();
    const job = await client.render(plan, { idempotencyKey: 'ranges' });
    const url = `https://render.invalid/v1/renders/${job.id}/artifact`;
    const partial = await handle(new Request(url, { headers: { 'x-test-tenant': 'tenant', range: 'bytes=0-15' } }));
    expect(partial.status).toBe(206); expect((await partial.arrayBuffer()).byteLength).toBe(16);
    expect((await handle(new Request(url, { headers: { 'x-test-tenant': 'tenant', range: 'bytes=999999999-' } }))).status).toBe(416);
  }, 30000);
});
