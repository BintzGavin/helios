import { describe, it, expect, vi, beforeEach } from 'vitest';
import { KubernetesAdapter } from '../../src/adapters/kubernetes-adapter.js';
import { WorkerJob } from '../../src/types/job.js';

vi.mock('@kubernetes/client-node', () => {
  class KubeConfig {
    loadFromDefault = vi.fn();
    loadFromFile = vi.fn();
    makeApiClient = vi.fn((apiType) => {
      if (apiType.name === 'BatchV1Api') {
        return {
          createNamespacedJob: vi.fn().mockResolvedValue({}),
          readNamespacedJob: vi.fn().mockResolvedValue({ body: { status: { succeeded: 1 } } }),
          deleteNamespacedJob: vi.fn().mockResolvedValue({}),
        };
      } else if (apiType.name === 'CoreV1Api') {
        return {
          listNamespacedPod: vi.fn().mockResolvedValue({
            body: { items: [{ metadata: { name: 'test-pod' } }] },
          }),
          readNamespacedPodLog: vi.fn().mockResolvedValue({ body: 'test log output' }),
        };
      }
    });
  }
  return {
    KubeConfig,
    BatchV1Api: class BatchV1Api { static name = 'BatchV1Api'; },
    CoreV1Api: class CoreV1Api { static name = 'CoreV1Api'; },
  };
});

describe('KubernetesAdapter', () => {
  let adapter: KubernetesAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new KubernetesAdapter({
      image: 'test-image',
      pollIntervalMs: 10,
    });
  });

  it('should execute a job successfully', async () => {
    const job: WorkerJob = {
      command: 'echo',
      args: ['hello'],
      meta: { chunkId: '1' },
    };

    const result = await adapter.execute(job);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('test log output');
    expect(result.stderr).toBe('');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('should handle job abortion via AbortSignal', async () => {
    // Delay the completion so we can intercept and abort it
    vi.mocked(adapter['batchV1Api'].readNamespacedJob).mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return { body: { status: { succeeded: 0 } } } as any;
    });

    const controller = new AbortController();
    const job: WorkerJob = {
      command: 'echo',
      args: ['hello'],
      signal: controller.signal,
    };

    const executePromise = adapter.execute(job);
    // Add small delay so loop can start
    await new Promise(resolve => setTimeout(resolve, 10));
    controller.abort();

    const result = await executePromise;
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Job aborted');
  });

  it('should handle a job failure (status.failed > 0)', async () => {
    vi.mocked(adapter['batchV1Api'].readNamespacedJob).mockResolvedValue({
      body: { status: { failed: 1, succeeded: 0 } },
    } as any);

    const job: WorkerJob = {
      command: 'echo',
      meta: { chunkId: 'fail' },
    };

    const result = await adapter.execute(job);
    expect(result.exitCode).toBe(1);
  });

  it('should handle job creation failure gracefully', async () => {
    vi.mocked(adapter['batchV1Api'].createNamespacedJob).mockRejectedValue(new Error('Creation failed'));

    const job: WorkerJob = {
      command: 'echo',
    };

    const result = await adapter.execute(job);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Failed to create Job: Creation failed');
  });

  it('should handle log retrieval failure gracefully with onStderr', async () => {
    vi.mocked(adapter['batchV1Api'].readNamespacedJob).mockRejectedValue(new Error('Read job failed'));

    const onStderr = vi.fn();
    const job: WorkerJob = {
      command: 'echo',
      onStderr,
    };

    const result = await adapter.execute(job);
    // Outer catch handles it and throws, then we catch in execute
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Job monitoring failed: Read job failed');
    expect(onStderr).toHaveBeenCalledWith(expect.stringContaining('Job monitoring failed: Read job failed'));
  });

  it('should handle missing pods gracefully with podname falsey', async () => {
    vi.mocked(adapter['coreV1Api'].listNamespacedPod).mockResolvedValue({
      body: { items: [{ metadata: {} }] },
    } as any);

    const job: WorkerJob = {
      command: 'echo',
    };

    const result = await adapter.execute(job);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('');
  });

  it('should handle log retrieval with non-string log value', async () => {
    vi.mocked(adapter['coreV1Api'].readNamespacedPodLog).mockResolvedValue({ body: 123 } as any);

    const job: WorkerJob = {
      command: 'echo',
    };

    const result = await adapter.execute(job);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe(123 as any); // actually `(logs as unknown as string) || ''` evaluates to 123 if logs is truthy, so `result.stdout` will be 123
  });

  it('should handle log retrieval where logResponse body is empty string', async () => {
    vi.mocked(adapter['coreV1Api'].readNamespacedPodLog).mockResolvedValue({ body: '' } as any);

    const job: WorkerJob = {
      command: 'echo',
    };

    const result = await adapter.execute(job);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('');
  });

  it('should handle logs empty', async () => {
    vi.mocked(adapter['coreV1Api'].readNamespacedPodLog).mockResolvedValue(undefined as any);

    const job: WorkerJob = {
      command: 'echo',
    };

    const result = await adapter.execute(job);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('');
  });

  it('should handle creation error without error message', async () => {
    vi.mocked(adapter['batchV1Api'].createNamespacedJob).mockRejectedValue('String error');

    const job: WorkerJob = {
      command: 'echo',
    };

    const result = await adapter.execute(job);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Failed to create Job: String error');
  });

  it('should handle monitoring error without error message', async () => {
    vi.mocked(adapter['batchV1Api'].readNamespacedJob).mockRejectedValue('String error');

    const job: WorkerJob = {
      command: 'echo',
    };

    const result = await adapter.execute(job);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Job monitoring failed: String error');
  });

  it('should ignore deletion errors in finally block', async () => {
    vi.mocked(adapter['batchV1Api'].deleteNamespacedJob).mockRejectedValue(new Error('Deletion failed'));

    const job: WorkerJob = {
      command: 'echo',
    };

    // execute shouldn't throw when deletion fails
    const result = await adapter.execute(job);
    expect(result.exitCode).toBe(0);
    expect(adapter['batchV1Api'].deleteNamespacedJob).toHaveBeenCalled();
  });

  it('should handle log retrieval failure gracefully', async () => {
    vi.mocked(adapter['coreV1Api'].readNamespacedPodLog).mockRejectedValue(new Error('Log read failed'));

    const onStderr = vi.fn();
    const job: WorkerJob = {
      command: 'echo',
      onStderr,
    };

    const result = await adapter.execute(job);
    // Since job succeeded but logs failed, it still returns exitCode 0
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain('Job monitoring failed: Log read failed');
    expect(onStderr).toHaveBeenCalledWith(expect.stringContaining('Job monitoring failed: Log read failed'));
  });

  it('should call onStdout when logs are successfully retrieved', async () => {
    const onStdout = vi.fn();
    const job: WorkerJob = {
      command: 'echo',
      onStdout,
    };

    const result = await adapter.execute(job);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('test log output');
    expect(onStdout).toHaveBeenCalledWith('test log output');
  });

  it('should handle log retrieval successfully with direct response body (no .body wrapper)', async () => {
    const onStdout = vi.fn();
    // Return a direct object, not wrapped in { body: ... }
    vi.mocked(adapter['coreV1Api'].listNamespacedPod).mockResolvedValue({
      items: [{ metadata: { name: 'direct-pod' } }]
    } as any);
    vi.mocked(adapter['coreV1Api'].readNamespacedPodLog).mockResolvedValue('direct log output' as any);

    const job: WorkerJob = {
      command: 'echo',
      onStdout,
    };

    const result = await adapter.execute(job);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('direct log output');
    expect(onStdout).toHaveBeenCalledWith('direct log output');
  });

  it('should handle job without nested body', async () => {
    vi.mocked(adapter['batchV1Api'].readNamespacedJob).mockResolvedValue({
      status: { succeeded: 1 }
    } as any);

    const job: WorkerJob = {
      command: 'echo',
    };

    const result = await adapter.execute(job);
    expect(result.exitCode).toBe(0);
  });

  it('should poll if status is empty then succeed', async () => {
    vi.mocked(adapter['batchV1Api'].readNamespacedJob)
      .mockResolvedValueOnce({ body: { status: {} } } as any)
      .mockResolvedValueOnce({ body: { status: { succeeded: 1 } } } as any);

    // Delete pollIntervalMs to trigger the fallback logic
    const oldPoll = adapter['options'].pollIntervalMs;
    delete adapter['options'].pollIntervalMs;
    // Fast forward testing not needed since 2000 is still awaited, but we mock it maybe
    const spy = vi.spyOn(global, 'setTimeout').mockImplementation((fn: any) => { fn(); return {} as any; });

    const job: WorkerJob = {
      command: 'echo',
    };

    const result = await adapter.execute(job);
    expect(result.exitCode).toBe(0);
    spy.mockRestore();
    adapter['options'].pollIntervalMs = oldPoll;
  });

  it('should handle log retrieval successfully with null body, defaulting to empty string', async () => {
    vi.mocked(adapter['coreV1Api'].readNamespacedPodLog).mockResolvedValue(null as any);

    const job: WorkerJob = {
      command: 'echo',
    };

    const result = await adapter.execute(job);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('');
  });

  it('should handle missing pods gracefully (no error, empty stdout)', async () => {
    vi.mocked(adapter['coreV1Api'].listNamespacedPod).mockResolvedValue({
      body: { items: [] },
    } as any);

    const job: WorkerJob = {
      command: 'echo',
    };

    const result = await adapter.execute(job);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('');
  });

  it('should pass environment variables properly', async () => {
    const job: WorkerJob = {
      command: 'echo',
      env: { TEST_VAR: 'value' },
    };

    await adapter.execute(job);

    expect(adapter['batchV1Api'].createNamespacedJob).toHaveBeenCalledWith(
      'default',
      expect.objectContaining({
        spec: expect.objectContaining({
          template: expect.objectContaining({
            spec: expect.objectContaining({
              containers: expect.arrayContaining([
                expect.objectContaining({
                  env: [{ name: 'TEST_VAR', value: 'value' }],
                }),
              ]),
            }),
          }),
        }),
      })
    );
  });

  it('should load config from kubeconfigPath if provided', async () => {
    const customAdapter = new KubernetesAdapter({
      image: 'test-image',
      kubeconfigPath: '/custom/path/config',
    });

    expect(customAdapter['kc'].loadFromFile).toHaveBeenCalledWith('/custom/path/config');
  });

  it('should respect custom options overrides', async () => {
    const customAdapter = new KubernetesAdapter({
      image: 'test-image',
      namespace: 'custom-ns',
      jobNamePrefix: 'custom-prefix',
      serviceAccountName: 'custom-sa',
    });

    // We mock readNamespacedJob for customAdapter's instance
    vi.mocked(customAdapter['batchV1Api'].readNamespacedJob).mockResolvedValue({
      body: { status: { succeeded: 1 } },
    } as any);

    const job: WorkerJob = {
      command: 'echo',
      meta: { chunkId: '1' },
    };

    await customAdapter.execute(job);

    expect(customAdapter['batchV1Api'].createNamespacedJob).toHaveBeenCalledWith(
      'custom-ns',
      expect.objectContaining({
        metadata: expect.objectContaining({
          namespace: 'custom-ns',
          name: expect.stringMatching(/^custom-prefix-1-[a-z0-9-]+$/),
        }),
        spec: expect.objectContaining({
          template: expect.objectContaining({
            spec: expect.objectContaining({
              serviceAccountName: 'custom-sa',
            }),
          }),
        }),
      })
    );
  });
});
