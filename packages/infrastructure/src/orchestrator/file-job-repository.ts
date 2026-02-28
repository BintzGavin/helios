import fs from 'node:fs/promises';
import path from 'node:path';
import { JobRepository, JobStatus } from '../types/job-status.js';

export class FileJobRepository implements JobRepository {
  private storageDir: string;

  constructor(storageDir: string) {
    this.storageDir = storageDir;
  }

  /**
   * Saves a job to the repository.
   * If the storage directory doesn't exist, it is created.
   * @param job The job status to save.
   */
  async save(job: JobStatus): Promise<void> {
    await fs.mkdir(this.storageDir, { recursive: true });
    const filePath = path.join(this.storageDir, `${job.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(job, null, 2), 'utf-8');
  }

  /**
   * Retrieves a job by ID.
   * @param id The job ID.
   * @returns The job status, or undefined if the job was not found.
   */
  async get(id: string): Promise<JobStatus | undefined> {
    const filePath = path.join(this.storageDir, `${id}.json`);
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data) as JobStatus;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return undefined;
      }
      throw error;
    }
  }

  /**
   * Lists all jobs in the repository.
   * @returns An array of all job statuses.
   */
  async list(): Promise<JobStatus[]> {
    try {
      const files = await fs.readdir(this.storageDir);
      const jobs: JobStatus[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.storageDir, file);
          try {
            const data = await fs.readFile(filePath, 'utf-8');
            jobs.push(JSON.parse(data) as JobStatus);
          } catch (error: any) {
             // If a file is deleted concurrently or unreadable, we just skip it
             if (error.code !== 'ENOENT') {
                console.warn(`Failed to read job file ${filePath}:`, error.message);
             }
          }
        }
      }

      return jobs;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }
}
