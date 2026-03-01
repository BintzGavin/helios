import { JobSpec } from './job-spec.js';

export type JobState = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';

export interface JobStatus {
  id: string;
  spec: JobSpec;
  state: JobState;
  progress: number; // 0-100
  totalChunks: number;
  completedChunks: number;
  error?: string;
  createdAt: number;
  updatedAt: number;
  result?: any;
  metrics?: {
    totalDurationMs: number;
  };
  logs?: Array<{
    chunkId: number;
    durationMs: number;
    stdout: string;
    stderr: string;
  }>;
}

export interface JobRepository {
  save(job: JobStatus): Promise<void>;
  get(id: string): Promise<JobStatus | undefined>;
  list(): Promise<JobStatus[]>;
  delete(id: string): Promise<void>;
}

export class InMemoryJobRepository implements JobRepository {
  private jobs = new Map<string, JobStatus>();

  async save(job: JobStatus): Promise<void> {
    this.jobs.set(job.id, { ...job });
  }

  async get(id: string): Promise<JobStatus | undefined> {
    const job = this.jobs.get(id);
    return job ? { ...job } : undefined;
  }

  async list(): Promise<JobStatus[]> {
    return Array.from(this.jobs.values()).map(job => ({ ...job }));
  }

  async delete(id: string): Promise<void> {
    this.jobs.delete(id);
  }
}
