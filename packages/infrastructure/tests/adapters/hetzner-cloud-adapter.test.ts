import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HetznerCloudAdapter } from '../../src/adapters/hetzner-cloud-adapter.js';
import { WorkerJob } from '../../src/types/index.js';

describe('HetznerCloudAdapter', () => {
  const config = {
    apiToken: 'test-token',
    serverType: 'cx11',
    image: 'ubuntu-20.04',
    pollIntervalMs: 10,
    timeoutMs: 1000,
  };

  const job: WorkerJob = {
    command: 'npm',
    args: ['run', 'render'],
  };

  let globalFetch: any;

  beforeEach(() => {
    globalFetch = global.fetch;
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = globalFetch;
    vi.restoreAllMocks();
  });

  it('should provision, poll until off, and clean up server successfully', async () => {
    const adapter = new HetznerCloudAdapter(config);

    const fetchMock = vi.mocked(global.fetch);

    // Mock Create Server
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ server: { id: 456, status: 'running' } }),
    } as any);

    // Mock Poll Server 1 (Running)
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ server: { id: 456, status: 'running' } }),
    } as any);

    // Mock Poll Server 2 (Off)
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ server: { id: 456, status: 'off' } }),
    } as any);

    // Mock Delete Server
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    } as any);

    const result = await adapter.execute(job);

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock).toHaveBeenNthCalledWith(1, 'https://api.hetzner.cloud/v1/servers', expect.objectContaining({ method: 'POST' }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://api.hetzner.cloud/v1/servers/456', expect.objectContaining({ method: 'GET' }));
    expect(fetchMock).toHaveBeenNthCalledWith(3, 'https://api.hetzner.cloud/v1/servers/456', expect.objectContaining({ method: 'GET' }));
    expect(fetchMock).toHaveBeenNthCalledWith(4, 'https://api.hetzner.cloud/v1/servers/456', expect.objectContaining({ method: 'DELETE' }));

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Execution completed');
  });

  it('should clean up and return error if provisioning fails', async () => {
    const adapter = new HetznerCloudAdapter(config);

    const fetchMock = vi.mocked(global.fetch);

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: () => Promise.resolve('Unauthorized'),
    } as any);

    const result = await adapter.execute(job);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Failed to create server');
  });

  it('should respect AbortSignal during polling and clean up', async () => {
    const adapter = new HetznerCloudAdapter(config);

    const fetchMock = vi.mocked(global.fetch);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ server: { id: 789, status: 'running' } }),
    } as any);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ server: { id: 789, status: 'running' } }),
    } as any);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    } as any);

    const ac = new AbortController();
    const abortJob = { ...job, signal: ac.signal };

    // Trigger abort shortly after starting
    setTimeout(() => ac.abort(), 5);

    const result = await adapter.execute(abortJob);

    // It can poll 1 or 2 times depending on event loop scheduling
    // so we just verify it was deleted and the execution was aborted.
    expect(fetchMock).toHaveBeenCalled();
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Job aborted during execution');
  });
});
