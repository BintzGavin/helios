import { WorkerAdapter, WorkerResult } from '../types/adapter.js';
import { WorkerJob } from '../types/job.js';

export interface AzureFunctionsAdapterConfig {
  serviceUrl: string;
  functionKey?: string;
  jobDefUrl?: string;
}

export class AzureFunctionsAdapter implements WorkerAdapter {
  constructor(private config: AzureFunctionsAdapterConfig) {}

  async execute(job: WorkerJob): Promise<WorkerResult> {
    const startTime = Date.now();
    const chunkIndex = job.meta?.chunkId;
    const jobDefUrl = job.meta?.jobDefUrl || this.config.jobDefUrl;

    if (chunkIndex === undefined) {
      throw new Error('chunkId is required in job metadata for Azure Functions execution');
    }

    if (!jobDefUrl) {
      throw new Error('jobDefUrl is required in job metadata or adapter config for Azure Functions execution');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.config.functionKey) {
      headers['x-functions-key'] = this.config.functionKey;
    }

    const payload = {
      jobPath: jobDefUrl,
      chunkIndex,
    };

    try {
      const response = await fetch(this.config.serviceUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: job.signal,
      });

      const contentType = response.headers.get('content-type') || '';
      let stdout = '';
      let stderr = '';
      let exitCode = 0;

      if (!response.ok) {
        exitCode = response.status;
        stderr = `HTTP Error: ${response.status} ${response.statusText}`;
        try {
          const text = await response.text();
          stderr += `\n${text}`;
        } catch {
          // Ignore
        }
      } else {
        if (contentType.includes('application/json')) {
          try {
            const data = await response.json() as { stdout?: string; stderr?: string; exitCode?: number };
            stdout = data.stdout || '';
            stderr = data.stderr || '';
            exitCode = data.exitCode ?? 0;
          } catch (error) {
            exitCode = 1;
            stderr = `Failed to parse JSON response: ${(error as Error).message}`;
          }
        } else {
          stdout = await response.text();
        }
      }

      return {
        exitCode,
        stdout,
        stderr,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      let exitCode = 1;
      let stderr = error instanceof Error ? error.message : String(error);

      if (error instanceof Error && error.name === 'AbortError') {
        exitCode = 143; // SIGTERM equivalent
        stderr = 'Job execution aborted by signal';
      }

      return {
        exitCode,
        stdout: '',
        stderr,
        durationMs: Date.now() - startTime,
      };
    }
  }
}
