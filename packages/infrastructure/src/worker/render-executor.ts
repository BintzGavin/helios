import { spawn } from 'node:child_process';
import { JobSpec, WorkerResult } from '../types/index.js';
import { parseCommand } from '../utils/command.js';

export class RenderExecutor {
  private workspaceDir: string;

  constructor(workspaceDir: string) {
    this.workspaceDir = workspaceDir;
  }

  async executeChunk(jobSpec: JobSpec, chunkId: number): Promise<WorkerResult> {
    const chunk = jobSpec.chunks.find((c) => c.id === chunkId);
    if (!chunk) {
      throw new Error(`Chunk with ID ${chunkId} not found in job spec`);
    }

    const startTime = Date.now();
    const { command, args } = parseCommand(chunk.command);

    return new Promise((resolve, reject) => {
      // Use spawn to execute the command
      const child = spawn(command, args, {
        cwd: this.workspaceDir,
        env: { ...process.env }, // Inherit environment variables
        shell: false, // Security: avoid shell injection
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

      child.on('error', (err) => {
        reject(err);
      });

      child.on('close', (code) => {
        const durationMs = Date.now() - startTime;
        resolve({
          exitCode: code ?? -1,
          stdout,
          stderr,
          durationMs,
        });
      });
    });
  }
}
