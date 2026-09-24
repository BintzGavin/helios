import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { createCloudRunServer } from '../../src/worker/cloudrun-server.js';
import { WorkerRuntime } from '../../src/worker/runtime.js';
import { Server } from 'node:http';
import * as http from 'node:http';
import { ArtifactStorage } from '../../src/types/index.js';

vi.mock('../../src/worker/runtime.js');

describe('CloudRunServer', () => {
  let app: ReturnType<typeof createCloudRunServer>;
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    app = createCloudRunServer({ workspaceDir: '/tmp-test', port: 0 });
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

  it('should return 400 for request with missing body', async () => {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toBe('Invalid JSON payload');
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

  it('should handle network interruption during payload receiving', async () => {
    // We mock the req stream to simulate network interruption inside the server logic directly
    // to avoid node http level unhandled rejections during test runs.

    const mockReq: any = new http.IncomingMessage(null as any);
    mockReq.method = 'POST';

    const mockRes: any = new http.ServerResponse(mockReq);
    mockRes.writeHead = vi.fn();
    mockRes.end = vi.fn();

    // The handler internally loops: for await (const chunk of req)
    // We simulate an error being thrown in this stream
    const errorGen = async function* () {
      yield Buffer.from('{"jobPath": "');
      throw 'String error thrown'; // Testing String(e) fallback line 33
    };

    mockReq[Symbol.asyncIterator] = errorGen;

    // Use a custom createServer to get the handler logic
    const handler = (app as any).server.listeners('request')[0];

    await handler(mockReq, mockRes);

    expect(mockRes.writeHead).toHaveBeenCalledWith(500, { 'Content-Type': 'application/json' });
    expect(mockRes.end).toHaveBeenCalledWith(expect.stringContaining('String error thrown'));
  });

  it('should handle network interruption using an actual Error object', async () => {
    const mockReq: any = new http.IncomingMessage(null as any);
    mockReq.method = 'POST';

    const mockRes: any = new http.ServerResponse(mockReq);
    mockRes.writeHead = vi.fn();
    mockRes.end = vi.fn();

    const errorGen = async function* () {
      yield Buffer.from('{"jobPath": "');
      throw new Error('network disconnected');
    };

    mockReq[Symbol.asyncIterator] = errorGen;

    const handler = (app as any).server.listeners('request')[0];

    await handler(mockReq, mockRes);

    expect(mockRes.writeHead).toHaveBeenCalledWith(500, { 'Content-Type': 'application/json' });
    expect(mockRes.end).toHaveBeenCalledWith(expect.stringContaining('network disconnected'));
  });
});
