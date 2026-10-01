import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { RenderService } from './jobs.js';
import { RenderError, LIMITS } from './plan.js';
import { StoredObject } from './storage.js';

export interface HandlerOptions { authorize(request: Request): Promise<string | null>; maxUploadBytes?: number; maxDownloadBytes?: number }
async function* requestBytes(request: Request, limit: number): AsyncIterable<Uint8Array> {
  if (!request.body) return;
  let count = 0;
  const reader = request.body.getReader();
  try {
    for (;;) { const result = await reader.read(); if (result.done) break; count += result.value.length; if (count > limit) throw new RenderError('PAYLOAD_TOO_LARGE', 'Request exceeds its byte limit', 413); yield result.value; }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
async function requestJson(request: Request): Promise<Record<string, unknown>> {
  const parts = []; for await (const chunk of requestBytes(request, LIMITS.inputBytes + 1024)) parts.push(Buffer.from(chunk));
  try { const value = JSON.parse(Buffer.concat(parts).toString()); if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error(); return value; }
  catch { throw new RenderError('INVALID_JSON', 'Expected a JSON object'); }
}
function onlyKeys(body: Record<string, unknown>, keys: string[]): void { if (Object.keys(body).some(key => !keys.includes(key))) throw new RenderError('INVALID_REQUEST', 'Unknown request property'); }
function objectResponse(object: StoredObject, range: string | null, maximum = Number.MAX_SAFE_INTEGER): Response {
  let start = 0, end = object.size - 1;
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2])) return new Response(null, { status: 416, headers: { 'content-range': `bytes */${object.size}` } });
    if (!match[1]) start = Math.max(0, object.size - Number(match[2]));
    else { start = Number(match[1]); if (match[2]) end = Math.min(end, Number(match[2])); }
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= object.size) return new Response(null, { status: 416, headers: { 'content-range': `bytes */${object.size}` } });
  }
  if (end - start + 1 > maximum) {
    if (!range) throw new RenderError('RANGE_REQUIRED', 'Download this artifact with bounded byte-range requests', 413);
    end = Math.min(end, start + maximum - 1);
  }
  const body = async function* () {
    let bytes = 0;
    for await (const chunk of object.stream({ start, end })) { bytes += chunk.length; if (bytes > end - start + 1) throw new RenderError('CORRUPT_OBJECT', 'Artifact range exceeded its declared length', 500); yield chunk; }
    if (bytes !== end - start + 1) throw new RenderError('CORRUPT_OBJECT', 'Artifact range was truncated', 500);
  };
  return new Response(Readable.toWeb(Readable.from(body())) as ReadableStream<Uint8Array>, { status: range ? 206 : 200, headers: { 'content-type': 'video/mp4', 'content-length': String(end - start + 1), 'accept-ranges': 'bytes', 'cache-control': 'private, no-store', ...(range ? { 'content-range': `bytes ${start}-${end}/${object.size}` } : {}) } });
}
/** Web-standard handler; authentication/tenant lookup is supplied by the host. */
export function createRenderHandler(service: RenderService, options: HandlerOptions): (request: Request) => Promise<Response> {
  return async request => {
    try {
      const path = new URL(request.url).pathname;
      if (path === '/health' && request.method === 'GET') return Response.json({ status: 'ok', engine: service.backend.identity, profile: 'portable-v1', qualification: 'experimental', limits: { durationSeconds: service.options.maxDurationSeconds ?? 600, scratchBytes: service.options.maxWorkBytes ?? null } });
      const tenant = await options.authorize(request);
      if (!tenant) throw new RenderError('UNAUTHORIZED', 'Authentication is required', 401);
      const asset = /^\/v1\/assets\/([a-f0-9]{64})$/.exec(path);
      const compose = /^\/v1\/assets\/([a-f0-9]{64})\/compose$/.exec(path);
      if (compose && request.method === 'POST') {
        const body = await requestJson(request); onlyKeys(body, ['parts', 'bytes']);
        return Response.json(await service.composeAsset(tenant, compose[1], body.parts as string[], body.bytes as number), { status: 201 });
      }
      if (asset && request.method === 'PUT') {
        const header = request.headers.get('content-length'), bytes = header === null ? undefined : Number(header);
        if (bytes !== undefined && (!Number.isSafeInteger(bytes) || bytes <= 0 || bytes > (options.maxUploadBytes ?? LIMITS.assetBytes))) throw new RenderError('PAYLOAD_TOO_LARGE', 'Invalid upload size', 413);
        return Response.json(await service.upload(tenant, asset[1], requestBytes(request, options.maxUploadBytes ?? LIMITS.assetBytes), bytes), { status: 201 });
      }
      if (path === '/v1/renders' && request.method === 'POST') {
        const body = await requestJson(request); onlyKeys(body, ['idempotencyKey', 'plan']);
        return Response.json(await service.submit(tenant, body.idempotencyKey as string, body.plan), { status: 202 });
      }
      const match = /^\/v1\/renders\/([a-f0-9]{64})(?:\/(advance|cancel|artifact))?$/.exec(path);
      if (match) {
        if (!match[2] && request.method === 'GET') return Response.json(await service.get(tenant, match[1]), { headers: { 'cache-control': 'no-store' } });
        if (match[2] === 'advance' && request.method === 'POST') return Response.json(await service.advance(tenant, match[1]), { headers: { 'cache-control': 'no-store' } });
        if (match[2] === 'cancel' && request.method === 'POST') return Response.json(await service.cancel(tenant, match[1]));
        if (match[2] === 'artifact' && request.method === 'GET') return objectResponse(await service.artifact(tenant, match[1]), request.headers.get('range'), options.maxDownloadBytes);
        throw new RenderError('METHOD_NOT_ALLOWED', 'Method is not supported on this route', 405);
      }
      throw new RenderError('NOT_FOUND', 'Route not found', 404);
    } catch (error) {
      const known = error instanceof RenderError;
      return Response.json({ error: { code: known ? error.code : 'INTERNAL_ERROR', message: known ? error.message : 'Render service could not complete the request' } }, { status: known ? error.status : 500, headers: { 'cache-control': 'no-store' } });
    }
  };
}
export function nodeHandler(handler: (request: Request) => Promise<Response>) {
  return async (incoming: IncomingMessage, outgoing: ServerResponse): Promise<void> => {
    const headers = new Headers();
    for (const [key, value] of Object.entries(incoming.headers)) { if (Array.isArray(value)) value.forEach(v => headers.append(key, v)); else if (value !== undefined) headers.set(key, value); }
    const controller = new AbortController(); incoming.on('aborted', () => controller.abort());
    try {
      const init: RequestInit & { duplex?: string } = { method: incoming.method, headers, signal: controller.signal };
      if (incoming.method !== 'GET' && incoming.method !== 'HEAD') { init.body = Readable.toWeb(incoming) as ReadableStream<Uint8Array>; init.duplex = 'half'; }
      const response = await handler(new Request(`http://render.local${incoming.url ?? '/'}`, init));
      outgoing.statusCode = response.status; response.headers.forEach((value, key) => outgoing.setHeader(key, value));
      if (response.body) await pipeline(Readable.fromWeb(response.body as never), outgoing); else outgoing.end();
    } catch { if (!outgoing.headersSent) { outgoing.statusCode = 500; outgoing.end('Render service error'); } else outgoing.destroy(); }
  };
}
export function createRenderServer(service: RenderService, options: HandlerOptions) { return createServer(nodeHandler(createRenderHandler(service, options))); }

/** Durable state drives this loop; a restart resumes jobs through expiring leases. */
export async function runWorker(service: RenderService, signal: AbortSignal, intervalMs = 250): Promise<void> {
  while (!signal.aborted) {
    try {
      for await (const job of service.pending()) {
        if (signal.aborted) break;
        try { await service.advance(job.tenant, job.id); }
        catch { console.error('Portable worker: durable step unavailable; will retry'); }
      }
    } catch { console.error('Portable worker: durable queue unavailable; will retry'); }
    if (!signal.aborted) await new Promise<void>(resolve => { const timer = setTimeout(done, intervalMs); function done() { clearTimeout(timer); signal.removeEventListener('abort', done); resolve(); } signal.addEventListener('abort', done, { once: true }); });
  }
}
