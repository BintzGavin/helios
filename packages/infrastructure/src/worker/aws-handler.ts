import { WorkerRuntime } from './runtime.js';
import { ArtifactStorage } from '../types/index.js';

export interface AwsHandlerConfig {
  /** The directory to use for the ephemeral workspace. Defaults to '/tmp'. */
  workspaceDir?: string;
  /** Storage adapter for fetching remote job assets. */
  storage?: ArtifactStorage;
}

/**
 * Creates an AWS Lambda handler for executing stateless worker jobs.
 *
 * @param config Configuration for the handler
 * @returns An async function compatible with the AWS Lambda Node.js runtime signature
 */
export function createAwsHandler(config: AwsHandlerConfig = {}) {
  const workspaceDir = config.workspaceDir || '/tmp';

  return async (event: any) => {
    try {
      const { jobPath, chunkIndex } = event;

      if (!jobPath || chunkIndex === undefined) {
         return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Invalid payload: missing jobPath or chunkIndex' })
         };
      }

      const runtime = new WorkerRuntime({ workspaceDir, storage: config.storage });
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
      return {
        statusCode: 500,
        body: JSON.stringify({ message: error.message || 'Unknown error in AWS Lambda handler' })
      };
    }
  };
}
