import { JobExecutor, JobExecutionOptions } from './job-executor.js';
import { JobSpec } from '../types/job-spec.js';
import { JobStatus, JobRepository, JobState } from '../types/job-status.js';
import { randomUUID } from 'crypto';

export class JobManager {
  private controllers = new Map<string, AbortController>();

  constructor(
    private repository: JobRepository,
    private executor: JobExecutor
  ) {}

  /**
   * Submits a job for execution.
   * Returns the job ID.
   */
  async submitJob(jobSpec: JobSpec, options?: JobExecutionOptions): Promise<string> {
    const id = randomUUID();
    const job: JobStatus = {
      id,
      spec: jobSpec,
      state: 'pending',
      progress: 0,
      totalChunks: jobSpec.chunks.length,
      completedChunks: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metrics: {
        totalDurationMs: 0
      },
      logs: []
    };

    await this.repository.save(job);

    // Execute in background
    // We don't await this because we want to return the ID immediately
    this.runJob(id, jobSpec, options).catch(err => {
       console.error(`Unhandled error in job ${id}:`, err);
    });

    return id;
  }

  /**
   * Retrieves the status of a job.
   */
  async getJob(id: string): Promise<JobStatus | undefined> {
    return this.repository.get(id);
  }

  /**
   * Retrieves a list of all jobs.
   */
  async listJobs(): Promise<JobStatus[]> {
    return this.repository.list();
  }

  /**
   * Cancels a pending or running job.
   */
  async cancelJob(id: string): Promise<void> {
    const job = await this.repository.get(id);
    if (!job || (job.state !== 'pending' && job.state !== 'running')) {
      return;
    }

    const controller = this.controllers.get(id);
    if (controller) {
      controller.abort();
    } else {
      // If there's no controller but the job is pending/running,
      // just set it to cancelled anyway (maybe it's queued).
      job.state = 'cancelled';
      job.updatedAt = Date.now();
      await this.repository.save(job);
    }
  }

  /**
   * Pauses a running job.
   */
  async pauseJob(id: string): Promise<void> {
    const job = await this.repository.get(id);
    if (!job || job.state !== 'running') {
      return;
    }

    // IMPORTANT: Save the state as 'paused' BEFORE aborting the controller.
    // Otherwise, the catch block in runJob() might fetch the old 'running' state
    // and incorrectly mark the job as 'cancelled'.
    job.state = 'paused';
    job.updatedAt = Date.now();
    await this.repository.save(job);

    const controller = this.controllers.get(id);
    if (controller) {
      controller.abort();
    }
  }

  /**
   * Resumes a paused job.
   */
  async resumeJob(id: string, options?: JobExecutionOptions): Promise<void> {
    const job = await this.repository.get(id);
    if (!job || job.state !== 'paused') {
      return;
    }

    const completedChunkIds = job.logs?.map(log => log.chunkId) || [];
    const resumeOptions: JobExecutionOptions = {
      ...options,
      completedChunkIds
    };

    this.runJob(id, job.spec, resumeOptions).catch(err => {
      console.error(`Unhandled error resuming job ${id}:`, err);
    });
  }

  /**
   * Deletes a job from the repository, cancelling it first if it's pending or running.
   */
  async deleteJob(id: string): Promise<void> {
    const job = await this.repository.get(id);
    if (!job) {
      return;
    }

    if (job.state === 'pending' || job.state === 'running') {
      await this.cancelJob(id);
    }

    await this.repository.delete(id);
  }

  /**
   * Internal method to run the job and update status.
   */
  private async runJob(id: string, jobSpec: JobSpec, options?: JobExecutionOptions) {
    let job = await this.repository.get(id);
    if (!job) return;

    // Update state to running
    job.state = 'running';
    job.updatedAt = Date.now();
    await this.repository.save(job);

    const controller = new AbortController();
    this.controllers.set(id, controller);

    try {
      // Execute the job
      const executeOptions: JobExecutionOptions = {
        ...options,
        signal: controller.signal,
        onProgress: async (completedChunks: number, totalChunks: number) => {
          const currentJob = await this.repository.get(id);
          if (currentJob) {
            currentJob.completedChunks = completedChunks;
            currentJob.progress = Math.round((completedChunks / totalChunks) * 100);
            currentJob.updatedAt = Date.now();
            await this.repository.save(currentJob);
          }
        },
        onChunkComplete: async (chunkId: number, result) => {
          const currentJob = await this.repository.get(id);
          if (currentJob) {
            if (!currentJob.metrics) {
              currentJob.metrics = { totalDurationMs: 0 };
            }
            if (!currentJob.logs) {
              currentJob.logs = [];
            }
            currentJob.metrics.totalDurationMs += result.durationMs;
            currentJob.logs.push({
              chunkId,
              durationMs: result.durationMs,
              stdout: result.stdout,
              stderr: result.stderr
            });
            currentJob.updatedAt = Date.now();
            await this.repository.save(currentJob);
          }
        }
      };

      await this.executor.execute(jobSpec, executeOptions);

      // Update state to completed
      job = await this.repository.get(id);
      if (job) {
        job.state = 'completed';
        job.progress = 100;
        job.completedChunks = job.totalChunks;
        job.updatedAt = Date.now();
        await this.repository.save(job);
      }
    } catch (error: any) {
      job = await this.repository.get(id);
      if (job) {
        if (job.state === 'paused') {
          console.log(`Job ${id} paused`);
        } else if (error.name === 'AbortError' || controller.signal.aborted) {
          console.log(`Job ${id} cancelled`);
          // Note: If the job was deleted, it might not be in the repository anymore.
          // In that case, saving it here will re-create it, which we don't want.
          // Let's check if it still exists before saving.
          const exists = await this.repository.get(id);
          if (exists) {
            job.state = 'cancelled';
            job.updatedAt = Date.now();
          } else {
            return; // Job was deleted
          }
        } else {
          console.error(`Job ${id} failed:`, error);
          job.state = 'failed';
          job.error = error.message;
          job.updatedAt = Date.now();
        }
        await this.repository.save(job);
      }
    } finally {
      this.controllers.delete(id);
    }
  }
}
