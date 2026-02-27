import { WorkerAdapter, WorkerJob, WorkerResult } from '../types/index.js';
import { GoogleAuth } from 'google-auth-library';

export interface CloudRunAdapterConfig {
  /** The URL of the Cloud Run service */
  serviceUrl: string;
  /**
   * The job definition URL to pass to the worker.
   * If not provided, it must be present in job.meta.jobDefUrl.
   */
  jobDefUrl?: string;
}

/**
 * Adapter for executing rendering jobs on Google Cloud Run (Services).
 *
 * Authenticates using OIDC ID Tokens via google-auth-library.
 * Sends a POST request to the service with the job payload.
 */
export class CloudRunAdapter implements WorkerAdapter {
  private auth: GoogleAuth;
  private client: any;

  constructor(private config: CloudRunAdapterConfig) {
    this.auth = new GoogleAuth();
  }

  private async getClient() {
    if (!this.client) {
      this.client = await this.auth.getIdTokenClient(this.config.serviceUrl);
    }
    return this.client;
  }

  async execute(job: WorkerJob): Promise<WorkerResult> {
    const startTime = Date.now();

    // Validate required metadata
    const chunkId = job.meta?.chunkId;
    if (chunkId === undefined) {
      throw new Error('CloudRunAdapter requires job.meta.chunkId to be set');
    }

    const jobDefUrl = this.config.jobDefUrl || job.meta?.jobDefUrl;
    if (!jobDefUrl) {
      return Promise.resolve({
        exitCode: 1,
        stdout: '',
        stderr: 'CloudRunAdapter requires jobDefUrl (in config or job.meta)',
        durationMs: Date.now() - startTime
      });
    }

    try {
      const client = await this.getClient();

      // Payload matching the structure expected by the worker
      // Typically this matches what AwsLambdaAdapter sends or what the CLI expects
      const payload = {
        jobPath: jobDefUrl,
        chunkIndex: chunkId,
        // Forward other meta if needed, but keeping it minimal for now
      };

      const res = await client.request({
        url: this.config.serviceUrl,
        method: 'POST',
        data: payload,
        headers: {
          'Content-Type': 'application/json'
        },
        // Set a reasonable timeout (e.g., 60 minutes for rendering)
        // or rely on the Cloud Run service timeout
        timeout: 3600000
      });

      // We expect the worker to return a JSON object with:
      // { exitCode, stdout, stderr, output? }
      const data = res.data as any;

      // Normalize response
      const exitCode = typeof data.exitCode === 'number' ? data.exitCode : 0;
      const stdout = data.stdout || data.output || '';
      const stderr = data.stderr || '';

      if (res.status !== 200) {
        return {
          exitCode: 1,
          stdout: stdout,
          stderr: stderr || `HTTP Error ${res.status}: ${res.statusText}`,
          durationMs: Date.now() - startTime
        };
      }

      return {
        exitCode,
        stdout,
        stderr,
        durationMs: Date.now() - startTime
      };

    } catch (error: any) {
      // Handle network or auth errors
      let errorMessage = error.message;
      if (error.response) {
         errorMessage = `HTTP ${error.response.status}: ${JSON.stringify(error.response.data) || error.response.statusText}`;
      }

      return {
        exitCode: 1,
        stdout: '',
        stderr: `Cloud Run execution failed: ${errorMessage}`,
        durationMs: Date.now() - startTime
      };
    }
  }
}
