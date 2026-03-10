import { spawn } from 'node:child_process';
import { WorkerAdapter, WorkerResult } from '../types/adapter.js';
import { WorkerJob } from '../types/job.js';

export interface DockerAdapterOptions {
  image: string;
  dockerArgs?: string[];
}

export class DockerAdapter implements WorkerAdapter {
  constructor(private options: DockerAdapterOptions) {}

  public async execute(job: WorkerJob): Promise<WorkerResult> {
    const startTime = Date.now();
    const containerName = `helios-worker-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const args: string[] = ['run', '--name', containerName, '--rm'];

    if (job.env) {
      for (const [key, value] of Object.entries(job.env)) {
        args.push('-e', `${key}=${value}`);
      }
    }

    if (this.options.dockerArgs) {
      args.push(...this.options.dockerArgs);
    }

    args.push(this.options.image);

    args.push(job.command);
    if (job.args) {
      args.push(...job.args);
    }

    return new Promise((resolve, reject) => {
      let stdoutData = '';
      let stderrData = '';
      let cleanupDone = false;

      const child = spawn('docker', args, { stdio: ['ignore', 'pipe', 'pipe'] });

      child.stdout.on('data', (data: Buffer) => {
        const str = data.toString();
        stdoutData += str;
        if (job.onStdout) {
          job.onStdout(str);
        }
      });

      child.stderr.on('data', (data: Buffer) => {
        const str = data.toString();
        stderrData += str;
        if (job.onStderr) {
          job.onStderr(str);
        }
      });

      const cleanup = () => {
        if (cleanupDone) return;
        cleanupDone = true;
        if (job.signal) {
          job.signal.removeEventListener('abort', onAbort);
        }
      };

      const onAbort = () => {
        spawn('docker', ['rm', '-f', containerName], { stdio: 'ignore' });
      };

      if (job.signal) {
        if (job.signal.aborted) {
          onAbort();
          cleanup();
          return resolve({
            exitCode: 1,
            stdout: stdoutData,
            stderr: stderrData,
            durationMs: Date.now() - startTime,
          });
        }
        job.signal.addEventListener('abort', onAbort);
      }

      child.on('close', (code) => {
        cleanup();
        resolve({
          exitCode: code ?? 1,
          stdout: stdoutData,
          stderr: stderrData,
          durationMs: Date.now() - startTime,
        });
      });

      child.on('error', (err) => {
        cleanup();
        reject(err);
      });
    });
  }
}
