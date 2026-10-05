import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { PathError, resolveInRoot } from './paths.js';

/** Largest export save_export accepts. */
export const SAVE_EXPORT_MAX_BYTES = 200 * 1024 * 1024;
/** Largest chunk, decoded. The view sends 1 MB chunks. */
export const SAVE_EXPORT_CHUNK_BYTES = 1024 * 1024;
/** Largest chunk as base64 characters. */
export const SAVE_EXPORT_MAX_CHUNK_CHARS = Math.ceil(SAVE_EXPORT_CHUNK_BYTES / 3) * 4;
/** Most chunks one upload may declare. */
export const SAVE_EXPORT_MAX_CHUNKS = Math.ceil(SAVE_EXPORT_MAX_BYTES / SAVE_EXPORT_CHUNK_BYTES);
/** An upload with no chunk for this long is dropped. */
export const SAVE_EXPORT_IDLE_MS = 10 * 60 * 1000;
/** Bytes held in memory across every upload in progress; older uploads are dropped to stay under it. */
export const SAVE_EXPORT_MAX_BUFFERED_BYTES = 256 * 1024 * 1024;
/** Uploads in progress at once; starting another drops the least recently active. */
export const SAVE_EXPORT_MAX_UPLOADS = 4;
/** Folder under the project root that exports are saved in. */
export const SAVE_EXPORT_DIR = 'exports';

/** A chunk save_export refuses. The message is shown to the person, so it says what to do. */
export class ExportError extends Error {}

const MAX_NAME_LENGTH = 200;
const UPLOAD_ID = /^[A-Za-z0-9_-]{8,64}$/;
const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;

/**
 * The file name an export is saved under: a bare name ending in .mp4. No folders, no "..", no
 * characters that Windows or a shell would treat specially, and not hidden.
 */
export function sanitizeExportName(name: string): string {
  if (typeof name !== 'string') throw new ExportError('name must be a file name ending in .mp4');
  const trimmed = name.trim();
  if (/[/\\]/.test(trimmed)) throw new ExportError(`name "${name}" must be a file name without folders`);
  if (trimmed.includes('..')) throw new ExportError(`name "${name}" must not contain ".."`);
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f<>:"|?*]/.test(trimmed)) throw new ExportError(`name "${name}" contains characters a file name can't have`);
  if (!/\.mp4$/i.test(trimmed) || trimmed.length <= 4) throw new ExportError(`name "${name}" must end in .mp4`);
  if (trimmed.startsWith('.')) throw new ExportError(`name "${name}" must not start with "."`);
  if (trimmed.length > MAX_NAME_LENGTH) throw new ExportError(`name is longer than ${MAX_NAME_LENGTH} characters`);
  return trimmed;
}

/** True when bytes start with an ISO BMFF `ftyp` box, as every MP4 does. */
export function isMp4Start(bytes: Buffer): boolean {
  return bytes.length >= 8 && bytes.readUInt32BE(0) >= 8 && bytes.toString('latin1', 4, 8) === 'ftyp';
}

export interface ExportChunk {
  name: string;
  uploadId: string;
  /** 0-based; chunks must arrive in order. */
  index: number;
  total: number;
  /** The chunk's bytes, base64. */
  data: string;
}

export interface ExportProgress {
  [key: string]: unknown;
  received: number;
  total: number;
  bytes: number;
  /** Set once the last chunk is saved: relative to the project root. */
  path?: string;
  /** Set once the last chunk is saved. */
  absolutePath?: string;
}

interface Upload {
  id: string;
  name: string;
  total: number;
  chunks: Buffer[];
  bytes: number;
  lastHash: string;
  lastActive: number;
  timer?: NodeJS.Timeout;
}

export interface ExportUploadsOptions {
  idleMs?: number;
  maxBytes?: number;
  chunkBytes?: number;
  maxBufferedBytes?: number;
  maxUploads?: number;
  now?: () => number;
}

const hash = (b: Buffer) => createHash('sha256').update(b).digest('hex');

/**
 * Exports the player encoded in the browser, arriving as ordered base64 chunks and written into
 * the project's exports folder once the last one arrives. Chunks are held in memory until then,
 * within the byte and upload limits above; abandoned uploads are dropped after idleMs.
 */
export class ExportUploads {
  private uploads = new Map<string, Upload>();
  private readonly idleMs: number;
  private readonly maxBytes: number;
  private readonly chunkBytes: number;
  private readonly maxBufferedBytes: number;
  private readonly maxUploads: number;
  private readonly now: () => number;

  constructor(private root: string, options: ExportUploadsOptions = {}) {
    this.idleMs = options.idleMs ?? SAVE_EXPORT_IDLE_MS;
    this.maxBytes = options.maxBytes ?? SAVE_EXPORT_MAX_BYTES;
    this.chunkBytes = options.chunkBytes ?? SAVE_EXPORT_CHUNK_BYTES;
    this.maxBufferedBytes = Math.max(options.maxBufferedBytes ?? SAVE_EXPORT_MAX_BUFFERED_BYTES, this.maxBytes);
    this.maxUploads = Math.max(1, options.maxUploads ?? SAVE_EXPORT_MAX_UPLOADS);
    this.now = options.now ?? Date.now;
  }

  /** Uploads in progress. */
  get size(): number {
    this.sweep();
    return this.uploads.size;
  }

  /** Bytes held in memory across uploads in progress. */
  get bufferedBytes(): number {
    let n = 0;
    for (const up of this.uploads.values()) n += up.bytes;
    return n;
  }

  async receive(chunk: ExportChunk): Promise<ExportProgress> {
    this.sweep();
    const name = sanitizeExportName(chunk.name);
    if (!UPLOAD_ID.test(chunk.uploadId)) throw new ExportError('uploadId must be 8-64 letters, digits, "-" or "_"');
    if (!Number.isInteger(chunk.total) || chunk.total < 1) throw new ExportError('total must be a whole number of chunks, at least 1');
    if (!Number.isInteger(chunk.index) || chunk.index < 0 || chunk.index >= chunk.total) {
      throw new ExportError(`index must be from 0 to ${chunk.total - 1}`);
    }
    if (chunk.total > Math.ceil(this.maxBytes / this.chunkBytes)) {
      throw new ExportError(`The export is over the ${formatMB(this.maxBytes)} limit`);
    }
    const data = decodeChunk(chunk.data, this.chunkBytes);

    let up = this.uploads.get(chunk.uploadId);
    if (!up) {
      if (chunk.index !== 0) {
        throw new ExportError(`Upload ${chunk.uploadId} is unknown or expired; send it again from index 0`);
      }
      if (!isMp4Start(data)) throw new ExportError('The upload is not an MP4 (it does not start with an ftyp box)');
      up = { id: chunk.uploadId, name, total: chunk.total, chunks: [], bytes: 0, lastHash: '', lastActive: this.now() };
      this.makeRoomForUpload();
      this.uploads.set(up.id, up);
    } else if (up.name !== name || up.total !== chunk.total) {
      this.drop(up);
      throw new ExportError(`Chunk ${chunk.index} does not match upload ${chunk.uploadId} (name or total changed); send it again from index 0`);
    } else if (chunk.index === up.chunks.length - 1 && hash(data) === up.lastHash) {
      // The same chunk again, e.g. a retry after a lost response.
      this.touch(up);
      return { received: up.chunks.length, total: up.total, bytes: up.bytes };
    } else if (chunk.index !== up.chunks.length) {
      this.drop(up);
      throw new ExportError(`Chunk ${chunk.index} is out of order for upload ${chunk.uploadId} (expected ${up.chunks.length}); send it again from index 0`);
    }

    if (up.bytes + data.length > this.maxBytes) {
      this.drop(up);
      throw new ExportError(`The export is over the ${formatMB(this.maxBytes)} limit`);
    }
    this.makeRoomForBytes(up, data.length);
    up.chunks.push(data);
    up.bytes += data.length;
    up.lastHash = hash(data);
    this.touch(up);

    if (up.chunks.length < up.total) return { received: up.chunks.length, total: up.total, bytes: up.bytes };

    this.drop(up);
    const saved = await this.write(up);
    return { received: up.total, total: up.total, bytes: up.bytes, path: saved.rel, absolutePath: saved.abs };
  }

  /** Drops every upload in progress. */
  clear(): void {
    for (const up of [...this.uploads.values()]) this.drop(up);
  }

  private async write(up: Upload): Promise<{ abs: string; rel: string }> {
    const target = await resolveInRoot(this.root, path.posix.join(SAVE_EXPORT_DIR, up.name), { kind: 'new', label: 'name' });
    const existing = await fs.promises.lstat(target.abs).catch(() => undefined);
    if (existing?.isDirectory()) throw new PathError(`${target.rel} is a folder`);
    await fs.promises.mkdir(path.dirname(target.abs), { recursive: true });
    // Write beside the target and rename, so a failed write never leaves half an MP4 under its name.
    const part = `${target.abs}.${up.id}.part`;
    try {
      const handle = await fs.promises.open(part, 'wx');
      try {
        for (const chunk of up.chunks) await handle.write(chunk);
      } finally {
        await handle.close();
      }
      await fs.promises.rename(part, target.abs);
    } catch (err) {
      await fs.promises.rm(part, { force: true }).catch(() => {});
      throw err;
    }
    return target;
  }

  private touch(up: Upload): void {
    up.lastActive = this.now();
    if (up.timer) clearTimeout(up.timer);
    up.timer = setTimeout(() => this.drop(up), this.idleMs);
    up.timer.unref?.();
  }

  private drop(up: Upload): void {
    if (up.timer) clearTimeout(up.timer);
    if (this.uploads.get(up.id) === up) this.uploads.delete(up.id);
  }

  /** Drops uploads idle for longer than idleMs, in case a timer has not fired yet. */
  private sweep(): void {
    const cutoff = this.now() - this.idleMs;
    for (const up of [...this.uploads.values()]) if (up.lastActive <= cutoff) this.drop(up);
  }

  /** Least recently active first. */
  private oldest(except?: Upload): Upload | undefined {
    let found: Upload | undefined;
    for (const up of this.uploads.values()) {
      if (up !== except && (!found || up.lastActive < found.lastActive)) found = up;
    }
    return found;
  }

  private makeRoomForUpload(): void {
    while (this.uploads.size >= this.maxUploads) {
      const victim = this.oldest();
      if (!victim) break;
      this.drop(victim);
    }
  }

  private makeRoomForBytes(up: Upload, incoming: number): void {
    while (this.bufferedBytes + incoming > this.maxBufferedBytes) {
      const victim = this.oldest(up);
      if (!victim) break;
      this.drop(victim);
    }
  }
}

function decodeChunk(data: string, maxBytes: number): Buffer {
  if (typeof data !== 'string' || data.length === 0) throw new ExportError('data is empty');
  if (data.length % 4 !== 0 || !BASE64.test(data)) throw new ExportError('data must be base64');
  const bytes = Buffer.from(data, 'base64');
  if (bytes.length > maxBytes) throw new ExportError(`A chunk is over ${formatMB(maxBytes)}; send chunks of at most ${formatMB(maxBytes)}`);
  return bytes;
}

function formatMB(bytes: number): string {
  const mb = bytes / 1024 / 1024;
  return mb >= 1 ? `${Number(mb.toFixed(1))} MB` : `${bytes} bytes`;
}
