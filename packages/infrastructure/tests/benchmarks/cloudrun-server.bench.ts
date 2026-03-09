import { describe, bench, beforeAll, afterAll, vi } from 'vitest';
import { createCloudRunServer } from '../../src/worker/cloudrun-server.js';
import { WorkerRuntime } from '../../src/worker/runtime.js';
import http from 'node:http';

vi.mock('../../src/worker/runtime.js');

describe('CloudRunServer Benchmark', () => {
  let server: ReturnType<typeof createCloudRunServer>;
  let httpServer: http.Server;
  let dynamicPort: number;

  beforeAll(async () => {
    vi.mocked(WorkerRuntime.prototype.run).mockResolvedValue({
      exitCode: 0,
      stdout: 'Mock output',
      stderr: ''
    });

    server = createCloudRunServer({ port: 0 }); // Use ephemeral port

    await new Promise<void>((resolve) => {
      httpServer = server.server.listen(0, () => {
        const address = httpServer.address();
        if (address && typeof address !== 'string') {
          dynamicPort = address.port;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    // Force close connections to prevent keep-alive timeout hanging
    httpServer.closeAllConnections?.();

    await new Promise<void>((resolve, reject) => {
      httpServer.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });

  bench('handle request', async () => {
    const payload = JSON.stringify({ jobPath: '/tmp/test.json', chunkIndex: 0 });

    const req = http.request({
      hostname: 'localhost',
      port: dynamicPort,
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    });

    req.write(payload);
    req.end();

    await new Promise<void>((resolve, reject) => {
      req.on('response', (res) => {
        res.on('data', () => {});
        res.on('end', resolve);
      });
      req.on('error', reject);
    });
  });
});
