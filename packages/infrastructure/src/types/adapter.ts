import { WorkerJob } from './job.js';

export interface WorkerResult {
  /** Exit code of the process */
  exitCode: number;
  /** Standard output of the process */
  stdout: string;
  /** Standard error of the process */
  stderr: string;
  /** Duration of execution in milliseconds */
  durationMs: number;
}

export interface WorkerAdapter {
  /**
   * Executes a job in the target environment.
   * @param job The job specification to execute
   * @returns A promise that resolves with the execution result
   */
  execute(job: WorkerJob): Promise<WorkerResult>;
}
