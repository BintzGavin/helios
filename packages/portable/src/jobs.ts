import { createReadStream } from 'node:fs';
import { mkdtemp, mkdir, open, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { Plan, parsePlan, LIMITS, RenderError, frameTime, sampleCount } from './plan.js';
import { ObjectStore, StoredObject, digest, jsonBytes, readJson, byteChunks, ByteSource } from './storage.js';
import { RenderBackend } from './backend.js';

export type JobState = 'queued' | 'preparing' | 'rendering' | 'finalizing' | 'succeeded' | 'failed' | 'canceled';
export interface JobView { id: string; state: JobState; completedChunks: number; totalChunks: number; progress: number; createdAt: number; updatedAt: number; error?: { code: string; message: string }; output?: { sha256: string; bytes: number }; engine: string }
interface Chunk { start: number; end: number; sha256: string; bytes: number }
interface Job extends JobView { tenant: string; inputHash: string; plan: Plan; chunkFrames: number; chunks: Chunk[]; prepared: boolean; attempts: number; lease?: { token: string; until: number } }
export interface ServiceOptions { workspace: string; chunkFrames?: number; leaseMs?: number; pollMs?: number; maxAttempts?: number; maxConcurrent?: number; maxStepMs?: number; maxDurationSeconds?: number; maxWorkBytes?: number; now?: () => number }
const terminal = (state: JobState) => ['succeeded', 'failed', 'canceled'].includes(state);
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical((value as Record<string, unknown>)[key])).join(',')}}`;
  return JSON.stringify(value);
}
function tenantKey(tenant: string): string { if (!tenant || tenant.length > 256) throw new RenderError('UNAUTHORIZED', 'A tenant identity is required', 401); return digest(tenant).slice(0, 32); }
const objectKey = (tenant: string, sha: string) => `a/${tenantKey(tenant)}/${sha}`;
const jobKey = (tenant: string, id: string) => { if (!/^[a-f0-9]{64}$/.test(id)) throw new RenderError('NOT_FOUND', 'Render job not found', 404); return `j/${tenantKey(tenant)}/${id}`; };
function view(job: Job): JobView {
  const { id, state, completedChunks, totalChunks, progress, createdAt, updatedAt, error, output, engine } = job;
  return { id, state, completedChunks, totalChunks, progress, createdAt, updatedAt, ...(error ? { error } : {}), ...(state === 'succeeded' && output ? { output } : {}), engine };
}

export class RenderService {
  private controllers = new Map<string, AbortController>();
  private now: () => number;
  private leaseMs: number;
  private active = 0;
  constructor(readonly store: ObjectStore, readonly backend: RenderBackend, readonly options: ServiceOptions) {
    this.now = options.now ?? Date.now; this.leaseMs = options.leaseMs ?? 60000;
    if (!Number.isInteger(options.chunkFrames ?? 60) || (options.chunkFrames ?? 60) < 1 || (options.chunkFrames ?? 60) > 300) throw new Error('chunkFrames must be an integer within 1..300');
    if (this.leaseMs < 1000 || (options.pollMs ?? 500) >= this.leaseMs / 2) throw new Error('Lease must exceed twice the polling interval');
    if (!Number.isInteger(options.maxConcurrent ?? 1) || (options.maxConcurrent ?? 1) < 1) throw new Error('maxConcurrent must be a positive integer');
  }
  async upload(tenant: string, sha256: string, body: ByteSource, expectedBytes?: number): Promise<{ sha256: string; bytes: number }> {
    if (!/^[a-f0-9]{64}$/.test(sha256)) throw new RenderError('INVALID_ASSET', 'Expected a SHA-256 asset identity');
    tenantKey(tenant);
    await mkdir(this.options.workspace, { recursive: true, mode: 0o700 });
    const directory = await mkdtemp(join(this.options.workspace, 'upload-')), path = join(directory, 'asset');
    const file = await open(path, 'wx', 0o600), hash = createHash('sha256'); let size = 0;
    try {
      for await (const chunk of byteChunks(body)) { size += chunk.length; if (size > LIMITS.assetBytes) throw new RenderError('RESOURCE_LIMIT', 'Asset exceeds 256 MiB'); hash.update(chunk); await file.writeFile(chunk); }
      await file.close();
      if (size === 0 || (expectedBytes !== undefined && size !== expectedBytes) || hash.digest('hex') !== sha256) throw new RenderError('INVALID_ASSET', 'Asset bytes do not match their declared identity');
      // Validate the complete stream before any cloud store can commit it.
      const created = await this.store.put(objectKey(tenant, sha256), createReadStream(path), null, size);
      const stored = await this.store.get(objectKey(tenant, sha256));
      if (!stored || stored.size !== size) throw new RenderError('CORRUPT_OBJECT', 'Stored asset did not match upload', 500);
      if (!created) await this.verifyObject(stored, sha256, size);
      return { sha256, bytes: size };
    } finally { await file.close().catch(() => {}); await rm(directory, { recursive: true, force: true }); }
  }
  async composeAsset(tenant: string, sha256: string, parts: string[], bytes: number): Promise<{ sha256: string; bytes: number }> {
    if (!Array.isArray(parts) || !parts.length || parts.length > 256 || parts.some(p => !/^[a-f0-9]{64}$/.test(p)) || !Number.isSafeInteger(bytes) || bytes < 1 || bytes > LIMITS.assetBytes) throw new RenderError('INVALID_ASSET', 'Invalid multipart asset manifest');
    const store = this.store;
    const body = async function* () { for (const part of parts) { const object = await store.get(objectKey(tenant, part)); if (!object) throw new RenderError('MISSING_ASSET', 'An upload part is missing'); yield* object.stream(); } };
    return this.upload(tenant, sha256, body(), bytes);
  }
  async submit(tenant: string, idempotencyKey: string, input: unknown): Promise<JobView> {
    if (typeof idempotencyKey !== 'string' || idempotencyKey.length < 1 || idempotencyKey.length > 200) throw new RenderError('INVALID_REQUEST', 'An idempotency key of 1..200 characters is required');
    const plan = parsePlan(input), id = digest(`${tenantKey(tenant)}\0${idempotencyKey}`), key = jobKey(tenant, id), inputHash = digest(canonical(plan));
    if (frameTime(plan.fps, plan.frameCount) > (this.options.maxDurationSeconds ?? 600)) throw new RenderError('HOST_LIMIT', 'Composition exceeds this deployment\u2019s duration limit', 413);
    const existing = await this.store.get(key);
    if (existing) { const job = await readJson<Job>(existing); if (job.inputHash !== inputHash) throw new RenderError('IDEMPOTENCY_CONFLICT', 'Idempotency key already belongs to different render inputs', 409); return view(job); }
    for (const asset of Object.values(plan.assets)) {
      const object = await this.store.get(objectKey(tenant, asset.sha256));
      if (!object || object.size !== asset.bytes) throw new RenderError('MISSING_ASSET', `Asset ${asset.sha256} is missing or has the wrong size`);
    }
    const now = this.now(), chunkFrames = this.options.chunkFrames ?? 60;
    if (Math.ceil(plan.frameCount / chunkFrames) > 2000) throw new RenderError('RESOURCE_LIMIT', 'Use a chunk size that produces no more than 2,000 chunks');
    const job: Job = { id, tenant, inputHash, plan, engine: await this.backend.fingerprint?.() ?? this.backend.identity, chunkFrames, chunks: [], prepared: false, attempts: 0, state: 'queued', completedChunks: 0, totalChunks: Math.ceil(plan.frameCount / chunkFrames), progress: 0, createdAt: now, updatedAt: now };
    if (!(await this.store.put(key, jsonBytes(job), null))) return this.submit(tenant, idempotencyKey, input);
    return view(job);
  }
  private async load(tenant: string, id: string): Promise<{ job: Job; version: string }> {
    const stored = await this.store.get(jobKey(tenant, id));
    if (!stored) throw new RenderError('NOT_FOUND', 'Render job not found', 404);
    const job = await readJson<Job>(stored);
    if (job.tenant !== tenant || job.id !== id) throw new RenderError('CORRUPT_STATE', 'Render job identity is invalid', 500);
    return { job, version: stored.version };
  }
  async get(tenant: string, id: string): Promise<JobView> { return view((await this.load(tenant, id)).job); }
  async cancel(tenant: string, id: string): Promise<JobView> {
    for (;;) {
      const { job, version } = await this.load(tenant, id);
      if (terminal(job.state)) return view(job);
      job.state = 'canceled'; job.updatedAt = this.now(); delete job.lease; delete job.output;
      if (await this.store.put(jobKey(tenant, id), jsonBytes(job), version)) { this.controllers.get(jobKey(tenant, id))?.abort(); return view(job); }
    }
  }
  async artifact(tenant: string, id: string): Promise<StoredObject> {
    const { job } = await this.load(tenant, id);
    if (job.state !== 'succeeded' || !job.output) throw new RenderError('NOT_READY', 'No completed artifact is available', 409);
    const artifact = await this.store.get(objectKey(tenant, job.output.sha256));
    if (!artifact || artifact.size !== job.output.bytes) throw new RenderError('CORRUPT_OBJECT', 'Completed artifact is unavailable', 500);
    return artifact;
  }
  private async materialize(tenant: string, sha: string, size: number, path: string): Promise<void> {
    const object = await this.store.get(objectKey(tenant, sha));
    if (!object || object.size !== size) throw new RenderError('CORRUPT_OBJECT', 'Asset or chunk is missing', 500);
    const file = await open(path, 'wx', 0o600), hash = createHash('sha256'); let bytes = 0;
    try {
      for await (const chunk of object.stream()) { bytes += chunk.length; if (bytes > size) throw new RenderError('CORRUPT_OBJECT', 'Asset or chunk exceeds its manifest', 500); hash.update(chunk); await file.writeFile(chunk); }
    } finally { await file.close(); }
    if (bytes !== size || hash.digest('hex') !== sha) throw new RenderError('CORRUPT_OBJECT', 'Asset or chunk failed integrity verification', 500);
  }
  private async persist(tenant: string, path: string): Promise<{ sha256: string; bytes: number }> {
    const hash = createHash('sha256'); for await (const bytes of createReadStream(path)) hash.update(bytes);
    const sha256 = hash.digest('hex'), bytes = (await stat(path)).size;
    const created = await this.store.put(objectKey(tenant, sha256), createReadStream(path), null, bytes);
    const object = await this.store.get(objectKey(tenant, sha256));
    if (!object || object.size !== bytes) throw new RenderError('CORRUPT_OBJECT', 'Stored output is missing or truncated', 500);
    if (!created) await this.verifyObject(object, sha256, bytes);
    return { sha256, bytes };
  }
  private async verifyObject(object: StoredObject, sha: string, size: number): Promise<void> {
    const hash = createHash('sha256'); let bytes = 0;
    for await (const chunk of object.stream()) { bytes += chunk.length; if (bytes > size) throw new RenderError('CORRUPT_OBJECT', 'Existing immutable object exceeds its manifest', 500); hash.update(chunk); }
    if (bytes !== size || hash.digest('hex') !== sha) throw new RenderError('CORRUPT_OBJECT', 'Existing immutable object failed integrity verification', 500);
  }
  /** One bounded durable step. Safe to await inside a function invocation. */
  async advance(tenant: string, id: string): Promise<JobView> {
    if (this.active >= (this.options.maxConcurrent ?? 1)) return this.get(tenant, id);
    this.active++;
    try { return await this.advanceOwned(tenant, id); } finally { this.active--; }
  }
  shutdown(): void { for (const controller of this.controllers.values()) controller.abort(); }
  private async advanceOwned(tenant: string, id: string): Promise<JobView> {
    const key = jobKey(tenant, id), token = randomUUID();
    let owned: Job;
    for (;;) {
      const { job, version } = await this.load(tenant, id);
      if (terminal(job.state) || (job.lease && job.lease.until > this.now())) return view(job);
      if (job.engine !== (await this.backend.fingerprint?.() ?? this.backend.identity)) throw new RenderError('ENGINE_MISMATCH', 'Job requires the originally selected rendering engine', 409);
      if (job.attempts >= (this.options.maxAttempts ?? 3)) {
        job.state = 'failed'; job.error = { code: 'RETRY_LIMIT', message: 'Render step exceeded its retry budget' }; delete job.lease;
      } else {
        job.lease = { token, until: this.now() + this.leaseMs }; job.attempts++;
        job.state = !job.prepared ? 'preparing' : job.chunks.length < job.totalChunks ? 'rendering' : 'finalizing';
      }
      job.updatedAt = this.now();
      if (await this.store.put(key, jsonBytes(job), version)) { if (terminal(job.state)) return view(job); owned = job; break; }
    }
    const controller = new AbortController(); this.controllers.set(key, controller);
    const deadline = setTimeout(() => controller.abort(new RenderError('STEP_TIMEOUT', 'Render step exceeded its time budget', 503)), this.options.maxStepMs ?? 240000);
    deadline.unref();
    let heartbeat: Promise<void> | undefined;
    const renew = async () => {
      for (;;) {
        const { job, version } = await this.load(tenant, id);
        if (terminal(job.state) || job.lease?.token !== token || job.lease.until <= this.now()) { controller.abort(); return; }
        job.lease.until = this.now() + this.leaseMs;
        if (await this.store.put(key, jsonBytes(job), version)) return;
      }
    };
    const timer = setInterval(() => { if (!heartbeat) { heartbeat = renew().catch(() => controller.abort()).finally(() => { heartbeat = undefined; }); } }, this.options.pollMs ?? 500);
    timer.unref();
    let directory: string | undefined;
    let update: Partial<Job> = {};
    try {
      const assetBytes = Object.values(owned.plan.assets).reduce((sum, asset) => sum + asset.bytes, 0);
      const scratchEstimate = assetBytes + (owned.chunks.length === owned.totalChunks ? owned.chunks.reduce((sum, chunk) => sum + chunk.bytes, 0) * 3 + sampleCount(owned.plan.fps, owned.plan.frameCount) * 8 : 0) + 64 * 1024 * 1024;
      if (scratchEstimate > (this.options.maxWorkBytes ?? Number.MAX_SAFE_INTEGER)) throw new RenderError('HOST_LIMIT', 'Render step exceeds this deployment\u2019s scratch-storage budget', 413);
      await mkdir(this.options.workspace, { recursive: true, mode: 0o700 });
      directory = await mkdtemp(join(this.options.workspace, 'render-'));
      const assets = new Map<string, string>();
      for (const [name, asset] of Object.entries(owned.plan.assets)) {
        controller.signal.throwIfAborted();
        const path = join(directory, `asset-${assets.size}`);
        await this.materialize(tenant, asset.sha256, asset.bytes, path); assets.set(name, path);
      }
      if (!owned.prepared) {
        await this.backend.preflight(owned.plan, assets, controller.signal);
        update = { prepared: true, state: 'rendering' };
      } else if (owned.chunks.length < owned.totalChunks) {
        const start = owned.chunks.length * owned.chunkFrames, end = Math.min(start + owned.chunkFrames, owned.plan.frameCount), path = join(directory, 'chunk.mp4');
        await this.backend.chunk(owned.plan, assets, path, start, end, controller.signal);
        controller.signal.throwIfAborted();
        const artifact = await this.persist(tenant, path), chunks = [...owned.chunks, { start, end, ...artifact }];
        update = { chunks, completedChunks: chunks.length, progress: Math.floor(end / owned.plan.frameCount * 95), state: chunks.length === owned.totalChunks ? 'finalizing' : 'rendering' };
      } else {
        const chunks = [];
        for (let index = 0; index < owned.chunks.length; index++) {
          const chunk = owned.chunks[index], path = join(directory, `chunk-${index}.mp4`);
          await this.materialize(tenant, chunk.sha256, chunk.bytes, path); chunks.push({ path, start: chunk.start, end: chunk.end });
        }
        const output = join(directory, 'output.mp4');
        await this.backend.finalize(owned.plan, assets, chunks, output, controller.signal);
        controller.signal.throwIfAborted();
        update = { output: await this.persist(tenant, output), state: 'succeeded', progress: 100 };
      }
      update.attempts = 0; update.error = undefined;
    } catch (error) {
      const known = error instanceof RenderError;
      update = { state: owned.attempts >= (this.options.maxAttempts ?? 3) || (known && error.status < 500) ? 'failed' : owned.state, error: { code: known ? error.code : 'RENDER_FAILED', message: known ? error.message : 'Render step failed; retry is safe' } };
    } finally {
      clearTimeout(deadline); clearInterval(timer); await heartbeat; if (this.controllers.get(key) === controller) this.controllers.delete(key);
      if (directory) await rm(directory, { recursive: true, force: true }).catch(() => {});
    }
    // The fencing token prevents a canceled, expired or replaced executor from
    // committing even if it finished computation or uploaded an orphan artifact.
    for (;;) {
      const { job, version } = await this.load(tenant, id);
      if (terminal(job.state) || job.lease?.token !== token || job.lease.until <= this.now()) return view(job);
      Object.assign(job, update); delete job.lease; job.updatedAt = this.now();
      if (await this.store.put(key, jsonBytes(job), version)) return view(job);
    }
  }
  async *pending(): AsyncIterable<{ tenant: string; id: string }> {
    for await (const key of this.store.list('j/')) {
      const object = await this.store.get(key); if (!object) continue;
      let job: Job;
      try { job = await readJson<Job>(object); } catch { console.error('Portable worker: unreadable job manifest; skipping'); continue; }
      if (!terminal(job.state)) yield { tenant: job.tenant, id: job.id };
    }
  }
}
