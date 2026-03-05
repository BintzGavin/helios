import { bench, describe } from 'vitest';
import { JobExecutor } from '../../src/orchestrator/job-executor.js';
import { WorkerAdapter, WorkerResult } from '../../src/types/adapter.js';
import { JobSpec } from '../../src/types/job-spec.js';

describe('JobExecutor Benchmarks', () => {
  // Mock adapter that resolves immediately
  const mockAdapter: WorkerAdapter = {
    execute: async () => ({
      exitCode: 0,
      stdout: '',
      stderr: '',
      durationMs: 1
    })
  };

  const createDummyJobSpec = (chunkCount: number): JobSpec => {
    return {
      id: `job-${chunkCount}`,
      metadata: { totalFrames: chunkCount, fps: 30, width: 1920, height: 1080, duration: chunkCount / 30 },
      chunks: Array.from({ length: chunkCount }, (_, i) => ({
        id: i,
        startFrame: i,
        frameCount: 1,
        outputFile: `chunk-${i}.mp4`,
        command: 'echo "test"'
      })),
      mergeCommand: 'echo "merge"'
    };
  };

  const jobSpec100 = createDummyJobSpec(100);
  const jobSpec1000 = createDummyJobSpec(1000);

  bench('Sequential Execution (Concurrency 1) - 100 chunks', async () => {
    const executor = new JobExecutor(mockAdapter);
    await executor.execute(jobSpec100, { concurrency: 1, merge: false });
  });

  bench('Concurrent Execution (Concurrency 10) - 100 chunks', async () => {
    const executor = new JobExecutor(mockAdapter);
    await executor.execute(jobSpec100, { concurrency: 10, merge: false });
  });

  bench('High Concurrency Execution (Concurrency 100) - 1000 chunks', async () => {
    const executor = new JobExecutor(mockAdapter);
    await executor.execute(jobSpec1000, { concurrency: 100, merge: false });
  });
});
