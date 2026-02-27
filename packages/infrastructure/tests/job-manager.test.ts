import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JobManager } from '../src/orchestrator/job-manager.js';
import { JobExecutor } from '../src/orchestrator/job-executor.js';
import { JobRepository, JobStatus, JobState } from '../src/types/job-status.js';
import { JobSpec } from '../src/types/job-spec.js';

class InMemoryJobRepository implements JobRepository {
  private jobs: Map<string, JobStatus> = new Map();

  async save(job: JobStatus): Promise<void> {
    this.jobs.set(job.id, { ...job });
  }

  async get(id: string): Promise<JobStatus | undefined> {
    const job = this.jobs.get(id);
    return job ? { ...job } : undefined;
  }

  async list(): Promise<JobStatus[]> {
    return Array.from(this.jobs.values());
  }
}

describe('JobManager', () => {
  let repository: InMemoryJobRepository;
  let mockExecutor: Pick<JobExecutor, 'execute'>;
  let jobManager: JobManager;
  let jobSpec: JobSpec;

  beforeEach(() => {
    repository = new InMemoryJobRepository();
    mockExecutor = {
      execute: vi.fn().mockResolvedValue(undefined)
    };
    jobManager = new JobManager(repository, mockExecutor as JobExecutor);
    jobSpec = {
      metadata: {
        totalFrames: 100,
        fps: 30,
        width: 1920,
        height: 1080,
        duration: 3.33
      },
      chunks: [
        { id: 1, startFrame: 0, frameCount: 50, outputFile: 'chunk1.mp4', command: 'render chunk 1' },
        { id: 2, startFrame: 50, frameCount: 50, outputFile: 'chunk2.mp4', command: 'render chunk 2' }
      ]
    };
  });

  it('submitJob should return a valid UUID and create a pending job', async () => {
    // Delay executor to check pending state
    let executeStarted = false;
    let executeFinished = false;
    let executorResolve: () => void;
    mockExecutor.execute = vi.fn().mockImplementation(() => {
      executeStarted = true;
      return new Promise<void>((resolve) => {
        executorResolve = () => {
          executeFinished = true;
          resolve();
        };
      });
    });

    // We want to test that the state is "pending" right after submitJob returns.
    // However, if the event loop gets a tick, runJob might already change it to "running"
    // because submitJob kicks off runJob synchronously (though it's an async function).
    // Let's stub repository.save to pause when called, but it's simpler just to verify
    // the state before the asynchronous runJob modifies it, or verify that the first save
    // call is 'pending'.
    // Let's spy on repository.save
    const saveSpy = vi.spyOn(repository, 'save');

    const jobId = await jobManager.submitJob(jobSpec);

    expect(jobId).toBeDefined();
    expect(typeof jobId).toBe('string');
    expect(jobId.length).toBeGreaterThan(0);

    // The first call to save should be with state 'pending'
    const firstSaveCall = saveSpy.mock.calls[0][0];
    expect(firstSaveCall.id).toBe(jobId);
    expect(firstSaveCall.state).toBe('pending');
    expect(firstSaveCall.progress).toBe(0);
    expect(firstSaveCall.totalChunks).toBe(2);
    expect(firstSaveCall.completedChunks).toBe(0);

    // Let the executor finish to clean up
    if (executorResolve) executorResolve();
    // Wait for the next tick for promises to resolve
    await new Promise(resolve => setTimeout(resolve, 0));
  });

  it('runJob should transition job state to running then completed on success', async () => {
    let executeResolve: () => void;
    mockExecutor.execute = vi.fn().mockImplementation(() => {
      return new Promise<void>((resolve) => {
        executeResolve = resolve;
      });
    });

    const jobId = await jobManager.submitJob(jobSpec);

    // Give it a tiny moment to transition to running
    await new Promise(resolve => setTimeout(resolve, 10));

    let job = await jobManager.getJob(jobId);
    expect(job?.state).toBe('running' as JobState);

    // Now resolve the execution
    executeResolve!();

    // Wait for internal updates to finish
    await new Promise(resolve => setTimeout(resolve, 10));

    job = await jobManager.getJob(jobId);
    expect(job?.state).toBe('completed' as JobState);
    expect(job?.progress).toBe(100);
    expect(job?.completedChunks).toBe(2);
  });

  it('runJob should transition job state to failed on error', async () => {
    mockExecutor.execute = vi.fn().mockRejectedValue(new Error('Execution failed horribly'));

    const jobId = await jobManager.submitJob(jobSpec);

    // Wait for execution to fail and update state
    await new Promise(resolve => setTimeout(resolve, 20));

    const job = await jobManager.getJob(jobId);
    expect(job?.state).toBe('failed' as JobState);
    expect(job?.error).toBe('Execution failed horribly');
  });

  it('getJob should return undefined for non-existent job', async () => {
    const job = await jobManager.getJob('non-existent-id');
    expect(job).toBeUndefined();
  });
});
