import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CloudflareWorkersAdapter } from '../../src/adapters/cloudflare-workers-adapter.js';

describe('CloudflareWorkersAdapter', () => {
  const serviceUrl = 'https://render.example.workers.dev';
  const jobDefUrl = 's3://bucket/job.json';

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should throw if chunkId is missing', async () => {
    const adapter = new CloudflareWorkersAdapter({ serviceUrl });
    await expect(adapter.execute({ command: 'render', meta: {} })).rejects.toThrow('CloudflareWorkersAdapter requires job.meta.chunkId to be set');
  });

  it('should return error if jobDefUrl is missing', async () => {
    const adapter = new CloudflareWorkersAdapter({ serviceUrl });
    const result = await adapter.execute({ command: 'render', meta: { chunkId: 0 } });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('requires jobDefUrl');
  });

  it('should execute successfully with 200 OK', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(new Response(JSON.stringify({ exitCode: 0, stdout: 'Rendered chunk 0', stderr: '' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const adapter = new CloudflareWorkersAdapter({ serviceUrl, jobDefUrl });
    const result = await adapter.execute({ command: 'render', meta: { chunkId: 0 } });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('Rendered chunk 0');
    expect(global.fetch).toHaveBeenCalledWith(serviceUrl, expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobPath: jobDefUrl, chunkIndex: 0 })
    }));
  });

  it('should handle authentication token', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(new Response(JSON.stringify({ exitCode: 0 }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const adapter = new CloudflareWorkersAdapter({ serviceUrl, authToken: 'secret-token', jobDefUrl });
    await adapter.execute({ command: 'render', meta: { chunkId: 1 } });
    expect(global.fetch).toHaveBeenCalledWith(serviceUrl, expect.objectContaining({
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer secret-token' }
    }));
  });

  it('should return error result on non-200 HTTP status', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(new Response('Internal Server Error', { status: 500 }));
    const adapter = new CloudflareWorkersAdapter({ serviceUrl, jobDefUrl });
    const result = await adapter.execute({ command: 'render', meta: { chunkId: 0 } });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('HTTP Error 500');
  });

  it('should handle network errors gracefully', async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network offline'));
    const adapter = new CloudflareWorkersAdapter({ serviceUrl, jobDefUrl });
    const result = await adapter.execute({ command: 'render', meta: { chunkId: 0 } });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Network offline');
  });

  it('should handle AbortError gracefully', async () => {
    const error = new Error('The operation was aborted');
    error.name = 'AbortError';
    vi.mocked(global.fetch).mockRejectedValueOnce(error);
    const adapter = new CloudflareWorkersAdapter({ serviceUrl, jobDefUrl });
    const result = await adapter.execute({ command: 'render', meta: { chunkId: 0 } });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Job was cancelled');
  });

  it('should use data.output as stdout fallback', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(new Response(JSON.stringify({ exitCode: 0, output: 'Fallback output', stderr: '' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const adapter = new CloudflareWorkersAdapter({ serviceUrl, jobDefUrl });
    const result = await adapter.execute({ command: 'render', meta: { chunkId: 0 } });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('Fallback output');
  });

  it('should force exitCode 1 when response is not ok and exitCode is 0', async () => {
    // Verifies the scenario where HTTP status implies failure, but payload exitCode is 0.
    vi.mocked(global.fetch).mockResolvedValueOnce(new Response(JSON.stringify({ exitCode: 0, stderr: 'HTTP Error 500' }), { status: 500, headers: { 'Content-Type': 'application/json' } }));
    const adapter = new CloudflareWorkersAdapter({ serviceUrl, jobDefUrl });
    const result = await adapter.execute({ command: 'render', meta: { chunkId: 0 } });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('HTTP Error 500');
  });

  it('should use default exit code if not provided (0 for ok response)', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(new Response(JSON.stringify({ stdout: 'success' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const adapter = new CloudflareWorkersAdapter({ serviceUrl, jobDefUrl });
    const result = await adapter.execute({ command: 'render', meta: { chunkId: 0 } });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('success');
  });

  it('should use default exit code if not provided (1 for non-ok response)', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(new Response(JSON.stringify({ stdout: 'error' }), { status: 500, statusText: 'Internal Server Error', headers: { 'Content-Type': 'application/json' } }));
    const adapter = new CloudflareWorkersAdapter({ serviceUrl, jobDefUrl });
    const result = await adapter.execute({ command: 'render', meta: { chunkId: 0 } });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('HTTP Error 500: Internal Server Error');
  });

  it('should use data.output when data.stdout is undefined or empty', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(new Response(JSON.stringify({ exitCode: 0, output: 'Output fallback' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const adapter = new CloudflareWorkersAdapter({ serviceUrl, jobDefUrl });
    const result = await adapter.execute({ command: 'render', meta: { chunkId: 0 } });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('Output fallback');
  });

  it('should fallback to exitCode 1 when response is not ok and exitCode is parsed as 0', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(new Response(JSON.stringify({ exitCode: 0, stderr: 'Server Error' }), { status: 500, headers: { 'Content-Type': 'application/json' } }));
    const adapter = new CloudflareWorkersAdapter({ serviceUrl, jobDefUrl });
    const result = await adapter.execute({ command: 'render', meta: { chunkId: 0 } });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Server Error');
  });

  it('should preserve non-zero exit code when response is not ok', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(new Response(JSON.stringify({ exitCode: 123, stderr: 'Custom Error' }), { status: 500, headers: { 'Content-Type': 'application/json' } }));
    const adapter = new CloudflareWorkersAdapter({ serviceUrl, jobDefUrl });
    const result = await adapter.execute({ command: 'render', meta: { chunkId: 0 } });
    expect(result.exitCode).toBe(123);
    expect(result.stderr).toContain('Custom Error');
  });
});
