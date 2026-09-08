import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { getJob } from './render-manager';

export class RenderAccessError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export const MAX_CHUNK_BYTES = 256 * 1024;
const terminal = new Set(['completed', 'failed', 'cancelled']);
export function requireJob(id: string) {
  const job = /^[a-zA-Z0-9-]{1,100}$/.test(id) ? getJob(id) : undefined;
  if (!job) throw new RenderAccessError('JOB_NOT_FOUND', 'Render job not found.', 404);
  return job;
}
export async function getRenderStatus(id: string, waitMs = 0, signal?: AbortSignal) {
  if (!Number.isInteger(waitMs) || waitMs < 0 || waitMs > 30000) {
    throw new RenderAccessError('INVALID_WAIT', 'waitMs must be an integer from 0 to 30000.');
  }
  const deadline = Date.now() + waitMs;
  let job = requireJob(id);
  while (!terminal.has(job.status) && Date.now() < deadline && !signal?.aborted) {
    await new Promise((r) => setTimeout(r, Math.min(100, deadline - Date.now())));
    job = requireJob(id);
  }
  return {
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    error: job.error,
    timedOut: waitMs > 0 && !terminal.has(job.status),
  };
}

// Never accept a caller-supplied file path. Validate persisted history too.
async function openOutput(id: string, root: string) {
  const job = requireJob(id);
  if (job.status !== 'completed')
    throw new RenderAccessError('OUTPUT_NOT_READY', 'Render has not completed.', 409);
  const dir = path.resolve(root, 'renders');
  const expected = path.join(dir, `render-${id}.mp4`);
  if (job.outputPath !== expected)
    throw new RenderAccessError(
      'UNSAFE_OUTPUT',
      'Output is outside the managed render location.',
      403,
    );
  try {
    const realRoot = await fs.realpath(root);
    if (
      (await fs.realpath(dir)) !== path.join(realRoot, 'renders') ||
      (await fs.lstat(expected)).isSymbolicLink() ||
      (await fs.realpath(expected)) !== path.join(realRoot, 'renders', `render-${id}.mp4`)
    ) {
      throw new RenderAccessError('UNSAFE_OUTPUT', 'Output links are not supported.', 403);
    }
    const file = await fs.open(expected, constants.O_RDONLY | constants.O_NOFOLLOW);
    const stat = await file.stat();
    if (!stat.isFile() || stat.size === 0) {
      await file.close();
      throw new RenderAccessError('OUTPUT_EMPTY', 'Render output is not a nonempty file.', 409);
    }
    return { file, size: stat.size };
  } catch (error) {
    if (error instanceof RenderAccessError) throw error;
    throw new RenderAccessError('OUTPUT_MISSING', 'Render output is no longer available.', 404);
  }
}
export async function getRenderOutput(id: string, root: string) {
  const { file, size } = await openOutput(id, root);
  await file.close();
  return {
    jobId: id,
    mimeType: 'video/mp4',
    size,
    path: `/mcp/outputs/${id}`,
    maxChunkBytes: MAX_CHUNK_BYTES,
  };
}
export async function readRenderOutput(
  id: string,
  root: string,
  offset = 0,
  length = MAX_CHUNK_BYTES,
) {
  if (
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    !Number.isInteger(length) ||
    length < 1 ||
    length > MAX_CHUNK_BYTES
  ) {
    throw new RenderAccessError('INVALID_RANGE', 'Invalid output offset or chunk length.', 416);
  }
  const { file, size } = await openOutput(id, root);
  try {
    if (offset >= size)
      throw new RenderAccessError('INVALID_RANGE', 'Offset exceeds output size.', 416);
    const buffer = Buffer.alloc(Math.min(length, size - offset));
    const { bytesRead } = await file.read(buffer, 0, buffer.length, offset);
    return {
      jobId: id,
      offset,
      nextOffset: offset + bytesRead,
      size,
      eof: offset + bytesRead === size,
      data: buffer.subarray(0, bytesRead).toString('base64'),
    };
  } finally {
    await file.close();
  }
}

export async function serveRenderOutput(
  id: string,
  root: string,
  req: IncomingMessage,
  res: ServerResponse,
) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    res.end();
    return;
  }
  const { file, size } = await openOutput(id, root);
  let start = 0;
  let end = size - 1;
  const range = req.headers.range;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (match && (match[1] || match[2])) {
      if (!match[1]) start = Math.max(0, size - Number(match[2]));
      else {
        start = Number(match[1]);
        if (match[2]) end = Math.min(end, Number(match[2]));
      }
    } else start = size;
    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start > end ||
      start >= size
    ) {
      await file.close();
      res.writeHead(416, { 'Content-Range': `bytes */${size}` });
      res.end();
      return;
    }
  }
  res.writeHead(range ? 206 : 200, {
    'Content-Type': 'video/mp4',
    'Content-Length': end - start + 1,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
    ...(range ? { 'Content-Range': `bytes ${start}-${end}/${size}` } : {}),
  });
  if (req.method === 'HEAD') {
    await file.close();
    res.end();
    return;
  }
  const stream = file.createReadStream({ start, end });
  res.on('close', () => stream.destroy());
  stream.on('error', () => res.destroy());
  stream.pipe(res);
}
