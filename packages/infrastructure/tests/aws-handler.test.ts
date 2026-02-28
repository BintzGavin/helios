import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAwsHandler } from '../src/worker/aws-handler.js';
import { WorkerRuntime } from '../src/worker/runtime.js';

vi.mock('../src/worker/runtime.js', () => {
  return {
    WorkerRuntime: vi.fn()
  };
});

describe('AWS Lambda Handler', () => {
  let mockRun: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRun = vi.fn();
    vi.mocked(WorkerRuntime).mockImplementation(function() {
      return { run: mockRun } as any;
    });
  });

  it('should successfully execute a job and return 200 with result', async () => {
    mockRun.mockResolvedValue({ exitCode: 0, stdout: 'Success', stderr: '' });

    const handler = createAwsHandler({ workspaceDir: '/custom-tmp' });
    const event = { jobPath: 'https://example.com/job.json', chunkIndex: 1 };

    const result = await handler(event);

    expect(WorkerRuntime).toHaveBeenCalled();
    expect(mockRun).toHaveBeenCalledWith('https://example.com/job.json', 1);
    expect(result).toEqual({
      statusCode: 200,
      body: JSON.stringify({ exitCode: 0, output: 'Success', stderr: '' })
    });
  });

  it('should return 400 for missing jobPath or chunkIndex', async () => {
    const handler = createAwsHandler();

    // Missing chunkIndex
    let result = await handler({ jobPath: 'job.json' });
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).message).toMatch(/Invalid payload/);

    // Missing jobPath
    result = await handler({ chunkIndex: 1 });
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).message).toMatch(/Invalid payload/);

    expect(WorkerRuntime).not.toHaveBeenCalled();
  });

  it('should return 500 when WorkerRuntime throws an error', async () => {
    mockRun.mockRejectedValue(new Error('Fetch failed'));

    const handler = createAwsHandler();
    const event = { jobPath: 'job.json', chunkIndex: 0 };

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).message).toBe('Fetch failed');
  });

  it('should return 500 when exitCode is non-zero', async () => {
    mockRun.mockResolvedValue({ exitCode: 1, stdout: '', stderr: 'Render error' });

    const handler = createAwsHandler();
    const event = { jobPath: 'job.json', chunkIndex: 0 };

    const result = await handler(event);

    expect(result).toEqual({
      statusCode: 500,
      body: JSON.stringify({ exitCode: 1, output: '', stderr: 'Render error' })
    });
  });
});
