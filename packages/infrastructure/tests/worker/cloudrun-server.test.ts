import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { createCloudRunServer } from '../../src/worker/cloudrun-server.js';
import { WorkerRuntime } from '../../src/worker/runtime.js';
import { Server } from 'node:http';
import { ArtifactStorage } from '../../src/types/index.js';

vi.mock('../../src/worker/runtime.js');

describe('CloudRunServer', () => {
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = createCloudRunServer({ workspaceDir: '/tmp-test', port: 0 });
    server = app.server;
    await new Promise<void>((resolve) => {
      app.listen(() => {
        const address = server.address() as any;
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should process a valid payload successfully', async () => {
    vi.mocked(WorkerRuntime.prototype.run).mockResolvedValue({
      exitCode: 0,
      stdout: 'cloudrun success',
      stderr: '',
      durationMs: 100
    });

    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobPath: 'http://test.com/job.json', chunkIndex: 1 })
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({
      exitCode: 0,
      stdout: 'cloudrun success',
      stderr: ''
    });
    expect(WorkerRuntime.prototype.run).toHaveBeenCalledWith('http://test.com/job.json', 1);
  });

  it('should inject ArtifactStorage when provided', async () => {
    const mockStorage = { downloadAssetBundle: vi.fn() } as unknown as ArtifactStorage;
    const appWithStorage = createCloudRunServer({ workspaceDir: '/tmp-test-storage', port: 0, storage: mockStorage });
    const localServer = appWithStorage.server;

    await new Promise<void>((resolve) => {
      appWithStorage.listen(() => resolve());
    });

    const address = localServer.address() as any;
    const localBaseUrl = `http://127.0.0.1:${address.port}`;

    vi.mocked(WorkerRuntime.prototype.run).mockResolvedValue({
      exitCode: 0,
      stdout: '',
      stderr: '',
      durationMs: 10
    });

    await fetch(localBaseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobPath: 'http://test.com/job.json', chunkIndex: 1 })
    });

    expect(WorkerRuntime).toHaveBeenCalledWith({ workspaceDir: '/tmp-test-storage', storage: mockStorage });

    await new Promise<void>((resolve, reject) => {
      localServer.close((err) => (err ? reject(err) : resolve()));
    });
  });

  it('should handle runtime execution errors gracefully', async () => {
    const p = Promise.reject(new Error('CloudRun failure'));
    p.catch(() => {});
    vi.mocked(WorkerRuntime.prototype.run).mockReturnValue(p);

    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobPath: 'http://test.com/job.json', chunkIndex: 2 })
    });

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data).toEqual({ message: 'CloudRun failure' });
  });

  it('should handle runtime execution errors gracefully when non-Error thrown', async () => {
    const p = Promise.reject('Plain string error');
    p.catch(() => {});
    vi.mocked(WorkerRuntime.prototype.run).mockReturnValue(p);

    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobPath: 'http://test.com/job.json', chunkIndex: 2 })
    });

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data).toEqual({ message: 'Plain string error' });
  });

  it('should handle runtime execution errors gracefully when non-Error thrown without message property', async () => {
    // This hits the `message: error.message || String(error)` fallback
    const p = Promise.reject({ something: 'else' });
    p.catch(() => {});
    vi.mocked(WorkerRuntime.prototype.run).mockReturnValue(p);

    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobPath: 'http://test.com/job.json', chunkIndex: 2 })
    });

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data).toEqual({ message: '[object Object]' });
  });

  it('should default to port 8080 when port is undefined and env PORT is undefined', async () => {
    const originalEnv = process.env.PORT;
    delete process.env.PORT;

    const appWithDefaultPort = createCloudRunServer({ workspaceDir: '/tmp-test-port' });
    const localServer = appWithDefaultPort.server;

    await new Promise<void>((resolve) => {
      appWithDefaultPort.listen(() => resolve());
    });

    const address = localServer.address() as any;
    expect(address.port).toBe(8080);

    await new Promise<void>((resolve, reject) => {
      localServer.close((err) => (err ? reject(err) : resolve()));
    });

    if (originalEnv !== undefined) {
      process.env.PORT = originalEnv;
    }
  });

  it('should default to port 8080 when config has undefined port but no other ports are set', async () => {
    const originalEnv = process.env.PORT;
    delete process.env.PORT;

    // Call without config block fallback
    const appWithDefaultPort = createCloudRunServer();
    const localServer = appWithDefaultPort.server;

    await new Promise<void>((resolve) => {
      appWithDefaultPort.listen(() => resolve());
    });

    const address = localServer.address() as any;
    expect(address.port).toBe(8080);

    await new Promise<void>((resolve, reject) => {
      localServer.close((err) => (err ? reject(err) : resolve()));
    });

    if (originalEnv !== undefined) {
      process.env.PORT = originalEnv;
    }
  });

  it('should return 500 for non-zero exit code', async () => {
    vi.mocked(WorkerRuntime.prototype.run).mockResolvedValue({
      exitCode: 1,
      stdout: '',
      stderr: 'Render failed internally',
      durationMs: 50
    });

    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobPath: 'http://test.com/job.json', chunkIndex: 3 })
    });

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data).toEqual({
      exitCode: 1,
      stdout: '',
      stderr: 'Render failed internally'
    });
  });

  it('should reject non-POST requests', async () => {
    const res = await fetch(baseUrl, { method: 'GET' });
    expect(res.status).toBe(405);
    const data = await res.json();
    expect(data).toEqual({ message: 'Method Not Allowed' });
  });

  it('should return 400 for invalid JSON body', async () => {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid-json}'
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toEqual({ message: 'Invalid JSON payload' });
  });

  it('should return 400 for missing required fields', async () => {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobPath: 'only-path' })
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data).toEqual({ message: 'Missing jobPath or chunkIndex' });
  });
});
