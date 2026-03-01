import fs from 'node:fs/promises';
import { RenderExecutor } from './render-executor.js';
import { JobSpec, WorkerResult, ArtifactStorage } from '../types/index.js';

export class WorkerRuntime {
  private workspaceDir: string;
  private storage?: ArtifactStorage;

  constructor(config: { workspaceDir: string; storage?: ArtifactStorage }) {
    this.workspaceDir = config.workspaceDir;
    this.storage = config.storage;
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

      if (jobSpec.assetsUrl) {
        if (!this.storage) {
          throw new Error('Worker was not configured with an ArtifactStorage adapter, but the job requires remote assets.');
        }
        await this.storage.downloadAssetBundle(jobSpec.id, jobSpec.assetsUrl, this.workspaceDir);
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
