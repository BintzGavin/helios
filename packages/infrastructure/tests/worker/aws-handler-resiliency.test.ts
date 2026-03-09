import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAwsHandler } from '../../src/worker/aws-handler.js';
import { WorkerRuntime } from '../../src/worker/runtime.js';

vi.mock('../../src/worker/runtime.js', () => {
  return {
    WorkerRuntime: vi.fn()
  };
});

describe('AWS Lambda Handler Resiliency', () => {
  let mockRun: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRun = vi.fn();
    vi.mocked(WorkerRuntime).mockImplementation(function() {
      return { run: mockRun } as any;
    });
  });

  it('should return 400 for empty or undefined payload event', async () => {
    const handler = createAwsHandler();
    const result = await handler({});

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).message).toMatch(/Invalid payload: missing jobPath or chunkIndex/);
    expect(WorkerRuntime).not.toHaveBeenCalled();
  });

  it('should return 400 for payload missing chunkIndex', async () => {
    const handler = createAwsHandler();
    const result = await handler({ jobPath: 'job.json' });

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
    mockRun.mockRejectedValue(new Error('Internal fetch exception'));

    const handler = createAwsHandler();
    const event = { jobPath: 'job.json', chunkIndex: 0 };

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).message).toBe('Internal fetch exception');
  });

  it('should return 500 when WorkerRuntime returns a failed execution', async () => {
    mockRun.mockResolvedValue({ exitCode: 1, stdout: '', stderr: 'Render crash' });

    const handler = createAwsHandler();
    const event = { jobPath: 'job.json', chunkIndex: 0 };

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).exitCode).toBe(1);
    expect(JSON.parse(result.body).stderr).toBe('Render crash');
  });

  it('should return 500 with fallback message when WorkerRuntime throws a non-Error object', async () => {
    mockRun.mockRejectedValue('String throw');

    const handler = createAwsHandler();
    const event = { jobPath: 'job.json', chunkIndex: 0 };

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).message).toBe('Unknown error in AWS Lambda handler');
  });

  it('should return 500 with fallback message when WorkerRuntime throws null', async () => {
    mockRun.mockRejectedValue(null);

    const handler = createAwsHandler();
    const event = { jobPath: 'job.json', chunkIndex: 0 };

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).message).toBe('Unknown error in AWS Lambda handler');
  });
});
