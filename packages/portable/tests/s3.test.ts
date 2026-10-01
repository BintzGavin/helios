import { expect, it } from 'vitest';
import { S3Client, HeadObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { S3Store } from '../src/s3-storage.js';
import { digest, readBytes } from '../src/storage.js';

// Protocol contract model. This does not qualify a hosted S3 implementation.
function model() {
  const entries = new Map<string, Uint8Array>(); let writes = 0;
  const client = { send: async (command: any) => {
    const input = command.input, bytes = entries.get(input.Key), version = bytes ? `"${digest(bytes)}"` : undefined;
    const error = (code: number): never => { throw { $metadata: { httpStatusCode: code } }; };
    if (command instanceof HeadObjectCommand) return bytes ? { ETag: version, ContentLength: bytes.length } : error(404);
    if (command instanceof GetObjectCommand) {
      if (!bytes) error(404); if (input.IfMatch && input.IfMatch !== version) error(412);
      return { ETag: version, Body: { transformToByteArray: async () => bytes!, async *[Symbol.asyncIterator]() { yield bytes!; } } };
    }
    if (command instanceof PutObjectCommand) {
      if ((input.IfNoneMatch === '*' && bytes) || (input.IfMatch && input.IfMatch !== version)) error(412);
      const parts = []; if (input.Body instanceof Uint8Array) parts.push(input.Body); else for await (const p of input.Body) parts.push(p);
      const result = Buffer.concat(parts); expect(input.ContentLength).toBe(result.length);
      entries.set(input.Key, result); writes++; return {};
    }
    return { Contents: [...entries.keys()].filter(k => k.startsWith(input.Prefix)).map(Key => ({ Key })) };
  } } as unknown as S3Client;
  return { store: new S3Store(client, 'test-bucket'), writes: () => writes };
}
it('uses conditional creation and revision writes; stale owners cannot replace a manifest', async () => {
  const { store, writes } = model(); const first = new Uint8Array([1]), second = new Uint8Array([2]);
  expect(await store.get('j/a')).toBeUndefined();
  expect(await store.put('j/a', first, null)).toBe(true);
  expect(await store.put('j/a', second, null)).toBe(false);
  const snapshot = (await store.get('j/a'))!;
  expect(await store.put('j/a', second, snapshot.version)).toBe(true);
  expect(await store.put('j/a', first, snapshot.version)).toBe(false);
  expect(writes()).toBe(2); expect(new Uint8Array(await readBytes(snapshot))).toEqual(first);
  expect(new Uint8Array(await readBytes((await store.get('j/a'))!))).toEqual(second);
  const keys = []; for await (const key of store.list('j/')) keys.push(key); expect(keys).toEqual(['j/a']);
});
it('streams large bodies with a declared length and a pinned read revision', async () => {
  const { store } = model(); const bytes = new Uint8Array(9 * 1024 * 1024).fill(19);
  async function* body() { yield bytes.subarray(0, 1024); yield bytes.subarray(1024); }
  await expect(store.put('a/blob', body(), null)).rejects.toThrow(/length/);
  expect(await store.put('a/blob', body(), null, bytes.length)).toBe(true);
  const object = (await store.get('a/blob'))!;
  expect(digest(await readBytes(object, bytes.length))).toBe(digest(bytes));
});
