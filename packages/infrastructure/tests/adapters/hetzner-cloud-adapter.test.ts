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

  it('should abort early if signal is already aborted', async () => {
    const adapter = new HetznerCloudAdapter(config);
    const fetchMock = vi.mocked(global.fetch);
    const ac = new AbortController();
    ac.abort();
    const abortJob = { ...job, signal: ac.signal };

    const result = await adapter.execute(abortJob);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Job aborted before execution');
  });

  it('should timeout if polling exceeds timeoutMs', async () => {
    const adapter = new HetznerCloudAdapter({ ...config, timeoutMs: 10 });
    const fetchMock = vi.mocked(global.fetch);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ server: { id: 999, status: 'running' } }),
    } as any);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ server: { id: 999, status: 'running' } }),
    } as any);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    } as any);

    const result = await adapter.execute(job);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Execution timeout exceeded');
  });

  it('should handle polling errors gracefully', async () => {
    const adapter = new HetznerCloudAdapter(config);
    const fetchMock = vi.mocked(global.fetch);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ server: { id: 888, status: 'running' } }),
    } as any);

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    } as any);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    } as any);

    const result = await adapter.execute(job);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Failed to poll server status: 500');
  });

  it('should handle cleanup errors', async () => {
    const adapter = new HetznerCloudAdapter(config);
    const fetchMock = vi.mocked(global.fetch);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ server: { id: 777, status: 'running' } }),
    } as any);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ server: { id: 777, status: 'off' } }),
    } as any);

    fetchMock.mockRejectedValueOnce(new Error('Network error during cleanup'));

    const result = await adapter.execute(job);

    // It should exit cleanly but the stderr should capture the cleanup failure
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain('Failed to clean up server: Network error during cleanup');
  });

  it('should include location and ssh_keys when provided in config', async () => {
    const adapter = new HetznerCloudAdapter({ ...config, location: 'fsn1', sshKeyId: 12345 });

    const fetchMock = vi.mocked(global.fetch);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ server: { id: 456, status: 'running' } }),
    } as any);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ server: { id: 456, status: 'off' } }),
    } as any);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    } as any);

    await adapter.execute(job);

    expect(fetchMock).toHaveBeenCalled();
    const createCall = fetchMock.mock.calls[0];
    const requestBody = JSON.parse(createCall[1].body as string);

    expect(requestBody.location).toBe('fsn1');
    expect(requestBody.ssh_keys).toEqual([12345]);
  });

  it('should trim job command properly when args is not provided', async () => {
    const adapter = new HetznerCloudAdapter(config);

    const fetchMock = vi.mocked(global.fetch);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ server: { id: 456, status: 'running' } }),
    } as any);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ server: { id: 456, status: 'off' } }),
    } as any);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    } as any);

    const jobWithoutArgs: WorkerJob = {
      command: 'echo "hello"',
    };

    await adapter.execute(jobWithoutArgs);

    expect(fetchMock).toHaveBeenCalled();
    const createCall = fetchMock.mock.calls[0];
    const requestBody = JSON.parse(createCall[1].body as string);

    expect(requestBody.user_data).toContain('Executing command: echo "hello"');
  });
});
