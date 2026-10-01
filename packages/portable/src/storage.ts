import { createReadStream } from 'node:fs';
import { mkdir, open, readdir, stat, link, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { RenderError } from './plan.js';

export type ByteSource = Uint8Array | AsyncIterable<Uint8Array>;
export interface StoredObject { version: string; size: number; stream(range?: { start: number; end: number }): AsyncIterable<Uint8Array> }
export interface ObjectStore {
  get(key: string): Promise<StoredObject | undefined>;
  /** null means create only; an observed version means compare-and-swap. */
  put(key: string, body: ByteSource, expected: string | null, bytes?: number): Promise<boolean>;
  list(prefix: string): AsyncIterable<string>;
}
export const digest = (data: string | Uint8Array): string => createHash('sha256').update(data).digest('hex');
export function safeKey(key: string): string {
  if (!/^[a-zA-Z0-9/_-]{1,180}$/.test(key)) throw new RenderError('INVALID_KEY', 'Invalid storage key');
  return key;
}
export async function* byteChunks(body: ByteSource): AsyncIterable<Uint8Array> {
  if (body instanceof Uint8Array) yield body; else yield* body;
}
export async function readBytes(object: StoredObject, limit: number): Promise<Buffer> {
  if (object.size > limit) throw new RenderError('RESOURCE_LIMIT', 'Object exceeds its byte limit');
  const chunks: Buffer[] = []; let size = 0;
  for await (const chunk of object.stream()) { size += chunk.length; if (size > limit) throw new RenderError('RESOURCE_LIMIT', 'Object exceeds its byte limit'); chunks.push(Buffer.from(chunk)); }
  if (size !== object.size) throw new RenderError('CORRUPT_OBJECT', 'Object size did not match its metadata', 500);
  return Buffer.concat(chunks);
}
export const jsonBytes = (value: unknown): Uint8Array => new TextEncoder().encode(JSON.stringify(value));
export async function readJson<T>(object: StoredObject, limit = 8 * 1024 * 1024): Promise<T> {
  try { return JSON.parse((await readBytes(object, limit)).toString()) as T; }
  catch (error) { if (error instanceof RenderError) throw error; throw new RenderError('CORRUPT_STATE', 'Durable state is unreadable', 500); }
}
async function syncDirectory(path: string): Promise<void> { const dir = await open(path, 'r'); try { await dir.sync(); } finally { await dir.close(); } }

/**
 * Each immutable numbered revision is committed by an exclusive hard link.
 * Competing writers for revision n+1 cannot both win; no expiring filesystem
 * lock can let a stale writer overwrite newer state. Requires a local filesystem
 * with atomic hard links and fsync, not an object-store/FUSE mount.
 */
export class FileStore implements ObjectStore {
  private root: string;
  constructor(directory: string) { this.root = resolve(directory, 'objects'); }
  private directory(key: string): string { return join(this.root, Buffer.from(safeKey(key)).toString('base64url')); }
  async get(key: string): Promise<StoredObject | undefined> {
    const dir = this.directory(key);
    let files: string[];
    try { files = await readdir(dir); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined; throw error; }
    const versions = files.filter(f => /^\d+\.data$/.test(f)).map(f => Number(f.slice(0, -5)));
    if (!versions.length) return undefined;
    const version = Math.max(...versions).toString(), path = join(dir, `${version}.data`), metadata = await stat(path);
    return { version, size: metadata.size, stream: range => createReadStream(path, range) };
  }
  async put(key: string, body: ByteSource, expected: string | null): Promise<boolean> {
    if (expected !== null && !/^\d{1,9}$/.test(expected)) throw new RenderError('INVALID_VERSION', 'Invalid object revision');
    const dir = this.directory(key);
    await mkdir(dir, { recursive: true, mode: 0o700 });
    if (expected !== null) {
      try { await stat(join(dir, `${expected}.data`)); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false; throw error; }
    }
    const destination = join(dir, `${expected === null ? 0 : Number(expected) + 1}.data`);
    const temporary = join(dir, `${randomUUID()}.partial`);
    const file = await open(temporary, 'wx', 0o600);
    try {
      for await (const chunk of byteChunks(body)) {
        let offset = 0;
        while (offset < chunk.length) { const result = await file.write(chunk, offset, chunk.length - offset); offset += result.bytesWritten; }
      }
      await file.sync();
      await file.close();
      try { await link(temporary, destination); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'EEXIST') return false; throw error; }
      await syncDirectory(dir);
      await syncDirectory(this.root);
      return true;
    } finally { await file.close().catch(() => {}); await unlink(temporary).catch(() => {}); }
  }
  async *list(prefix: string): AsyncIterable<string> {
    let directories: string[];
    try { directories = await readdir(this.root); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error; }
    for (const name of directories.sort()) {
      const key = Buffer.from(name, 'base64url').toString();
      if (key.startsWith(prefix) && (await this.get(key))) yield key;
    }
  }
}
