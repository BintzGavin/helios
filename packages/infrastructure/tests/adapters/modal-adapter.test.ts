import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModalAdapter } from '../../src/adapters/modal-adapter.js';
import { WorkerJob } from '../../src/types/job.js';

describe('ModalAdapter', () => {
  let adapter: ModalAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new ModalAdapter({
      endpointUrl: 'https://example.modal.run',
      authToken: 'test-token',
    });
    global.fetch = vi.fn();
  });

  it('should execute a job successfully', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ exitCode: 0, stdout: 'success', stderr: '' }),
    } as any);

    const job: WorkerJob = {
      command: 'echo',
      args: ['hello'],
      meta: { chunkId: '1', jobDefUrl: 's3://test' },
    };

    const result = await adapter.execute(job);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('success');
    expect(result.stderr).toBe('');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(fetch).toHaveBeenCalledWith(
      'https://example.modal.run',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token',
        },
        body: JSON.stringify({
          jobPath: 's3://test',
          chunkIndex: '1',
          command: 'echo',
          args: ['hello'],
          env: undefined
        }),
      })
    );
  });

  it('should handle HTTP errors gracefully', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as any);

    const job: WorkerJob = { command: 'test' };
    const result = await adapter.execute(job);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('HTTP error! status: 500');
  });

  it('should handle network errors gracefully', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network Error'));

    const job: WorkerJob = { command: 'test' };
    const result = await adapter.execute(job);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Network Error');
  });

  it('should handle job abortion via AbortSignal', async () => {
    const controller = new AbortController();

    vi.mocked(fetch).mockImplementation(async () => {
      throw new DOMException('Aborted', 'AbortError');
    });

    const job: WorkerJob = {
      command: 'test',
      signal: controller.signal,
    };

    controller.abort();
    const result = await adapter.execute(job);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Job aborted');
  });
});
