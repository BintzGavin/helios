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
});
