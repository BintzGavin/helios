import { WorkerAdapter, WorkerResult } from '../types/adapter.js';
import { WorkerJob } from '../types/job.js';

export interface ModalAdapterConfig {
  endpointUrl: string;
  authToken?: string;
}

export class ModalAdapter implements WorkerAdapter {
  constructor(private config: ModalAdapterConfig) {}

  async execute(job: WorkerJob): Promise<WorkerResult> {
    const startTime = Date.now();
    let aborted = false;

    const onAbort = () => {
      aborted = true;
    };

    if (job.signal) {
      job.signal.addEventListener('abort', onAbort);
    }

    try {
      const payload = {
        jobPath: job.meta?.jobDefUrl,
        chunkIndex: job.meta?.chunkId,
        command: job.command,
        args: job.args,
        env: job.env,
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.config.authToken) {
        headers['Authorization'] = `Bearer ${this.config.authToken}`;
      }

      const response = await fetch(this.config.endpointUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: job.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (job.onStdout && result.stdout) {
        job.onStdout(result.stdout);
      }
      if (job.onStderr && result.stderr) {
        job.onStderr(result.stderr);
      }

      return {
        exitCode: result.exitCode ?? 0,
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        durationMs: Date.now() - startTime,
      };
    } catch (error: any) {
      if (aborted || error.name === 'AbortError') {
        const stderr = 'Job aborted';
        if (job.onStderr) job.onStderr(stderr);
        return {
          exitCode: 1,
          stdout: '',
          stderr,
          durationMs: Date.now() - startTime,
        };
      }

      const stderr = `Execution failed: ${error.message}`;
      if (job.onStderr) job.onStderr(stderr);
      return {
        exitCode: 1,
        stdout: '',
        stderr,
        durationMs: Date.now() - startTime,
      };
    } finally {
      if (job.signal) {
        job.signal.removeEventListener('abort', onAbort);
      }
    }
  }
}
