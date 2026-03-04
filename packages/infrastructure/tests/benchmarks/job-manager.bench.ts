import { bench, describe } from 'vitest';
import { JobManager } from '../../src/orchestrator/job-manager.js';
import { JobExecutor } from '../../src/orchestrator/job-executor.js';
import { InMemoryJobRepository } from '../../src/types/job-status.js';
import { WorkerAdapter, WorkerJob, WorkerResult } from '../../src/types/adapter.js';
import { JobSpec } from '../../src/types/job-spec.js';

class DummyWorkerAdapter implements WorkerAdapter {
  async execute(job: WorkerJob): Promise<WorkerResult> {
    return {
      exitCode: 0,
      stdout: '',
      stderr: '',
      durationMs: 1
    };
  }
}

describe('JobManager Orchestration Benchmark', () => {
  const setupJobManager = () => {
    const repository = new InMemoryJobRepository();
    const adapter = new DummyWorkerAdapter();
    const executor = new JobExecutor(adapter);
    return new JobManager(repository, executor);
  };

  const createJobSpec = (chunkCount: number): JobSpec => {
    return {
      id: `benchmark-job-${chunkCount}`,
      metadata: {
        totalFrames: chunkCount * 60,
        fps: 60,
        width: 1920,
        height: 1080,
        duration: chunkCount
      },
      chunks: Array.from({ length: chunkCount }).map((_, i) => ({
        id: i,
        startFrame: i * 60,
        frameCount: 60,
        outputFile: `chunk_${i}.mp4`,
        command: `echo chunk ${i}`
      })),
      mergeCommand: 'echo merge'
    };
  };

  bench('JobManager.submitJob with 10 chunks', async () => {
    const manager = setupJobManager();
    const jobSpec = createJobSpec(10);

    // We await submitJob which executes asynchronously, but the bench focuses on the orchestration start
    // We want to wait for it to actually complete to get a fair orchestration throughput
    const id = await manager.submitJob(jobSpec, { concurrency: 10, merge: false });

    // wait for job to complete
    let status;
    do {
      status = await manager.getJob(id);
      if (status?.state === 'completed' || status?.state === 'failed') break;
      await new Promise(resolve => setTimeout(resolve, 5));
    } while (true);
  }, { time: 500 });

  bench('JobManager.submitJob with 100 chunks', async () => {
    const manager = setupJobManager();
    const jobSpec = createJobSpec(100);

    const id = await manager.submitJob(jobSpec, { concurrency: 100, merge: false });

    let status;
    do {
      status = await manager.getJob(id);
      if (status?.state === 'completed' || status?.state === 'failed') break;
      await new Promise(resolve => setTimeout(resolve, 10));
    } while (true);
  }, { time: 500 });
});
