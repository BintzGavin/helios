import { spawn } from 'node:child_process';
import { WorkerAdapter, WorkerJob, WorkerResult } from '../types/index.js';

/**
 * Executes worker jobs in the local environment using child_process.spawn.
 */
export class LocalWorkerAdapter implements WorkerAdapter {
  async execute(job: WorkerJob): Promise<WorkerResult> {
    const startTime = Date.now();
    const { command, args = [], env, cwd, timeout } = job;

    return new Promise((resolve, reject) => {
      // Merge current process environment with provided env
      const childEnv = { ...process.env, ...(env || {}) };

      const child = spawn(command, args, {
        env: childEnv,
        cwd: cwd || process.cwd(),
        shell: false, // Explicitly disable shell for security and consistency
      });

      let stdout = '';
      let stderr = '';

      if (child.stdout) {
        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });
      }

      if (child.stderr) {
        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });
      }

      // Handle timeout
      let timeoutId: NodeJS.Timeout | undefined;
      if (timeout && timeout > 0) {
        timeoutId = setTimeout(() => {
          child.kill();
          const durationMs = Date.now() - startTime;
          reject(new Error(`Worker job timed out after ${timeout}ms`));
        }, timeout);
      }

      child.on('error', (err) => {
        if (timeoutId) clearTimeout(timeoutId);
        reject(err);
      });

      child.on('close', (code) => {
        if (timeoutId) clearTimeout(timeoutId);
        const durationMs = Date.now() - startTime;

        resolve({
          exitCode: code ?? -1, // -1 if killed by signal or other reason
          stdout,
          stderr,
          durationMs,
        });
      });
    });
  }
}
