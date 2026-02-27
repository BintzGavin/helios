import { JobExecutor, JobExecutionOptions } from './job-executor.js';
import { JobSpec } from '../types/job-spec.js';
import { JobStatus, JobRepository, JobState } from '../types/job-status.js';
import { randomUUID } from 'crypto';

export class JobManager {
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
      state: 'pending',
      progress: 0,
      totalChunks: jobSpec.chunks.length,
      completedChunks: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
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
   * Internal method to run the job and update status.
   */
  private async runJob(id: string, jobSpec: JobSpec, options?: JobExecutionOptions) {
    let job = await this.repository.get(id);
    if (!job) return;

    // Update state to running
    job.state = 'running';
    job.updatedAt = Date.now();
    await this.repository.save(job);

    try {
      // Execute the job
      // Note: JobExecutor doesn't currently emit progress events, so we can't update
      // progress granularly unless we modify JobExecutor or wrap the adapter.
      // For now, we'll just update completion status.
      // TODO: Enhance JobExecutor to report progress.

      await this.executor.execute(jobSpec, options);

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
      console.error(`Job ${id} failed:`, error);

      // Update state to failed
      job = await this.repository.get(id);
      if (job) {
        job.state = 'failed';
        job.error = error.message;
        job.updatedAt = Date.now();
        await this.repository.save(job);
      }
    }
  }
}
