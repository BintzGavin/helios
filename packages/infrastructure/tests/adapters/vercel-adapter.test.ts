import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VercelAdapter } from '../../src/adapters/vercel-adapter.js';

describe('VercelAdapter', () => {
  const mockServiceUrl = 'https://my-vercel-project.vercel.app/api/render';

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should post payload and return WorkerResult on success', async () => {
    const adapter = new VercelAdapter({ serviceUrl: mockServiceUrl });
    const job = {
      command: 'ffmpeg',
      args: [],
      cwd: '/',
      env: {},
      meta: {
        jobDefUrl: 'https://storage/job.json',
        chunkId: 1
      }
    };

    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({
        exitCode: 0,
        stdout: 'done',
        stderr: '',
        durationMs: 123
      })
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as any);

    const result = await adapter.execute(job);

    expect(fetch).toHaveBeenCalledWith(mockServiceUrl, expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobPath: 'https://storage/job.json', chunkIndex: 1 })
    }));

    expect(result).toEqual({
      exitCode: 0,
      stdout: 'done',
      stderr: '',
      durationMs: 123
    });
  });

  it('should use config.jobDefUrl if job.meta.jobDefUrl is missing', async () => {
    const adapter = new VercelAdapter({ serviceUrl: mockServiceUrl, jobDefUrl: 'config-url' });
    const job = { command: 'test', args: [], cwd: '/', env: {}, meta: { chunkId: 1 } };

    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '', durationMs: 0 })
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as any);

    await adapter.execute(job);

    expect(fetch).toHaveBeenCalledWith(mockServiceUrl, expect.objectContaining({
      body: JSON.stringify({ jobPath: 'config-url', chunkIndex: 1 })
    }));
  });

  it('should include authToken if provided', async () => {
    const adapter = new VercelAdapter({ serviceUrl: mockServiceUrl, authToken: 'secret123' });
    const job = { command: 'test', args: [], cwd: '/', env: {}, meta: { jobDefUrl: 'url', chunkId: 0 } };

    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '', durationMs: 0 })
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as any);

    await adapter.execute(job);

    expect(fetch).toHaveBeenCalledWith(mockServiceUrl, expect.objectContaining({
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer secret123'
      }
    }));
  });

  it('should throw if jobDefUrl is missing', async () => {
    const adapter = new VercelAdapter({ serviceUrl: mockServiceUrl });
    const job = { command: 'test', args: [], cwd: '/', env: {}, meta: { chunkId: 1 } };
    await expect(adapter.execute(job)).rejects.toThrow('VercelAdapter requires job.meta.jobDefUrl or config.jobDefUrl to be set');
  });

  it('should throw if chunkId is missing', async () => {
    const adapter = new VercelAdapter({ serviceUrl: mockServiceUrl });
    const job = { command: 'test', args: [], cwd: '/', env: {}, meta: { jobDefUrl: 'url' } };
    await expect(adapter.execute(job)).rejects.toThrow('VercelAdapter requires job.meta.chunkId to be set');
  });

  it('should throw if fetch fails with non-ok status', async () => {
    const adapter = new VercelAdapter({ serviceUrl: mockServiceUrl });
    const job = { command: 'test', args: [], cwd: '/', env: {}, meta: { jobDefUrl: 'url', chunkId: 1 } };

    const mockResponse = {
      ok: false,
      status: 500,
      statusText: 'Internal Server Error'
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as any);

    await expect(adapter.execute(job)).rejects.toThrow('VercelAdapter failed with status 500: Internal Server Error');
  });

  it('should throw if fetch throws a network error', async () => {
    const adapter = new VercelAdapter({ serviceUrl: mockServiceUrl });
    const job = { command: 'test', args: [], cwd: '/', env: {}, meta: { jobDefUrl: 'url', chunkId: 1 } };

    const p = Promise.reject(new Error('Network error'));
    p.catch(() => {});
    vi.mocked(fetch).mockReturnValue(p as any);

    await expect(adapter.execute(job)).rejects.toThrow('VercelAdapter fetch failed: Network error');
  });

  it('should throw if response is invalid JSON', async () => {
    const adapter = new VercelAdapter({ serviceUrl: mockServiceUrl });
    const job = { command: 'test', args: [], cwd: '/', env: {}, meta: { jobDefUrl: 'url', chunkId: 1 } };

    const p = Promise.reject(new Error('Unexpected token'));
    p.catch(() => {});
    const mockResponse = {
      ok: true,
      json: vi.fn().mockReturnValue(p as any)
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as any);

    await expect(adapter.execute(job)).rejects.toThrow('VercelAdapter received invalid JSON: Unexpected token');
  });

  it('should fall back to defaults when response JSON lacks expected fields', async () => {
    const adapter = new VercelAdapter({ serviceUrl: mockServiceUrl });
    const job = { command: 'test', args: [], cwd: '/', env: {}, meta: { jobDefUrl: 'url', chunkId: 1 } };

    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({}) // Empty object, lacking expected fields
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as any);

    const result = await adapter.execute(job);

    expect(result.exitCode).toBe(-1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('');
    expect(result.durationMs).toBe(0);
  });

  it('should propagate AbortError if signal is aborted', async () => {
    const adapter = new VercelAdapter({ serviceUrl: mockServiceUrl });
    const controller = new AbortController();
    controller.abort();
    const job = { command: 'test', args: [], cwd: '/', env: {}, signal: controller.signal, meta: { jobDefUrl: 'url', chunkId: 1 } };

    const abortError = new Error('AbortError');
    abortError.name = 'AbortError';
    const p = Promise.reject(abortError);
    p.catch(() => {});
    vi.mocked(fetch).mockReturnValue(p as any);

    await expect(adapter.execute(job)).rejects.toThrow('AbortError');
  });

  it('should default missing response fields to fallback values', async () => {
    const adapter = new VercelAdapter({ serviceUrl: mockServiceUrl });
    const job = { command: 'test', args: [], cwd: '/', env: {}, meta: { jobDefUrl: 'url', chunkId: 1 } };

    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({})
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as any);

    const result = await adapter.execute(job);

    expect(result.exitCode).toBe(-1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toBe('');
    expect(result.durationMs).toBe(0);
  });
});
