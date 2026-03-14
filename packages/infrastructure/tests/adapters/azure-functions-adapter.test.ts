import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AzureFunctionsAdapter } from '../../src/adapters/azure-functions-adapter.js';
import type { WorkerJob } from '../../src/types/job.js';

describe('AzureFunctionsAdapter', () => {
  const serviceUrl = 'https://helios-render.azurewebsites.net/api/render';
  const functionKey = 'secret-key-123';
  let adapter: AzureFunctionsAdapter;
  let mockFetch: any;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    adapter = new AzureFunctionsAdapter({ serviceUrl, functionKey });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should execute a job successfully', async () => {
    const job: WorkerJob = {
      command: 'helios',
      meta: { chunkId: 0, jobDefUrl: 's3://bucket/job.json' },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ stdout: 'Render complete', stderr: '', exitCode: 0 }),
    });

    const result = await adapter.execute(job);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('Render complete');
    expect(mockFetch).toHaveBeenCalledWith(serviceUrl, expect.objectContaining({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-functions-key': functionKey,
      },
      body: JSON.stringify({ jobPath: 's3://bucket/job.json', chunkIndex: 0 }),
    }));
  });

  it('should throw an error if chunkId is missing', async () => {
    const job: WorkerJob = {
      command: 'helios',
      meta: { jobDefUrl: 's3://bucket/job.json' },
    };

    await expect(adapter.execute(job)).rejects.toThrow('chunkId is required in job metadata for Azure Functions execution');
  });

  it('should throw an error if jobDefUrl is missing', async () => {
    const job: WorkerJob = {
      command: 'helios',
      meta: { chunkId: 0 },
    };

    await expect(adapter.execute(job)).rejects.toThrow('jobDefUrl is required in job metadata or adapter config for Azure Functions execution');
  });

  it('should handle non-200 responses gracefully', async () => {
    const job: WorkerJob = {
      command: 'helios',
      meta: { chunkId: 0, jobDefUrl: 's3://bucket/job.json' },
    };

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: new Headers(),
      text: async () => 'Function timed out',
    });

    const result = await adapter.execute(job);

    expect(result.exitCode).toBe(500);
    expect(result.stderr).toContain('HTTP Error: 500 Internal Server Error');
    expect(result.stderr).toContain('Function timed out');
  });

  it('should handle fetch errors gracefully', async () => {
    const job: WorkerJob = {
      command: 'helios',
      meta: { chunkId: 0, jobDefUrl: 's3://bucket/job.json' },
    };

    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const result = await adapter.execute(job);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe('Network error');
  });

  it('should handle JSON parse error correctly', async () => {
    const controller = new AbortController();
    const job: WorkerJob = {
      command: 'helios',
      meta: { chunkId: 0, jobDefUrl: 's3://bucket/job.json' },
      signal: controller.signal,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => { throw new Error('Invalid JSON'); },
    });

    const result = await adapter.execute(job);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Failed to parse JSON response: Invalid JSON');
  });

  it('should handle non-JSON text responses', async () => {
    const controller = new AbortController();
    const job: WorkerJob = {
      command: 'helios',
      meta: { chunkId: 0, jobDefUrl: 's3://bucket/job.json' },
      signal: controller.signal,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'text/plain' }),
      text: async () => 'Raw text output',
    });

    const result = await adapter.execute(job);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('Raw text output');
  });

  it('should handle AbortSignal gracefully', async () => {
    const controller = new AbortController();
    const job: WorkerJob = {
      command: 'helios',
      meta: { chunkId: 0, jobDefUrl: 's3://bucket/job.json' },
      signal: controller.signal,
    };

    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    mockFetch.mockRejectedValueOnce(abortError);

    const result = await adapter.execute(job);

    expect(result.exitCode).toBe(143);
    expect(result.stderr).toBe('Job execution aborted by signal');
  });

  it('should omit x-functions-key if not provided in config', async () => {
    const noKeyAdapter = new AzureFunctionsAdapter({ serviceUrl });
    const job: WorkerJob = {
      command: 'helios',
      meta: { chunkId: 0, jobDefUrl: 's3://bucket/job.json' },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ stdout: 'Render complete', stderr: '', exitCode: 0 }),
    });

    await noKeyAdapter.execute(job);

    expect(mockFetch).toHaveBeenCalledWith(serviceUrl, expect.objectContaining({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }));
  });

  it('should ignore errors when reading text from a non-ok response fails', async () => {
    const job: WorkerJob = {
      command: 'helios',
      meta: { chunkId: 0, jobDefUrl: 's3://bucket/job.json' },
    };

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: new Headers(),
      text: async () => { throw new Error('Cannot read text'); },
    });

    const result = await adapter.execute(job);

    expect(result.exitCode).toBe(500);
    expect(result.stderr).toContain('HTTP Error: 500 Internal Server Error');
  });

  it('should fallback to default values if JSON response is missing them', async () => {
    const job: WorkerJob = {
      command: 'helios',
      meta: { chunkId: 0, jobDefUrl: 's3://bucket/job.json' },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({}),
    });

    const result = await adapter.execute(job);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('');
  });

  it('should handle non-Error objects thrown in fetch gracefully', async () => {
    const job: WorkerJob = {
      command: 'helios',
      meta: { chunkId: 0, jobDefUrl: 's3://bucket/job.json' },
    };

    mockFetch.mockRejectedValueOnce('String error');

    const result = await adapter.execute(job);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe('String error');
  });

  it('should hit the catch { // Ignore } block when reading text throws', async () => {
    const job: WorkerJob = {
      command: 'helios',
      meta: { chunkId: 0, jobDefUrl: 's3://bucket/job.json' },
    };

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: new Headers(),
      text: async () => { throw new Error('Cannot read text'); },
    });

    const result = await adapter.execute(job);

    expect(result.exitCode).toBe(500);
    expect(result.stderr).toContain('HTTP Error: 500 Internal Server Error');
  });

  it('should fallback to default 0 exitCode if JSON response is missing it', async () => {
    const job: WorkerJob = {
      command: 'helios',
      meta: { chunkId: 0, jobDefUrl: 's3://bucket/job.json' },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({}),
    });

    const result = await adapter.execute(job);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('');
  });
});
