import { spawn } from 'node:child_process';
import { WorkerAdapter, WorkerJob, WorkerResult } from '../types/index.js';

/**
 * Executes worker jobs in the local environment using child_process.spawn.
 */
export class LocalWorkerAdapter implements WorkerAdapter {
  async execute(job: WorkerJob): Promise<WorkerResult> {
    const startTime = Date.now();
    const { command, args = [], env, cwd, timeout, signal, onStdout, onStderr } = job;

    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        return reject(new Error('Job was aborted'));
      }

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
          const str = data.toString();
          stdout += str;
          onStdout?.(str);
        });
      }

      if (child.stderr) {
        child.stderr.on('data', (data) => {
          const str = data.toString();
          stderr += str;
          onStderr?.(str);
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

      let abortListener: (() => void) | undefined;

      if (signal) {
        abortListener = () => {
          if (timeoutId) clearTimeout(timeoutId);
          child.kill();
          reject(new Error('Job was aborted'));
        };
        signal.addEventListener('abort', abortListener, { once: true });
      }

      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
        if (signal && abortListener) {
          signal.removeEventListener('abort', abortListener);
        }
      };

      child.on('error', (err) => {
        cleanup();
        reject(err);
      });

      child.on('close', (code) => {
        cleanup();
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
