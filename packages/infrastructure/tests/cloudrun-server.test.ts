import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createCloudRunServer } from '../src/worker/cloudrun-server.js';
import { WorkerRuntime } from '../src/worker/runtime.js';
import http from 'node:http';

vi.mock('../src/worker/runtime.js', () => {
  return {
    WorkerRuntime: vi.fn()
  };
});

describe('Cloud Run Server', () => {
  let mockRun: any;
  let serverInstance: http.Server;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRun = vi.fn();
    vi.mocked(WorkerRuntime).mockImplementation(function() {
      return { run: mockRun } as any;
    });
  });

  afterEach(async () => {
    if (serverInstance) {
      await new Promise<void>((resolve) => {
        serverInstance.close(() => resolve());
      });
    }
  });

  const sendPostRequest = (port: number, payload: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port,
        path: '/',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
          } catch (e) {
            resolve({ statusCode: res.statusCode, body: data });
          }
        });
      });

      req.on('error', (e) => reject(e));
      req.write(JSON.stringify(payload));
      req.end();
    });
  };

  it('should successfully execute a job and return 200 with result', async () => {
    mockRun.mockResolvedValue({ exitCode: 0, stdout: 'Success', stderr: '' });

    const cloudServer = createCloudRunServer({ port: 9001, workspaceDir: '/custom-tmp' });
    serverInstance = cloudServer.listen();

    const response = await sendPostRequest(9001, { jobPath: 'job.json', chunkIndex: 2 });

    expect(WorkerRuntime).toHaveBeenCalled();
    expect(mockRun).toHaveBeenCalledWith('job.json', 2);
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ exitCode: 0, stdout: 'Success', stderr: '' });
  });

  it('should return 405 for non-POST requests', async () => {
    const cloudServer = createCloudRunServer({ port: 9002 });
    serverInstance = cloudServer.listen();

    const response = await new Promise<any>((resolve, reject) => {
      http.get('http://localhost:9002', (res) => {
        resolve({ statusCode: res.statusCode });
      }).on('error', reject);
    });

    expect(response.statusCode).toBe(405);
    expect(WorkerRuntime).not.toHaveBeenCalled();
  });

  it('should return 400 for missing jobPath or chunkIndex', async () => {
    const cloudServer = createCloudRunServer({ port: 9003 });
    serverInstance = cloudServer.listen();

    // Missing chunkIndex
    let response = await sendPostRequest(9003, { jobPath: 'job.json' });
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(/Invalid payload/);

    // Missing jobPath
    response = await sendPostRequest(9003, { chunkIndex: 1 });
    expect(response.statusCode).toBe(400);
    expect(response.body.message).toMatch(/Invalid payload/);

    expect(WorkerRuntime).not.toHaveBeenCalled();
  });

  it('should return 500 when WorkerRuntime throws an error', async () => {
    mockRun.mockRejectedValue(new Error('Fetch failed'));

    const cloudServer = createCloudRunServer({ port: 9004 });
    serverInstance = cloudServer.listen();

    const response = await sendPostRequest(9004, { jobPath: 'job.json', chunkIndex: 0 });

    expect(response.statusCode).toBe(500);
    expect(response.body.message).toBe('Fetch failed');
  });

  it('should return 500 when exitCode is non-zero', async () => {
    mockRun.mockResolvedValue({ exitCode: 1, stdout: '', stderr: 'Render error' });

    const cloudServer = createCloudRunServer({ port: 9005 });
    serverInstance = cloudServer.listen();

    const response = await sendPostRequest(9005, { jobPath: 'job.json', chunkIndex: 0 });

    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({ exitCode: 1, stdout: '', stderr: 'Render error' });
  });
});
