import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  ExportError,
  ExportUploads,
  isMp4Start,
  sanitizeExportName,
  SAVE_EXPORT_CHUNK_BYTES,
  SAVE_EXPORT_IDLE_MS,
  SAVE_EXPORT_MAX_BYTES,
  SAVE_EXPORT_MAX_CHUNK_CHARS,
  SAVE_EXPORT_MAX_CHUNKS,
  ExportQuota,
  SAVE_EXPORT_MAX_FILES,
  SAVE_EXPORT_MAX_TOTAL_BYTES,
} from '../exports.js';

/** An MP4-shaped payload: an ftyp box, then deterministic filler. */
function mp4(bytes: number): Buffer {
  const b = Buffer.alloc(bytes);
  let x = 12345;
  for (let i = 0; i < bytes; i++) { x = (x * 1103515245 + 12345) >>> 0; b[i] = x >>> 24; }
  Buffer.from([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70]).copy(b, 0);
  return b;
}

function chunksOf(file: Buffer, size: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < file.length; i += size) out.push(file.subarray(i, i + size).toString('base64'));
  return out;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let tmp: string;
let root: string;

beforeEach(() => {
  tmp = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'helios-exports-test-')));
  root = path.join(tmp, 'project');
  fs.mkdirSync(root);
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

describe('save_export limits', () => {
  it('caps an export at 200 MB in 1 MB chunks', () => {
    expect(SAVE_EXPORT_MAX_BYTES).toBe(200 * 1024 * 1024);
    expect(SAVE_EXPORT_CHUNK_BYTES).toBe(1024 * 1024);
    expect(SAVE_EXPORT_MAX_CHUNKS).toBe(200);
    // A full 1 MB chunk fits in the character limit, and one byte more would not.
    expect(Buffer.alloc(SAVE_EXPORT_CHUNK_BYTES).toString('base64').length).toBeLessThanOrEqual(SAVE_EXPORT_MAX_CHUNK_CHARS);
    expect(Buffer.alloc(SAVE_EXPORT_CHUNK_BYTES + 3).toString('base64').length).toBeGreaterThan(SAVE_EXPORT_MAX_CHUNK_CHARS);
    expect(SAVE_EXPORT_IDLE_MS).toBe(10 * 60 * 1000);
  });
});

describe('sanitizeExportName', () => {
  it('accepts a bare .mp4 file name', () => {
    expect(sanitizeExportName('video.mp4')).toBe('video.mp4');
    expect(sanitizeExportName('My Video (final).MP4')).toBe('My Video (final).MP4');
    expect(sanitizeExportName(' spaced.mp4 ')).toBe('spaced.mp4');
  });

  it.each([
    ['../escape.mp4', 'folders or ..'],
    ['a/b.mp4', 'a folder'],
    ['a\\b.mp4', 'a Windows folder'],
    ['/etc/x.mp4', 'an absolute path'],
    ['C:\\x.mp4', 'a drive path'],
    ['..mp4', '..'],
    ['video..mp4', '..'],
    ['video.mov', 'another extension'],
    ['video.mp4.exe', 'a trailing extension'],
    ['.mp4', 'no name'],
    ['.hidden.mp4', 'a hidden file'],
    ['bad\u0000.mp4', 'a NUL byte'],
    ['bad\n.mp4', 'a newline'],
    ['a:b.mp4', 'a colon'],
    ['a*b.mp4', 'a wildcard'],
    ['x'.repeat(200) + '.mp4', 'too long'],
    ['', 'empty'],
    ['CON.mp4', 'a Windows device name'],
    ['nul.mp4', 'a Windows device name in lower case'],
    ['Com1.mp4', 'a COM port'],
    ['lpt9.mp4', 'an LPT port'],
    ['aux.final.mp4', 'a device name before the first dot'],
    ['evil‮gnp.mp4', 'a right-to-left override'],
    ['a⁦b.mp4', 'a bidi isolate'],
  ])('refuses %j (%s)', (name) => {
    expect(() => sanitizeExportName(name)).toThrow(ExportError);
  });
});

describe('isMp4Start', () => {
  it('checks for an ftyp box at the start', () => {
    expect(isMp4Start(mp4(64))).toBe(true);
    expect(isMp4Start(Buffer.from('hello world!'))).toBe(false);
    expect(isMp4Start(Buffer.from([0, 0, 0, 24, 0x66, 0x74, 0x79]))).toBe(false);
    // A box size below its own header is not a box.
    expect(isMp4Start(Buffer.from([0, 0, 0, 4, 0x66, 0x74, 0x79, 0x70]))).toBe(false);
  });
});

describe('ExportUploads', () => {
  it('saves ordered chunks under exports/ in the root and returns the absolute path', async () => {
    const uploads = new ExportUploads(root, { chunkBytes: 1000 });
    const file = mp4(3500);
    const parts = chunksOf(file, 1000);
    const results = [];
    for (let i = 0; i < parts.length; i++) {
      results.push(await uploads.receive({ name: 'clip.mp4', uploadId: 'upload-0001', index: i, total: parts.length, data: parts[i] }));
    }
    expect(results.slice(0, 3).map((r) => r.received)).toEqual([1, 2, 3]);
    expect(results[0].path).toBeUndefined();
    const last = results[3];
    expect(last).toEqual({
      received: 4, total: 4, bytes: 3500,
      path: 'exports/clip.mp4', absolutePath: path.join(root, 'exports', 'clip.mp4'),
    });
    expect(path.isAbsolute(last.absolutePath!)).toBe(true);
    expect(fs.readFileSync(last.absolutePath!).equals(file)).toBe(true);
    // Nothing half-written is left beside it, and nothing stays in memory.
    expect(fs.readdirSync(path.join(root, 'exports'))).toEqual(['clip.mp4']);
    expect(uploads.size).toBe(0);
    expect(uploads.bufferedBytes).toBe(0);
  });

  it('never replaces an earlier export: a taken name gets -2, -3 and so on', async () => {
    const uploads = new ExportUploads(root);
    fs.mkdirSync(path.join(root, 'exports'));
    fs.writeFileSync(path.join(root, 'exports', 'clip.mp4'), 'old');
    const file = mp4(100);
    const r = await uploads.receive({ name: 'clip.mp4', uploadId: 'upload-0002', index: 0, total: 1, data: file.toString('base64') });
    expect(r.path).toBe('exports/clip-2.mp4');
    expect(fs.readFileSync(r.absolutePath!).equals(file)).toBe(true);
    expect(fs.readFileSync(path.join(root, 'exports', 'clip.mp4'), 'utf8')).toBe('old');
    const r3 = await uploads.receive({ name: 'clip.mp4', uploadId: 'upload-0003', index: 0, total: 1, data: file.toString('base64') });
    expect(r3.path).toBe('exports/clip-3.mp4');
  });

  it('refuses a symlink at the target name instead of writing through it', async () => {
    const outside = path.join(tmp, 'victim.mp4');
    fs.writeFileSync(outside, 'keep me');
    const inside = path.join(root, 'notes.txt');
    fs.writeFileSync(inside, 'keep me too');
    fs.mkdirSync(path.join(root, 'exports'));
    fs.symlinkSync(outside, path.join(root, 'exports', 'out.mp4'));
    fs.symlinkSync(inside, path.join(root, 'exports', 'in.mp4'));
    const uploads = new ExportUploads(root);
    for (const name of ['out.mp4', 'in.mp4']) {
      await expect(uploads.receive({ name, uploadId: 'upload-0004', index: 0, total: 1, data: mp4(64).toString('base64') }))
        .rejects.toThrow(/symlink/);
    }
    expect(fs.readFileSync(outside, 'utf8')).toBe('keep me');
    expect(fs.readFileSync(inside, 'utf8')).toBe('keep me too');
  });

  it('caps saved exports per server process by count and by total bytes', async () => {
    expect(SAVE_EXPORT_MAX_FILES).toBe(50);
    expect(SAVE_EXPORT_MAX_TOTAL_BYTES).toBe(2 * 1024 * 1024 * 1024);

    const byCount = new ExportUploads(root, { quota: new ExportQuota({ maxFiles: 2 }) });
    const send = (u: ExportUploads, id: string, bytes = 64) =>
      u.receive({ name: 'x.mp4', uploadId: id, index: 0, total: 1, data: mp4(bytes).toString('base64') });
    await send(byCount, 'count-001');
    await send(byCount, 'count-002');
    await expect(send(byCount, 'count-003')).rejects.toThrow(/limit of 2 exports/);

    // The quota is shared: two upload stores on one quota count together.
    const quota = new ExportQuota({ maxBytes: 150 });
    await send(new ExportUploads(root, { quota }), 'bytes-001', 100);
    await expect(send(new ExportUploads(root, { quota }), 'bytes-002', 100)).rejects.toThrow(/limit of 150 bytes/);
    expect(quota.files).toBe(1);
    expect(quota.bytes).toBe(100);
  });

  it('frees an upload when the view cancels it', async () => {
    const uploads = new ExportUploads(root, { chunkBytes: 100 });
    const parts = chunksOf(mp4(200), 100);
    await uploads.receive({ name: 'x.mp4', uploadId: 'abort-0001', index: 0, total: 2, data: parts[0] });
    expect(uploads.bufferedBytes).toBe(100);
    expect(uploads.abort('abort-0001')).toBe(true);
    expect(uploads.size).toBe(0);
    expect(uploads.bufferedBytes).toBe(0);
    expect(uploads.abort('abort-0001')).toBe(false);
    await expect(uploads.receive({ name: 'x.mp4', uploadId: 'abort-0001', index: 1, total: 2, data: parts[1] })).rejects.toThrow(/unknown or expired/);
  });

  it('answers a retried final chunk with the saved file instead of saving it twice', async () => {
    const uploads = new ExportUploads(root, { chunkBytes: 100 });
    const file = mp4(200);
    const parts = chunksOf(file, 100);
    await uploads.receive({ name: 'x.mp4', uploadId: 'retry-0001', index: 0, total: 2, data: parts[0] });
    const done = await uploads.receive({ name: 'x.mp4', uploadId: 'retry-0001', index: 1, total: 2, data: parts[1] });
    const again = await uploads.receive({ name: 'x.mp4', uploadId: 'retry-0001', index: 1, total: 2, data: parts[1] });
    expect(again).toEqual(done);
    expect(fs.readdirSync(path.join(root, 'exports'))).toEqual(['x.mp4']);
    // Other bytes under the finished id are not a retry.
    await expect(uploads.receive({ name: 'x.mp4', uploadId: 'retry-0001', index: 1, total: 2, data: parts[0] })).rejects.toThrow(/unknown or expired/);
  });

  it('forgets finished uploads after the idle timeout', async () => {
    let now = 0;
    const uploads = new ExportUploads(root, { idleMs: 1000, now: () => now });
    const data = mp4(64).toString('base64');
    await uploads.receive({ name: 'x.mp4', uploadId: 'retry-0002', index: 0, total: 1, data });
    now = 2000;
    // A fresh upload under the old id, not a retry: saved again, under a new name.
    const r = await uploads.receive({ name: 'x.mp4', uploadId: 'retry-0002', index: 0, total: 1, data });
    expect(r.path).toBe('exports/x-2.mp4');
  });

  it('counts an export toward the memory bound until it is written', async () => {
    const uploads = new ExportUploads(root);
    const pending = uploads.receive({ name: 'x.mp4', uploadId: 'write-0001', index: 0, total: 1, data: mp4(500).toString('base64') });
    expect(uploads.bufferedBytes).toBe(500);
    await pending;
    expect(uploads.bufferedBytes).toBe(0);
  });

  it('refuses unsafe names before buffering anything', async () => {
    const uploads = new ExportUploads(root);
    for (const name of ['../escape.mp4', 'a/b.mp4', 'video.webm']) {
      await expect(uploads.receive({ name, uploadId: 'upload-0003', index: 0, total: 1, data: mp4(64).toString('base64') })).rejects.toThrow(ExportError);
    }
    expect(uploads.size).toBe(0);
    expect(fs.existsSync(path.join(tmp, 'escape.mp4'))).toBe(false);
  });

  it('refuses a first chunk that is not an MP4', async () => {
    const uploads = new ExportUploads(root);
    await expect(uploads.receive({ name: 'x.mp4', uploadId: 'upload-0004', index: 0, total: 1, data: Buffer.from('hello world!').toString('base64') }))
      .rejects.toThrow(/not an MP4/);
    expect(uploads.size).toBe(0);
  });

  it('refuses data that is not base64, and empty chunks', async () => {
    const uploads = new ExportUploads(root);
    for (const data of ['not base64!', 'AAA', '']) {
      await expect(uploads.receive({ name: 'x.mp4', uploadId: 'upload-0005', index: 0, total: 1, data })).rejects.toThrow(ExportError);
    }
  });

  it('refuses a chunk over the chunk size', async () => {
    const uploads = new ExportUploads(root, { chunkBytes: 64 });
    await expect(uploads.receive({ name: 'x.mp4', uploadId: 'upload-0006', index: 0, total: 1, data: mp4(65).toString('base64') }))
      .rejects.toThrow(/chunks of at most/);
  });

  it('refuses an export over the size cap, by declared chunks or by bytes, and drops it', async () => {
    const uploads = new ExportUploads(root, { maxBytes: 200, chunkBytes: 100 });
    // Three chunks of 100 bytes can't fit in 200.
    await expect(uploads.receive({ name: 'x.mp4', uploadId: 'upload-0007', index: 0, total: 3, data: mp4(100).toString('base64') }))
      .rejects.toThrow(/over the 200 bytes limit/);

    // Bytes: two chunks declared, but the second takes it over.
    const big = new ExportUploads(root, { maxBytes: 150, chunkBytes: 100 });
    await big.receive({ name: 'x.mp4', uploadId: 'upload-0008', index: 0, total: 2, data: mp4(100).toString('base64') });
    await expect(big.receive({ name: 'x.mp4', uploadId: 'upload-0008', index: 1, total: 2, data: mp4(100).toString('base64') }))
      .rejects.toThrow(/over the 150 bytes limit/);
    expect(big.size).toBe(0);
    expect(fs.existsSync(path.join(root, 'exports'))).toBe(false);
  });

  it('refuses chunks out of order and drops the upload', async () => {
    const uploads = new ExportUploads(root, { chunkBytes: 100 });
    const parts = chunksOf(mp4(300), 100);
    // An unknown upload must start at 0.
    await expect(uploads.receive({ name: 'x.mp4', uploadId: 'upload-0009', index: 1, total: 3, data: parts[1] })).rejects.toThrow(/from index 0/);
    await uploads.receive({ name: 'x.mp4', uploadId: 'upload-0009', index: 0, total: 3, data: parts[0] });
    await expect(uploads.receive({ name: 'x.mp4', uploadId: 'upload-0009', index: 2, total: 3, data: parts[2] })).rejects.toThrow(/out of order/);
    expect(uploads.size).toBe(0);
    await expect(uploads.receive({ name: 'x.mp4', uploadId: 'upload-0009', index: 1, total: 3, data: parts[1] })).rejects.toThrow(/unknown or expired/);
  });

  it('refuses a chunk whose name or total differs from its upload', async () => {
    const uploads = new ExportUploads(root, { chunkBytes: 100 });
    const parts = chunksOf(mp4(200), 100);
    await uploads.receive({ name: 'x.mp4', uploadId: 'upload-0010', index: 0, total: 2, data: parts[0] });
    await expect(uploads.receive({ name: 'y.mp4', uploadId: 'upload-0010', index: 1, total: 2, data: parts[1] })).rejects.toThrow(/does not match/);
    expect(uploads.size).toBe(0);
  });

  it('acknowledges a repeated chunk once, as a retry, without appending it twice', async () => {
    const uploads = new ExportUploads(root, { chunkBytes: 100 });
    const file = mp4(250);
    const parts = chunksOf(file, 100);
    await uploads.receive({ name: 'x.mp4', uploadId: 'upload-0011', index: 0, total: 3, data: parts[0] });
    await uploads.receive({ name: 'x.mp4', uploadId: 'upload-0011', index: 1, total: 3, data: parts[1] });
    expect(await uploads.receive({ name: 'x.mp4', uploadId: 'upload-0011', index: 1, total: 3, data: parts[1] }))
      .toEqual({ received: 2, total: 3, bytes: 200 });
    const done = await uploads.receive({ name: 'x.mp4', uploadId: 'upload-0011', index: 2, total: 3, data: parts[2] });
    expect(fs.readFileSync(done.absolutePath!).equals(file)).toBe(true);

    // A different chunk under a used index is not a retry.
    await uploads.receive({ name: 'x.mp4', uploadId: 'upload-0012', index: 0, total: 2, data: parts[0] });
    await expect(uploads.receive({ name: 'x.mp4', uploadId: 'upload-0012', index: 0, total: 2, data: mp4(90).toString('base64') }))
      .rejects.toThrow(/out of order/);
  });

  it('writes only inside the project root, even through a symlinked exports folder', async () => {
    const outside = path.join(tmp, 'outside');
    fs.mkdirSync(outside);
    fs.symlinkSync(outside, path.join(root, 'exports'));
    const uploads = new ExportUploads(root);
    await expect(uploads.receive({ name: 'x.mp4', uploadId: 'upload-0013', index: 0, total: 1, data: mp4(64).toString('base64') }))
      .rejects.toThrow(/outside the project root/);
    expect(fs.readdirSync(outside)).toEqual([]);
  });

  it('leaves a folder with the export name alone and saves beside it', async () => {
    fs.mkdirSync(path.join(root, 'exports', 'x.mp4', 'inner'), { recursive: true });
    const uploads = new ExportUploads(root);
    const r = await uploads.receive({ name: 'x.mp4', uploadId: 'upload-0014', index: 0, total: 1, data: mp4(64).toString('base64') });
    expect(r.path).toBe('exports/x-2.mp4');
    expect(fs.statSync(path.join(root, 'exports', 'x.mp4')).isDirectory()).toBe(true);
    expect(fs.readdirSync(path.join(root, 'exports', 'x.mp4'))).toEqual(['inner']);
  });

  it('refuses an exports path that is a file, not a folder', async () => {
    fs.writeFileSync(path.join(root, 'exports'), 'not a folder');
    const uploads = new ExportUploads(root);
    await expect(uploads.receive({ name: 'x.mp4', uploadId: 'upload-0015', index: 0, total: 1, data: mp4(64).toString('base64') }))
      .rejects.toThrow();
    expect(fs.readFileSync(path.join(root, 'exports'), 'utf8')).toBe('not a folder');
  });

  it('drops an upload after the idle timeout, even with no further calls', async () => {
    const uploads = new ExportUploads(root, { idleMs: 40, chunkBytes: 100 });
    const parts = chunksOf(mp4(200), 100);
    await uploads.receive({ name: 'x.mp4', uploadId: 'upload-0015', index: 0, total: 2, data: parts[0] });
    expect(uploads.size).toBe(1);
    expect(uploads.bufferedBytes).toBe(100);
    await sleep(80);
    expect(uploads.bufferedBytes).toBe(0);
    expect(uploads.size).toBe(0);
    await expect(uploads.receive({ name: 'x.mp4', uploadId: 'upload-0015', index: 1, total: 2, data: parts[1] })).rejects.toThrow(/unknown or expired/);
  });

  it('keeps an upload alive while chunks keep arriving', async () => {
    let now = 0;
    const uploads = new ExportUploads(root, { idleMs: 1000, chunkBytes: 100, now: () => now });
    const parts = chunksOf(mp4(300), 100);
    await uploads.receive({ name: 'x.mp4', uploadId: 'upload-0016', index: 0, total: 3, data: parts[0] });
    now = 900;
    await uploads.receive({ name: 'x.mp4', uploadId: 'upload-0016', index: 1, total: 3, data: parts[1] });
    now = 1800;
    const done = await uploads.receive({ name: 'x.mp4', uploadId: 'upload-0016', index: 2, total: 3, data: parts[2] });
    expect(done.path).toBe('exports/x.mp4');
    // ...and the clock alone drops a stale one.
    await uploads.receive({ name: 'y.mp4', uploadId: 'upload-0017', index: 0, total: 2, data: parts[0] });
    now = 2800;
    expect(uploads.size).toBe(0);
  });

  it('bounds memory: a new upload drops the least recently active one beyond the byte and upload limits', async () => {
    let now = 0;
    const uploads = new ExportUploads(root, { maxBytes: 300, chunkBytes: 100, maxBufferedBytes: 300, maxUploads: 2, now: () => now });
    const parts = chunksOf(mp4(300), 100);
    const send = (id: string, index: number) => uploads.receive({ name: `${id}.mp4`, uploadId: id, index, total: 3, data: parts[index] });

    await send('upload-a001', 0); now++;
    await send('upload-a001', 1); now++;
    await send('upload-b001', 0); now++;
    expect(uploads.bufferedBytes).toBe(300);
    // 400 bytes would be over the 300-byte bound: the older upload (a) goes.
    await send('upload-b001', 1); now++;
    expect(uploads.size).toBe(1);
    expect(uploads.bufferedBytes).toBe(200);
    await expect(send('upload-a001', 2)).rejects.toThrow(/unknown or expired/);

    // At most two uploads at once: a third start drops the least recently active.
    await send('upload-c001', 0); now++;
    await send('upload-d001', 0); now++;
    expect(uploads.size).toBe(2);
    await expect(send('upload-b001', 2)).rejects.toThrow(/unknown or expired/);
    expect(uploads.bufferedBytes).toBeLessThanOrEqual(300);
  });

  it('refuses malformed upload ids and indices', async () => {
    const uploads = new ExportUploads(root);
    const data = mp4(64).toString('base64');
    await expect(uploads.receive({ name: 'x.mp4', uploadId: 'short', index: 0, total: 1, data })).rejects.toThrow(/uploadId/);
    await expect(uploads.receive({ name: 'x.mp4', uploadId: '../../etc/passwd', index: 0, total: 1, data })).rejects.toThrow(/uploadId/);
    await expect(uploads.receive({ name: 'x.mp4', uploadId: 'upload-0018', index: 1, total: 1, data })).rejects.toThrow(/index/);
    await expect(uploads.receive({ name: 'x.mp4', uploadId: 'upload-0018', index: 0, total: 0, data })).rejects.toThrow(/total/);
  });
});
