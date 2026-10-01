import { describe, expect, it } from 'vitest';
import { publishArchive } from '../benchmarks/cloudflare/transfer.mjs';

function fixture() {
  const events: string[] = [];
  const body = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array([0, 255, 37, 128])); controller.close(); } });
  const process = { async waitForPort() { events.push('ready'); }, async kill() { events.push('kill'); } };
  const sandbox = {
    async startProcess() { events.push('start'); return process; },
    async containerFetch() { events.push('fetch'); return new Response(body, { headers: { 'Content-Length': '4' } }); },
  };
  let saved: number[] = []; let receivedLength: number | undefined;
  const store = { async putBinary(_key: string, stream: ReadableStream, _type: string, length: number) {
    receivedLength = length; const reader = stream.getReader();
    for (;;) { const item = await reader.read(); if (item.done) break; saved.push(...item.value); }
    events.push('saved');
  } };
  return { events, body, process, sandbox, store, saved: () => saved, length: () => receivedLength };
}

describe('private binary artifact transfer', () => {
  it('preserves arbitrary binary bytes and supplies the exact length to storage', async () => {
    const f = fixture(); await publishArchive('benchmarks/helios-cpu/test/evidence.tar.gz', f.sandbox, f.store);
    expect(f.saved()).toEqual([0, 255, 37, 128]); expect(f.length()).toBe(4); expect(f.events).toEqual(['start', 'ready', 'fetch', 'saved', 'kill']);
  });
  it.each([null, '-1', '0', '4x', '9999999999999999'])('rejects invalid length %s without publication', async length => {
    const f = fixture(); f.sandbox.containerFetch = async () => new Response(f.body, { headers: length === null ? {} : { 'Content-Length': length } });
    await expect(publishArchive('key', f.sandbox, f.store)).rejects.toThrow(); expect(f.saved()).toEqual([]); expect(f.events.at(-1)).toBe('kill');
  });
  it('cleans up after readiness failure without fetching', async () => {
    const f = fixture(); f.process.waitForPort = async () => { throw new Error('not ready'); };
    await expect(publishArchive('key', f.sandbox, f.store)).rejects.toThrow('not ready'); expect(f.events).toEqual(['start', 'kill']);
  });
  it('cleans up after storage failure and rejects qualification', async () => {
    const f = fixture(); f.store.putBinary = async () => { throw new Error('storage failed'); };
    await expect(publishArchive('key', f.sandbox, f.store)).rejects.toThrow('storage failed'); expect(f.events.at(-1)).toBe('kill');
  });
});
