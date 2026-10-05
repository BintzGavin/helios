import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { PathError, resolveInRoot, isInside } from './paths.js';

/** Largest export save_export accepts. */
export const SAVE_EXPORT_MAX_BYTES = 200 * 1024 * 1024;
/** Largest chunk, decoded. The view sends 1 MB chunks. */
export const SAVE_EXPORT_CHUNK_BYTES = 1024 * 1024;
/** Largest chunk as base64 characters. */
export const SAVE_EXPORT_MAX_CHUNK_CHARS = Math.ceil(SAVE_EXPORT_CHUNK_BYTES / 3) * 4;
/** Most chunks one upload may declare. */
export const SAVE_EXPORT_MAX_CHUNKS = Math.ceil(SAVE_EXPORT_MAX_BYTES / SAVE_EXPORT_CHUNK_BYTES);
/** An upload with no chunk for this long is dropped. Finished uploads are remembered this long too. */
export const SAVE_EXPORT_IDLE_MS = 10 * 60 * 1000;
/** Bytes held in memory across every upload in progress; older uploads are dropped to stay under it. */
export const SAVE_EXPORT_MAX_BUFFERED_BYTES = 256 * 1024 * 1024;
/** Uploads in progress at once; starting another drops the least recently active. */
export const SAVE_EXPORT_MAX_UPLOADS = 4;
/** Exports one server process saves, at most. */
export const SAVE_EXPORT_MAX_FILES = 50;
/** Bytes one server process writes through save_export, at most. */
export const SAVE_EXPORT_MAX_TOTAL_BYTES = 2 * 1024 * 1024 * 1024;
/** Folder under the project root that exports are saved in. */
export const SAVE_EXPORT_DIR = 'exports';

/** A chunk save_export refuses. The message is shown to the person, so it says what to do. */
export class ExportError extends Error {}

const MAX_NAME_LENGTH = 200;
const MAX_NAME_SUFFIX = 999;
const MAX_FINISHED = 100;
const UPLOAD_ID = /^[A-Za-z0-9_-]{8,64}$/;
const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;
/** Names Windows reserves for devices, with or without an extension. */
const WINDOWS_DEVICE = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
/** Bidi embeddings, overrides and isolates, which can make "evil‮gnp.mp4" read as "evilmp4.png". */
const BIDI_CONTROLS = /[‪-‮⁦-⁩]/;

/**
 * The file name an export is saved under: a bare name ending in .mp4. No folders, no "..", no
 * characters or device names that Windows or a shell would treat specially, no bidi controls,
 * and not hidden.
 */
export function sanitizeExportName(name: string): string {
  if (typeof name !== 'string') throw new ExportError('name must be a file name ending in .mp4');
  const trimmed = name.trim();
  if (/[/\\]/.test(trimmed)) throw new ExportError(`name "${name}" must be a file name without folders`);
  if (trimmed.includes('..')) throw new ExportError(`name "${name}" must not contain ".."`);
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f<>:"|?*]/.test(trimmed) || BIDI_CONTROLS.test(trimmed)) {
    throw new ExportError(`name "${name}" contains characters a file name can't have`);
  }
  if (!/\.mp4$/i.test(trimmed) || trimmed.length <= 4) throw new ExportError(`name "${name}" must end in .mp4`);
  if (trimmed.startsWith('.')) throw new ExportError(`name "${name}" must not start with "."`);
  if (WINDOWS_DEVICE.test(trimmed.split('.')[0].trim())) throw new ExportError(`name "${name}" is a name Windows reserves`);
  if (trimmed.length > MAX_NAME_LENGTH) throw new ExportError(`name is longer than ${MAX_NAME_LENGTH} characters`);
  return trimmed;
}

/** True when bytes start with an ISO BMFF `ftyp` box, as every MP4 does. */
export function isMp4Start(bytes: Buffer): boolean {
  return bytes.length >= 8 && bytes.readUInt32BE(0) >= 8 && bytes.toString('latin1', 4, 8) === 'ftyp';
}

/**
 * How much save_export may write. App-only visibility keeps the tool out of the model's tool list,
 * but it is not a security boundary: a page playing in the view shares the view's origin and can
 * call it too. So writes are capped per server process, across every session.
 */
export class ExportQuota {
  readonly maxFiles: number;
  readonly maxBytes: number;
  files = 0;
  bytes = 0;

  constructor(options: { maxFiles?: number; maxBytes?: number } = {}) {
    this.maxFiles = options.maxFiles ?? SAVE_EXPORT_MAX_FILES;
    this.maxBytes = options.maxBytes ?? SAVE_EXPORT_MAX_TOTAL_BYTES;
  }

  /** Throws when one more export of `incoming` bytes would go over a limit. */
  check(incoming: number): void {
    if (this.files >= this.maxFiles) {
      throw new ExportError(`This server has saved its limit of ${this.maxFiles} exports; restart helios mcp to save more, or use Render MP4`);
    }
    if (this.bytes + incoming > this.maxBytes) {
      throw new ExportError(`This server has saved its limit of ${formatMB(this.maxBytes)} of exports; restart helios mcp to save more, or use Render MP4`);
    }
  }

  record(bytes: number): void {
    this.files += 1;
    this.bytes += bytes;
  }
}

/** One quota for every server in this process. */
const processQuota = new ExportQuota();

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

interface Finished {
  name: string;
  total: number;
  lastHash: string;
  result: ExportProgress;
  at: number;
}

export interface ExportUploadsOptions {
  idleMs?: number;
  maxBytes?: number;
  chunkBytes?: number;
  maxBufferedBytes?: number;
  maxUploads?: number;
  /** Shared write limits (default: one quota for the whole process). */
  quota?: ExportQuota;
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
  private finished = new Map<string, Finished>();
  /** Bytes of finished uploads still being written: still in memory. */
  private writingBytes = 0;
  /** Target paths being written, so two uploads never pick the same free name. */
  private reserved = new Set<string>();
  private readonly idleMs: number;
  private readonly maxBytes: number;
  private readonly chunkBytes: number;
  private readonly maxBufferedBytes: number;
  private readonly maxUploads: number;
  private readonly quota: ExportQuota;
  private readonly now: () => number;

  constructor(private root: string, options: ExportUploadsOptions = {}) {
    this.idleMs = options.idleMs ?? SAVE_EXPORT_IDLE_MS;
    this.maxBytes = options.maxBytes ?? SAVE_EXPORT_MAX_BYTES;
    this.chunkBytes = options.chunkBytes ?? SAVE_EXPORT_CHUNK_BYTES;
    this.maxBufferedBytes = Math.max(options.maxBufferedBytes ?? SAVE_EXPORT_MAX_BUFFERED_BYTES, this.maxBytes);
    this.maxUploads = Math.max(1, options.maxUploads ?? SAVE_EXPORT_MAX_UPLOADS);
    this.quota = options.quota ?? processQuota;
    this.now = options.now ?? Date.now;
  }

  /** Uploads in progress. */
  get size(): number {
    this.sweep();
    return this.uploads.size;
  }

  /** Bytes held in memory: uploads in progress, and finished ones until they are written. */
  get bufferedBytes(): number {
    let n = this.writingBytes;
    for (const up of this.uploads.values()) n += up.bytes;
    return n;
  }

  /** Drops an upload in progress, e.g. when the person cancels. False when there was none. */
  abort(uploadId: string): boolean {
    const up = this.uploads.get(uploadId);
    if (!up) return false;
    this.drop(up);
    return true;
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
      // The final chunk again after it was saved, e.g. a retry after a lost response.
      const done = this.finished.get(chunk.uploadId);
      if (done && done.name === name && done.total === chunk.total && chunk.index === chunk.total - 1 && hash(data) === done.lastHash) {
        return { ...done.result };
      }
      if (chunk.index !== 0) {
        throw new ExportError(`Upload ${chunk.uploadId} is unknown or expired; send it again from index 0`);
      }
      if (!isMp4Start(data)) throw new ExportError('The upload is not an MP4 (it does not start with an ftyp box)');
      this.quota.check(data.length);
      this.finished.delete(chunk.uploadId);
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
    this.writingBytes += up.bytes;
    try {
      this.quota.check(up.bytes);
      const saved = await this.write(up);
      this.quota.record(up.bytes);
      const result: ExportProgress = { received: up.total, total: up.total, bytes: up.bytes, path: saved.rel, absolutePath: saved.abs };
      this.remember(up, result);
      return result;
    } finally {
      this.writingBytes -= up.bytes;
    }
  }

  /** Drops every upload in progress. */
  clear(): void {
    for (const up of [...this.uploads.values()]) this.drop(up);
  }

  /**
   * Writes the upload to exports/<name>, or <name>-2, -3 and so on when the name is taken: an
   * export never replaces a file. Only the folder is resolved; the file name is joined to it and
   * refused if it is a symlink, so a link inside exports/ can't redirect the write.
   */
  private async write(up: Upload): Promise<{ abs: string; rel: string }> {
    const folder = await resolveInRoot(this.root, SAVE_EXPORT_DIR, { kind: 'new', label: 'exports folder' });
    await fs.promises.mkdir(folder.abs, { recursive: true });
    const dir = await fs.promises.realpath(folder.abs);
    if (!isInside(this.root, dir)) throw new PathError(`${SAVE_EXPORT_DIR} resolves outside the project root (${this.root})`);
    const stat = await fs.promises.lstat(dir);
    if (!stat.isDirectory()) throw new PathError(`${SAVE_EXPORT_DIR} is not a folder`);

    const ext = path.extname(up.name);
    const stem = up.name.slice(0, -ext.length);
    let target: string | undefined;
    for (let n = 1; n <= MAX_NAME_SUFFIX && !target; n++) {
      const candidate = path.join(dir, n === 1 ? up.name : `${stem}-${n}${ext}`);
      if (this.reserved.has(candidate)) continue;
      const existing = await fs.promises.lstat(candidate).catch(() => undefined);
      if (existing?.isSymbolicLink()) throw new PathError(`${SAVE_EXPORT_DIR}/${path.basename(candidate)} is a symlink; refusing to write through it`);
      if (!existing) target = candidate;
    }
    if (!target) throw new ExportError(`${SAVE_EXPORT_DIR} already has ${MAX_NAME_SUFFIX} exports named like ${up.name}`);

    // Write beside the target and rename, so a failed write never leaves half an MP4 under its name.
    this.reserved.add(target);
    const part = `${target}.${up.id}.part`;
    try {
      const handle = await fs.promises.open(part, 'wx');
      try {
        for (const chunk of up.chunks) await handle.write(chunk);
      } finally {
        await handle.close();
      }
      if (await fs.promises.lstat(target).then(() => true, () => false)) {
        throw new ExportError(`${SAVE_EXPORT_DIR}/${path.basename(target)} appeared while saving; export again`);
      }
      await fs.promises.rename(part, target);
    } catch (err) {
      await fs.promises.rm(part, { force: true }).catch(() => {});
      throw err;
    } finally {
      this.reserved.delete(target);
    }
    return { abs: target, rel: path.relative(this.root, target).split(path.sep).join('/') };
  }

  /** Keeps the result of a finished upload for idleMs, so a retried last chunk gets it again. */
  private remember(up: Upload, result: ExportProgress): void {
    this.finished.set(up.id, { name: up.name, total: up.total, lastHash: up.lastHash, result, at: this.now() });
    while (this.finished.size > MAX_FINISHED) this.finished.delete(this.finished.keys().next().value as string);
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

  /** Drops uploads idle for longer than idleMs, in case a timer has not fired yet, and old finished records. */
  private sweep(): void {
    const cutoff = this.now() - this.idleMs;
    for (const up of [...this.uploads.values()]) if (up.lastActive <= cutoff) this.drop(up);
    for (const [id, done] of [...this.finished]) if (done.at <= cutoff) this.finished.delete(id);
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
      if (!victim) {
        // What is left is this upload and exports still being written.
        this.drop(up);
        throw new ExportError('The server is still saving other exports; export again in a moment');
      }
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
