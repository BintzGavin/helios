import { WorkerAdapter, WorkerResult } from '../types/adapter.js';
import { WorkerJob } from '../types/job.js';

export interface DenoDeployAdapterConfig {
  /** The Deno Deploy endpoint URL to POST to. */
  serviceUrl: string;
  /** Optional Authorization token. */
  authToken?: string;
}

/**
 * Adapter for executing rendering chunks on Deno Deploy.
 */
export class DenoDeployAdapter implements WorkerAdapter {
  constructor(private config: DenoDeployAdapterConfig) {}

  async execute(job: WorkerJob): Promise<WorkerResult> {
    const jobPath = job.meta?.jobDefUrl;
    const chunkIndex = job.meta?.chunkId;

    if (!jobPath) {
      throw new Error('DenoDeployAdapter requires job.meta.jobDefUrl to be set');
    }

    if (chunkIndex === undefined) {
      throw new Error('DenoDeployAdapter requires job.meta.chunkId to be set');
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
      throw new Error(`DenoDeployAdapter fetch failed: ${error.message}`);
    }

    if (!response.ok) {
      throw new Error(`DenoDeployAdapter failed with status ${response.status}: ${response.statusText}`);
    }

    let result: any;
    try {
      result = await response.json();
    } catch (error: any) {
      throw new Error(`DenoDeployAdapter received invalid JSON: ${error.message}`);
    }

    return {
      exitCode: result.exitCode ?? -1,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      durationMs: result.durationMs ?? 0,
    };
  }
}
