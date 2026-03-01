import { LambdaClient, InvokeCommand, InvokeCommandOutput } from '@aws-sdk/client-lambda';
import { WorkerAdapter, WorkerJob, WorkerResult } from '../types/index.js';

export interface AwsLambdaAdapterConfig {
  /** AWS Region */
  region?: string;
  /** Name or ARN of the Lambda function */
  functionName: string;
  /** URL where the job definition is hosted */
  jobDefUrl?: string;
}

/**
 * Adapter for executing rendering jobs on AWS Lambda.
 * Translates worker jobs into Lambda invocations.
 */
export class AwsLambdaAdapter implements WorkerAdapter {
  private client: LambdaClient;
  private config: AwsLambdaAdapterConfig;

  constructor(config: AwsLambdaAdapterConfig) {
    this.config = config;
    this.client = new LambdaClient({ region: config.region });
  }

  async execute(job: WorkerJob): Promise<WorkerResult> {
    const startTime = Date.now();
    const chunkId = job.meta?.chunkId;

    if (chunkId === undefined) {
      throw new Error('AwsLambdaAdapter requires job.meta.chunkId to be set');
    }

    try {
      const jobDefUrl = job.meta?.jobDefUrl || this.config.jobDefUrl;
      if (!jobDefUrl) {
        throw new Error('AwsLambdaAdapter requires job.meta.jobDefUrl or config.jobDefUrl to be set');
      }

      const payload = JSON.stringify({
        jobPath: jobDefUrl,
        chunkIndex: chunkId
      });

      const command = new InvokeCommand({
        FunctionName: this.config.functionName,
        Payload: new TextEncoder().encode(payload),
        InvocationType: 'RequestResponse', // Wait for execution to complete
      });

      const response: InvokeCommandOutput = await this.client.send(command, { abortSignal: job.signal });

      // Handle AWS SDK errors (infrastructure failures)
      if (response.FunctionError) {
        let errorDetails = 'Unknown Lambda Error';
        if (response.Payload) {
           const payloadStr = new TextDecoder().decode(response.Payload);
           try {
             const errorObj = JSON.parse(payloadStr);
             errorDetails = errorObj.errorMessage || payloadStr;
           } catch {
             errorDetails = payloadStr;
           }
        }
        throw new Error(`Lambda execution failed: ${errorDetails}`);
      }

      let stdout = '';
      let stderr = '';
      let exitCode = 0;

      // Parse successful execution payload
      if (response.Payload) {
        const payloadStr = new TextDecoder().decode(response.Payload);
        try {
          const result = JSON.parse(payloadStr);

          // The Lambda handler template returns { statusCode, body }
          // We need to parse the body to get the actual output
          if (result.body) {
             const body = typeof result.body === 'string' ? JSON.parse(result.body) : result.body;

             // Extract stdout/output from body
             if (body.output) {
                stdout = body.output;
             }

             // Check status code
             if (result.statusCode === 200) {
                exitCode = 0;
             } else {
                exitCode = 1;
                stderr = body.message || 'Lambda returned non-200 status code';
             }
          } else {
             // Fallback for custom handlers that might return raw data
             stdout = payloadStr;
             // If we got a payload but no structured body, assume success if no FunctionError was thrown
             exitCode = 0;
          }

        } catch (e) {
          stderr = `Failed to parse Lambda response: ${(e as Error).message}`;
          // Still return raw payload for debugging
          if (!stdout) stdout = payloadStr;
          exitCode = 1;
        }
      }

      return {
        exitCode,
        stdout,
        stderr,
        durationMs: Date.now() - startTime
      };

    } catch (error: any) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: error.message || 'Unknown error executing Lambda',
        durationMs: Date.now() - startTime
      };
    }
  }
}
