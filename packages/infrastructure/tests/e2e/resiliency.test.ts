import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JobExecutor } from '../../src/orchestrator/job-executor.js';
import { LocalWorkerAdapter } from '../../src/adapters/local-adapter.js';
import { WorkerRuntime } from '../../src/worker/runtime.js';
import { RenderExecutor } from '../../src/worker/render-executor.js';
import { JobSpec } from '../../src/types/job-spec.js';
import { WorkerJob } from '../../src/types/adapter.js';
import { ArtifactStorage } from '../../src/types/index.js';

describe('Infrastructure Resiliency and Regression Tests', () => {
  describe('JobExecutor Resiliency', () => {
    let jobSpec: JobSpec;

    beforeEach(() => {
      jobSpec = {
        id: 'resiliency-job',
        chunks: [
          { id: 1, command: 'echo "chunk 1"', outputFile: 'out1.mp4' },
          { id: 2, command: 'echo "chunk 2"', outputFile: 'out2.mp4' }
        ]
      };
    });

    it('JobExecutor should properly fail a job if a chunk repeatedly fails beyond maxRetries', async () => {
      const adapter = new LocalWorkerAdapter();
      const executeMock = vi.spyOn(adapter, 'execute').mockImplementation(async (job: WorkerJob) => {
        if (job.meta?.chunkId === 1) {
          throw new Error('Simulated persistent failure');
        }
        return { exitCode: 0, stdout: '', stderr: '', durationMs: 10 };
      });

      const executor = new JobExecutor(adapter);

      await expect(executor.execute(jobSpec, { retries: 2, retryDelay: 5 })).rejects.toThrow(/Chunk 1 failed after 3 attempts: Simulated persistent failure/);

      // Verify that it attempted 3 times (1 initial + 2 retries)
      const chunk1Executions = executeMock.mock.calls.filter(call => call[0].meta?.chunkId === 1).length;
      expect(chunk1Executions).toBe(3);
    });

    it('JobExecutor should handle chunk execution timeouts correctly', async () => {
      const adapter = new LocalWorkerAdapter();
      vi.spyOn(adapter, 'execute').mockImplementation(async (job: WorkerJob) => {
        if (job.meta?.chunkId === 1) {
          return new Promise((resolve, reject) => {
             // Simulate a timeout by throwing an error that a timeout occurred
             setTimeout(() => reject(new Error('Worker job timed out after 5ms')), 5);
          });
        }
        return { exitCode: 0, stdout: '', stderr: '', durationMs: 10 };
      });

      const executor = new JobExecutor(adapter);

      await expect(executor.execute(jobSpec, { retries: 0 })).rejects.toThrow(/Chunk 1 failed after 1 attempts: Worker job timed out after 5ms/);
    });

    it('JobExecutor should properly cancel remaining chunks if one fails and gracefully abort', async () => {
       const adapter = new LocalWorkerAdapter();
       vi.spyOn(adapter, 'execute').mockImplementation(async (job: WorkerJob) => {
         if (job.meta?.chunkId === 1) {
            throw new Error('Simulated failure');
         }
         // chunk 2 takes a bit longer
         return new Promise((resolve) => setTimeout(() => resolve({ exitCode: 0, stdout: '', stderr: '', durationMs: 10 }), 20));
       });

       const executor = new JobExecutor(adapter);

       await expect(executor.execute(jobSpec, { concurrency: 2, retries: 0 })).rejects.toThrow(/Chunk 1 failed/);
       // Should throw, meaning it failed fast
    });
  });

  describe('WorkerRuntime Resiliency', () => {
    it('WorkerRuntime should propagate storage fetch errors gracefully', async () => {
      const failingStorage: ArtifactStorage = {
        downloadAssetBundle: vi.fn().mockRejectedValue(new Error('Simulated storage fetch error')),
        uploadAssetBundle: vi.fn(),
      };

      const runtime = new WorkerRuntime({
        workspaceDir: '/tmp/test-workspace',
        storage: failingStorage
      });

      const mockJobSpec: JobSpec = {
        id: 'job-123',
        assetsUrl: 's3://some/path',
        chunks: [
          { id: 1, command: 'render', outputFile: 'out.mp4' }
        ]
      };

      // Mock fetch to return the spec
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockJobSpec
      });

      try {
        await expect(runtime.run('http://example.com/job.json', 1)).rejects.toThrow('Simulated storage fetch error');
        expect(failingStorage.downloadAssetBundle).toHaveBeenCalledWith('job-123', 's3://some/path', '/tmp/test-workspace');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('WorkerRuntime should correctly propagate chunk execution errors', async () => {
      const runtime = new WorkerRuntime({
        workspaceDir: '/tmp/test-workspace',
      });

      const mockJobSpec: JobSpec = {
        id: 'job-123',
        chunks: [
          { id: 1, command: 'render', outputFile: 'out.mp4' }
        ]
      };

      // Mock fetch to return the spec
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockJobSpec
      });

      // Use vi.spyOn on the prototype of RenderExecutor to mock the class method
      const executeChunkSpy = vi.spyOn(RenderExecutor.prototype, 'executeChunk').mockRejectedValue(new Error('Simulated chunk execution error'));

      try {
        await expect(runtime.run('http://example.com/job.json', 1)).rejects.toThrow('Simulated chunk execution error');
      } finally {
        global.fetch = originalFetch;
        executeChunkSpy.mockRestore();
      }
    });

    it('WorkerRuntime should gracefully handle remote JobSpec fetch failures', async () => {
      const runtime = new WorkerRuntime({
        workspaceDir: '/tmp/test-workspace',
      });

      // Mock fetch to return a non-ok response
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Not Found'
      });

      try {
        await expect(runtime.run('http://example.com/job.json', 1)).rejects.toThrow('Failed to fetch job spec: Not Found');
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});
