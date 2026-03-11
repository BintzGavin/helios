import { WorkerRuntime } from './runtime.js';
import { ArtifactStorage } from '../types/index.js';

export interface AwsHandlerConfig {
  workspaceDir?: string;
  storage?: ArtifactStorage;
}

export function createAwsHandler(config: AwsHandlerConfig = {}) {
  const workspaceDir = config.workspaceDir || '/tmp';
  const storage = config.storage;

  return async (event: any) => {
    try {
      if (!event || typeof event !== 'object') {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: 'Invalid payload: must be an object' })
        };
      }

      const { jobPath, chunkIndex } = event;

      if (typeof jobPath !== 'string' || typeof chunkIndex !== 'number') {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: 'Invalid payload: missing jobPath or chunkIndex' })
        };
      }

      const runtime = new WorkerRuntime({ workspaceDir, storage });
      const result = await runtime.run(jobPath, chunkIndex);

      return {
        statusCode: result.exitCode === 0 ? 200 : 500,
        body: JSON.stringify({
          exitCode: result.exitCode,
          output: result.stdout,
          stderr: result.stderr
        })
      };
    } catch (error: any) {
      let message = 'Unknown error in AWS Lambda handler';
      if (error && typeof error === 'object' && error.message) {
        message = error.message;
      } else if (error && typeof error === 'string') {
        message = error;
      }
      return {
        statusCode: 500,
        body: JSON.stringify({ message })
      };
    }
  };
}
