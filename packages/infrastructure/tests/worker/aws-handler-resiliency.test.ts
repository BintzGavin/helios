import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAwsHandler } from '../../src/worker/aws-handler.js';
import { WorkerRuntime } from '../../src/worker/runtime.js';

vi.mock('../../src/worker/runtime.js');

describe('AWS Lambda Handler Resiliency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 for empty or undefined payload event', async () => {
    const handler = createAwsHandler();

    // undefined payload
    let result = await handler(undefined);
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).message).toMatch(/Invalid payload: must be an object/);
    expect(WorkerRuntime).not.toHaveBeenCalled();

    // null payload
    result = await handler(null);
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).message).toMatch(/Invalid payload: must be an object/);
    expect(WorkerRuntime).not.toHaveBeenCalled();
  });

  it('should return 400 for payload missing chunkIndex', async () => {
    const handler = createAwsHandler();

    const result = await handler({ jobPath: 'http://example.com/job.json' });

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).message).toMatch(/Invalid payload: missing jobPath or chunkIndex/);
    expect(WorkerRuntime).not.toHaveBeenCalled();
  });

  it('should return 400 for payload missing jobPath', async () => {
    const handler = createAwsHandler();

    const result = await handler({ chunkIndex: 1 });

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).message).toMatch(/Invalid payload: missing jobPath or chunkIndex/);
    expect(WorkerRuntime).not.toHaveBeenCalled();
  });

  it('should return 500 when WorkerRuntime throws a standard Error', async () => {
    const handler = createAwsHandler();

    const err = new Error('Storage adapter crashed');
    const p = Promise.reject(err);
    p.catch(() => {});
    vi.mocked(WorkerRuntime.prototype.run).mockReturnValue(p);

    const result = await handler({ jobPath: 'http://example.com/job.json', chunkIndex: 1 });

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).message).toBe('Storage adapter crashed');
  });

  it('should return 500 when WorkerRuntime returns a failed execution', async () => {
    const handler = createAwsHandler();

    vi.mocked(WorkerRuntime.prototype.run).mockResolvedValue({
      exitCode: 1,
      stdout: '',
      stderr: 'Render executor failed internally',
      durationMs: 50
    });

    const result = await handler({ jobPath: 'http://example.com/job.json', chunkIndex: 1 });

    expect(result.statusCode).toBe(500);
    const body = JSON.parse(result.body);
    expect(body.exitCode).toBe(1);
    expect(body.stderr).toBe('Render executor failed internally');
  });

  it('should return 500 with fallback message when WorkerRuntime throws a non-Error object', async () => {
    const handler = createAwsHandler();

    const p = Promise.reject('String throw');
    p.catch(() => {});
    vi.mocked(WorkerRuntime.prototype.run).mockReturnValue(p);

    const result = await handler({ jobPath: 'http://example.com/job.json', chunkIndex: 1 });

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).message).toBe('String throw');
  });

  it('should return 500 with fallback message when WorkerRuntime throws null', async () => {
    const handler = createAwsHandler();

    const p = Promise.reject(null);
    p.catch(() => {});
    vi.mocked(WorkerRuntime.prototype.run).mockReturnValue(p);

    const result = await handler({ jobPath: 'http://example.com/job.json', chunkIndex: 1 });

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).message).toBe('Unknown error in AWS Lambda handler');
  });
});
