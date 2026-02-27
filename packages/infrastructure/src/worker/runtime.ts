import fs from 'node:fs/promises';
import { RenderExecutor } from './render-executor.js';
import { JobSpec, WorkerResult } from '../types/index.js';

export class WorkerRuntime {
  private workspaceDir: string;

  constructor(config: { workspaceDir: string }) {
    this.workspaceDir = config.workspaceDir;
  }

  async run(jobPath: string, chunkId: number): Promise<WorkerResult> {
    let jobSpec: JobSpec;

    try {
      if (jobPath.startsWith('http://') || jobPath.startsWith('https://')) {
        const response = await fetch(jobPath);
        if (!response.ok) {
          throw new Error(`Failed to fetch job spec: ${response.statusText}`);
        }
        jobSpec = (await response.json()) as JobSpec;
      } else {
        const fileContent = await fs.readFile(jobPath, 'utf-8');
        jobSpec = JSON.parse(fileContent) as JobSpec;
      }

      if (!jobSpec || !Array.isArray(jobSpec.chunks)) {
        throw new Error('Invalid JobSpec: missing chunks array');
      }

      const executor = new RenderExecutor(this.workspaceDir);
      return await executor.executeChunk(jobSpec, chunkId);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(String(error));
    }
  }
}
