import { WorkerAdapter, WorkerJob, WorkerResult } from '../types/index.js';

export interface CloudflareWorkersAdapterConfig {
  /** The URL of the Cloudflare Worker service */
  serviceUrl: string;
  /** Optional bearer token for authentication */
  authToken?: string;
  /** Optional job definition URL to pass to the worker */
  jobDefUrl?: string;
}

/**
 * Adapter for executing rendering jobs on Cloudflare Workers.
 */
export class CloudflareWorkersAdapter implements WorkerAdapter {
  constructor(private config: CloudflareWorkersAdapterConfig) {}

  async execute(job: WorkerJob): Promise<WorkerResult> {
    const startTime = Date.now();

    const chunkId = job.meta?.chunkId;
    if (chunkId === undefined) {
      throw new Error('CloudflareWorkersAdapter requires job.meta.chunkId to be set');
    }

    const jobDefUrl = this.config.jobDefUrl || job.meta?.jobDefUrl;
    if (!jobDefUrl) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: 'CloudflareWorkersAdapter requires jobDefUrl (in config or job.meta)',
        durationMs: Date.now() - startTime,
      };
    }

    try {
      const payload = {
        jobPath: jobDefUrl,
        chunkIndex: chunkId,
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.config.authToken) {
        headers['Authorization'] = `Bearer ${this.config.authToken}`;
      }

      const response = await fetch(this.config.serviceUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: job.signal,
      });

      let data: any = {};
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { stdout: text };
      }

      // Resolve execution exit code based on response payload or fallback to HTTP status
      const exitCode = typeof data.exitCode === 'number' ? data.exitCode : (response.ok ? 0 : 1);
      const stdout = data.stdout || data.output || '';
      const stderr = data.stderr || '';

      if (!response.ok) {
        return {
          // If HTTP failed, ensure we return a non-zero exit code even if payload specifically dictated 0
          exitCode: exitCode !== 0 ? exitCode : 1,
          stdout,
          stderr: stderr || `HTTP Error ${response.status}: ${response.statusText}`,
          durationMs: Date.now() - startTime,
        };
      }

      return {
        exitCode,
        stdout,
        stderr,
        durationMs: Date.now() - startTime,
      };
    } catch (error: any) {
      let errorMessage = error.message;
      if (error.name === 'AbortError') {
        errorMessage = 'Job was cancelled';
      }

      return {
        exitCode: 1,
        stdout: '',
        stderr: `Cloudflare Workers execution failed: ${errorMessage}`,
        durationMs: Date.now() - startTime,
      };
    }
  }
}
