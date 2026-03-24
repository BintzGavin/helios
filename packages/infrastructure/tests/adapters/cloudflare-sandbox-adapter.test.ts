import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CloudflareSandboxAdapter } from '../../src/adapters/cloudflare-sandbox-adapter.js';

describe('CloudflareSandboxAdapter', () => {
  const config = {
    accountId: 'test-account-123',
    apiToken: 'test-token-456',
    namespace: 'helios-render',
    pollIntervalMs: 100, // Fast polls for tests
    maxPollAttempts: 3,
  };

  beforeEach(() => {
    global.fetch = vi.fn();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should throw if chunkId is missing', async () => {
    const adapter = new CloudflareSandboxAdapter(config);
    await expect(adapter.execute({ command: 'render', meta: {} })).rejects.toThrow(
      'CloudflareSandboxAdapter requires job.meta.chunkId to be set'
    );
  });

  it('should create sandbox with keepAlive and correct auth', async () => {
    const fetchMock = vi.mocked(global.fetch);

    // 1. Create sandbox
    fetchMock.mockResolvedValueOnce(new Response(
      JSON.stringify({ result: { url: 'https://test-sandbox.sandbox.cloudflare.com' } }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));

    // 2. Start render (nohup)
    fetchMock.mockResolvedValueOnce(new Response(
      JSON.stringify({ result: { output: '' } }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));

    // 3. First poll - check recycling (stat)
    fetchMock.mockResolvedValueOnce(new Response(
      JSON.stringify({ result: { output: '0' } }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));

    // 4. First poll - check status.txt
    fetchMock.mockResolvedValueOnce(new Response(
      JSON.stringify({ result: { output: '0' } }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));

    // 5. First poll - collect render.log
    fetchMock.mockResolvedValueOnce(new Response(
      JSON.stringify({ result: { output: 'Rendered chunk 0' } }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));

    // 6. Destroy sandbox
    fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }));

    const adapter = new CloudflareSandboxAdapter(config);
    const result = await adapter.execute({ command: 'render', meta: { chunkId: 0 } });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('Rendered chunk 0');

    // Verify sandbox creation included keepAlive
    const createCall = fetchMock.mock.calls[0];
    expect(createCall[0]).toContain('/sandbox');
    const createBody = JSON.parse(createCall[1]?.body as string);
    expect(createBody.keepAlive).toBe(true);

    // Verify auth header
    expect(createCall[1]?.headers).toEqual(expect.objectContaining({
      'Authorization': 'Bearer test-token-456',
    }));
  });

  it('should handle sandbox creation failure', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response('Insufficient permissions', { status: 403 })
    );

    const adapter = new CloudflareSandboxAdapter(config);
    const result = await adapter.execute({ command: 'render', meta: { chunkId: 0 } });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Cloudflare Sandbox execution failed');
    expect(result.stderr).toContain('403');
  });

  it('should handle AbortSignal cancellation', async () => {
    const controller = new AbortController();
    controller.abort();

    // Create sandbox still succeeds
    vi.mocked(global.fetch).mockResolvedValueOnce(new Response(
      JSON.stringify({ result: { url: 'https://test.sandbox.cloudflare.com' } }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));

    // Destroy sandbox (cleanup)
    vi.mocked(global.fetch).mockResolvedValueOnce(new Response('', { status: 200 }));

    const adapter = new CloudflareSandboxAdapter(config);
    const result = await adapter.execute({
      command: 'render',
      meta: { chunkId: 0 },
      signal: controller.signal,
    });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Job was cancelled');
  });

  it('should return error when render fails with non-zero exit code', async () => {
    const fetchMock = vi.mocked(global.fetch);

    // Create sandbox
    fetchMock.mockResolvedValueOnce(new Response(
      JSON.stringify({ result: { url: 'https://test.sandbox.cloudflare.com' } }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));

    // Start render
    fetchMock.mockResolvedValueOnce(new Response(
      JSON.stringify({ result: { output: '' } }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));

    // Poll - check recycling
    fetchMock.mockResolvedValueOnce(new Response(
      JSON.stringify({ result: { output: '0' } }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));

    // Poll - status.txt shows exit code 1
    fetchMock.mockResolvedValueOnce(new Response(
      JSON.stringify({ result: { output: '1' } }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));

    // Collect render.log for error details
    fetchMock.mockResolvedValueOnce(new Response(
      JSON.stringify({ result: { output: 'FFmpeg error: invalid codec' } }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));

    // Destroy sandbox
    fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }));

    const adapter = new CloudflareSandboxAdapter(config);
    const result = await adapter.execute({ command: 'render', meta: { chunkId: 0 } });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('FFmpeg error: invalid codec');
  });

  it('should timeout after maxPollAttempts', async () => {
    const fetchMock = vi.mocked(global.fetch);

    // Create sandbox
    fetchMock.mockResolvedValueOnce(new Response(
      JSON.stringify({ result: { url: 'https://test.sandbox.cloudflare.com' } }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));

    // Start render
    fetchMock.mockResolvedValueOnce(new Response(
      JSON.stringify({ result: { output: '' } }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));

    // All poll attempts return "(not found)" for status and alive for ps
    for (let i = 0; i < config.maxPollAttempts; i++) {
      // Recycling check
      fetchMock.mockResolvedValueOnce(new Response(
        JSON.stringify({ result: { output: '0' } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ));
      // Status check
      fetchMock.mockResolvedValueOnce(new Response(
        JSON.stringify({ result: { output: '(not found)' } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ));
      // PS check (process still running)
      fetchMock.mockResolvedValueOnce(new Response(
        JSON.stringify({ result: { output: 'node helios render' } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Destroy sandbox
    fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }));

    const adapter = new CloudflareSandboxAdapter(config);
    const result = await adapter.execute({ command: 'render', meta: { chunkId: 0 } });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('timed out');
  });

  it('should strip ANSI codes from log output', async () => {
    const fetchMock = vi.mocked(global.fetch);

    // Create sandbox
    fetchMock.mockResolvedValueOnce(new Response(
      JSON.stringify({ result: { url: 'https://test.sandbox.cloudflare.com' } }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));

    // Start render
    fetchMock.mockResolvedValueOnce(new Response(
      JSON.stringify({ result: { output: '' } }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));

    // Poll - check recycling
    fetchMock.mockResolvedValueOnce(new Response(
      JSON.stringify({ result: { output: '0' } }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));

    // Status = 0 (success)
    fetchMock.mockResolvedValueOnce(new Response(
      JSON.stringify({ result: { output: '0' } }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));

    // Render.log with ANSI codes
    fetchMock.mockResolvedValueOnce(new Response(
      JSON.stringify({ result: { output: '\x1B[32mSuccess\x1B[0m: Rendered \x1B[1m60\x1B[0m frames' } }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));

    // Destroy
    fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }));

    const adapter = new CloudflareSandboxAdapter(config);
    const result = await adapter.execute({ command: 'render', meta: { chunkId: 0 } });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('Success: Rendered 60 frames');
    expect(result.stdout).not.toContain('\x1B');
  });

  it('should always attempt to destroy sandbox even on error', async () => {
    const fetchMock = vi.mocked(global.fetch);

    // Create sandbox succeeds
    fetchMock.mockResolvedValueOnce(new Response(
      JSON.stringify({ result: { url: 'https://test.sandbox.cloudflare.com' } }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));

    // Start render fails
    fetchMock.mockResolvedValueOnce(new Response('exec failed', { status: 500 }));

    // Destroy sandbox (should still be called)
    fetchMock.mockResolvedValueOnce(new Response('', { status: 200 }));

    const adapter = new CloudflareSandboxAdapter(config);
    const result = await adapter.execute({ command: 'render', meta: { chunkId: 0 } });

    expect(result.exitCode).toBe(1);

    // Verify destroy was called (last fetch call)
    const lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
    expect(lastCall[0]).toContain('/destroy');
  });
});
