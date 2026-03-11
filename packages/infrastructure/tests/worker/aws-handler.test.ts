import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAwsHandler } from '../../src/worker/aws-handler.js';
import { WorkerRuntime } from '../../src/worker/runtime.js';
import { ArtifactStorage } from '../../src/types/index.js';

vi.mock('../../src/worker/runtime.js');

describe('AwsHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should process a valid payload successfully', async () => {
    const handler = createAwsHandler({ workspaceDir: '/mock-dir' });

    vi.mocked(WorkerRuntime.prototype.run).mockResolvedValue({
      exitCode: 0,
      stdout: 'success output',
      stderr: '',
      durationMs: 100
    });

    const result = await handler({ jobPath: 'http://example.com/job.json', chunkIndex: 0 });

    expect(WorkerRuntime.prototype.run).toHaveBeenCalledWith('http://example.com/job.json', 0);
    expect(result).toEqual({
      statusCode: 200,
      body: JSON.stringify({ exitCode: 0, output: 'success output', stderr: '' })
    });
  });

  it('should inject ArtifactStorage when provided', async () => {
    const mockStorage = { downloadAssetBundle: vi.fn() } as unknown as ArtifactStorage;
    const handler = createAwsHandler({ workspaceDir: '/mock-dir', storage: mockStorage });

    vi.mocked(WorkerRuntime.prototype.run).mockResolvedValue({
      exitCode: 0,
      stdout: '',
      stderr: '',
      durationMs: 10
    });

    await handler({ jobPath: 'http://example.com/job.json', chunkIndex: 0 });

    expect(WorkerRuntime).toHaveBeenCalledWith({ workspaceDir: '/mock-dir', storage: mockStorage });
  });

  it('should handle runtime execution errors gracefully', async () => {
    const handler = createAwsHandler();

    const p = Promise.reject(new Error('Rendering failed'));
    p.catch(() => {});
    vi.mocked(WorkerRuntime.prototype.run).mockReturnValue(p);

    const result = await handler({ jobPath: 'http://example.com/job.json', chunkIndex: 1 });

    expect(result).toEqual({
      statusCode: 500,
      body: JSON.stringify({ message: 'Rendering failed' })
    });
  });

  it('should handle non-zero exit codes', async () => {
    const handler = createAwsHandler();

    vi.mocked(WorkerRuntime.prototype.run).mockResolvedValue({
      exitCode: 1,
      stdout: '',
      stderr: 'Render error details',
      durationMs: 50
    });

    const result = await handler({ jobPath: 'http://example.com/job.json', chunkIndex: 2 });

    expect(result).toEqual({
      statusCode: 500,
      body: JSON.stringify({ exitCode: 1, output: '', stderr: 'Render error details' })
    });
  });

  it('should return 400 for invalid event types', async () => {
    const handler = createAwsHandler();

    expect(await handler(null)).toEqual({
      statusCode: 400,
      body: JSON.stringify({ message: 'Invalid payload: must be an object' })
    });

    expect(await handler('string payload')).toEqual({
      statusCode: 400,
      body: JSON.stringify({ message: 'Invalid payload: must be an object' })
    });
  });

  it('should return 400 for missing jobPath or chunkIndex', async () => {
    const handler = createAwsHandler();

    expect(await handler({})).toEqual({
      statusCode: 400,
      body: JSON.stringify({ message: 'Invalid payload: missing jobPath or chunkIndex' })
    });

    expect(await handler({ jobPath: 'test.json' })).toEqual({
      statusCode: 400,
      body: JSON.stringify({ message: 'Invalid payload: missing jobPath or chunkIndex' })
    });

    expect(await handler({ chunkIndex: 0 })).toEqual({
      statusCode: 400,
      body: JSON.stringify({ message: 'Invalid payload: missing jobPath or chunkIndex' })
    });
  });
});
