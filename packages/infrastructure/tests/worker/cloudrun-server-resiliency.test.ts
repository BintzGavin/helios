import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import { createCloudRunServer } from '../../src/worker/cloudrun-server.js';
import { WorkerRuntime } from '../../src/worker/runtime.js';
import { Server } from 'node:http';
import * as http from 'node:http';

vi.mock('../../src/worker/runtime.js');

describe('CloudRunServer Resiliency', () => {
  let server: Server;
  let baseUrl: string;
  let app: ReturnType<typeof createCloudRunServer>;

  beforeAll(async () => {
    app = createCloudRunServer({ workspaceDir: '/tmp-resiliency', port: 0 });
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

  it('should return 400 for request with missing body', async () => {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toBe('Invalid JSON payload');
  });

  it('should return 400 for request with malformed JSON causing JSON.parse to throw', async () => {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"jobPath": "http://example.com/job.json", "chunkIndex": 1'
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toBe('Invalid JSON payload');
  });

  it('should return 400 for request where chunkIndex is missing but jobPath exists', async () => {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobPath: 'http://example.com/job.json' })
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.message).toBe('Missing jobPath or chunkIndex');
  });

  it('should test server port defaulting logic if not explicitly provided', async () => {
    const originalEnv = process.env.PORT;
    delete process.env.PORT;

    const defaultApp = createCloudRunServer();
    const localServer = defaultApp.server;

    await new Promise<void>((resolve) => {
      defaultApp.listen(() => resolve());
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

  it('should test HTTP server close mechanism', async () => {
    const tempApp = createCloudRunServer({ port: 0 });
    const localServer = tempApp.server;

    await new Promise<void>((resolve) => {
      tempApp.listen(() => resolve());
    });

    const address = localServer.address() as any;
    const tempUrl = `http://127.0.0.1:${address.port}`;

    const res1 = await fetch(tempUrl, { method: 'GET' });
    expect(res1.status).toBe(405);

    await new Promise<void>((resolve, reject) => {
      localServer.close((err) => (err ? reject(err) : resolve()));
    });

    await expect(fetch(tempUrl, { method: 'GET' })).rejects.toThrow();
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
