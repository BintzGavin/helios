import { WorkerAdapter, WorkerResult } from '../types/adapter.js';
import { WorkerJob } from '../types/job.js';

export interface VercelAdapterConfig {
  /** The Vercel serverless function endpoint URL to POST to. */
  serviceUrl: string;
  /** Optional Authorization token. */
  authToken?: string;
  /** Optional static job definition URL to use if not provided in the job meta. */
  jobDefUrl?: string;
}

/**
 * Adapter for executing rendering chunks on Vercel Serverless Functions.
 */
export class VercelAdapter implements WorkerAdapter {
  constructor(private config: VercelAdapterConfig) {}

  async execute(job: WorkerJob): Promise<WorkerResult> {
    const jobPath = job.meta?.jobDefUrl || this.config.jobDefUrl;
    const chunkIndex = job.meta?.chunkId;

    if (!jobPath) {
      throw new Error('VercelAdapter requires job.meta.jobDefUrl or config.jobDefUrl to be set');
    }

    if (chunkIndex === undefined) {
      throw new Error('VercelAdapter requires job.meta.chunkId to be set');
    }

    const payload = {
      jobPath,
      chunkIndex,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.authToken) {
      headers['Authorization'] = `Bearer ${this.config.authToken}`;
    }

    let response: Response;
    try {
      response = await fetch(this.config.serviceUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: job.signal,
      });
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw error;
      }
      throw new Error(`VercelAdapter fetch failed: ${error.message}`);
    }

    if (!response.ok) {
      throw new Error(`VercelAdapter failed with status ${response.status}: ${response.statusText}`);
    }

    let result: any;
    try {
      result = await response.json();
    } catch (error: any) {
      throw new Error(`VercelAdapter received invalid JSON: ${error.message}`);
    }

    return {
      exitCode: result.exitCode ?? -1,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      durationMs: result.durationMs ?? 0,
    };
  }
}
