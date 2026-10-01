import { expect, it } from 'vitest';
import { RenderClient } from '../src/client.js';

it('retries transient submission failures with the same idempotency key', async () => {
  const bodies: unknown[] = [];
  const client = new RenderClient('https://render.invalid', { retryMs: 1, fetch: async (_url, init) => {
    bodies.push(init?.body);
    return bodies.length < 3 ? new Response('unavailable', { status: 503 }) : Response.json({ id: 'same-job' });
  } });
  expect((await client.submit({}, 'retry-key')).id).toBe('same-job');
  expect(bodies).toHaveLength(3); expect(new Set(bodies).size).toBe(1);
});
it('bounds a hung advance request by the waiting deadline', async () => {
  const client = new RenderClient('https://render.invalid', { fetch: async (_url, init) => new Promise((_resolve, reject) => init!.signal!.addEventListener('abort', () => reject(init!.signal!.reason))) });
  await expect(client.wait('job', { timeoutMs: 20 })).rejects.toThrow(/timed out/);
});
it('rejects a range response from the wrong artifact position', async () => {
  const client = new RenderClient('https://render.invalid', { fetch: async url => String(url).endsWith('/artifact')
    ? new Response(new Uint8Array(4), { status: 206, headers: { 'content-range': 'bytes 4-7/8' } })
    : Response.json({ state: 'succeeded', output: { bytes: 8 } }) });
  await expect((await client.download('job')).arrayBuffer()).rejects.toThrow(/range/i);
});
it('rejects same-length corruption in a completed download', async () => {
  const client = new RenderClient('https://render.invalid', { fetch: async url => String(url).endsWith('/artifact')
    ? new Response(new Uint8Array(4), { status: 206, headers: { 'content-range': 'bytes 0-3/4' } })
    : Response.json({ state: 'succeeded', output: { bytes: 4, sha256: '0'.repeat(64) } }) });
  await expect((await client.download('job')).arrayBuffer()).rejects.toThrow(/integrity|checksum/i);
});
