import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FlyMachinesAdapter } from '../../src/adapters/fly-machines-adapter.js';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('FlyMachinesAdapter', () => {
  let adapter: FlyMachinesAdapter;

  beforeEach(() => {
    adapter = new FlyMachinesAdapter({
      apiToken: 'test-token',
      appName: 'test-app',
      imageRef: 'test-image',
    });
    mockFetch.mockReset();
  });

  it('should create, poll, and delete a machine', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'machine-123' }),
      } as Response) // Create
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ state: 'started' }),
      } as Response) // Poll 1
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ state: 'stopped', events: [{ request: { exit_event: { exit_code: 0 } } }] }),
      } as Response) // Poll 2
      .mockResolvedValueOnce({
        ok: true,
      } as Response); // Delete

    const job = {
      command: 'node',
      meta: { jobDefUrl: 'http://test.com/job.json', chunkIndex: 0 },
    };

    const result = await adapter.execute(job);

    expect(result.exitCode).toBe(0);
    expect(mockFetch).toHaveBeenCalledTimes(4);
    expect(mockFetch.mock.calls[0][0]).toContain('/machines');
    expect(mockFetch.mock.calls[0][1].method).toBe('POST');
  });

  it('should handle abort signal', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'machine-123' }),
      } as Response) // Create
      .mockResolvedValue({
        ok: true,
        json: async () => ({ state: 'started' }),
      } as Response); // Catch delete and polls

    const controller = new AbortController();
    const job = {
      command: 'node',
      meta: { jobDefUrl: 'http://test.com/job.json', chunkIndex: 0 },
      signal: controller.signal,
    };

    const executePromise = adapter.execute(job);

    // Give it a tick to start
    await new Promise(r => setTimeout(r, 10));
    controller.abort();

    await expect(executePromise).rejects.toThrow('Job was aborted');
  });
});
