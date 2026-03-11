import { WorkerAdapter, WorkerJob, WorkerResult } from '../types/index.js';

export interface FlyMachinesAdapterConfig {
  apiToken: string;
  appName: string;
  imageRef: string;
  region?: string;
}

export class FlyMachinesAdapter implements WorkerAdapter {
  constructor(private readonly config: FlyMachinesAdapterConfig) {}

  async execute(job: WorkerJob): Promise<WorkerResult> {
    const startTime = Date.now();

    if (job.signal?.aborted) {
      throw new Error('Job was aborted');
    }

    const jobDefUrl = job.meta?.jobDefUrl;
    const chunkIndex = job.meta?.chunkIndex;

    if (!jobDefUrl || chunkIndex === undefined) {
      throw new Error('jobDefUrl and chunkIndex are required in job.meta for FlyMachinesAdapter');
    }

    const payload = {
      jobPath: jobDefUrl,
      chunkIndex,
    };

    const createRes = await fetch(`https://api.machines.dev/v1/apps/${this.config.appName}/machines`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        region: this.config.region,
        config: {
          image: this.config.imageRef,
          env: {
            HELIOS_JOB_PAYLOAD: JSON.stringify(payload),
          },
          auto_destroy: true,
        },
      }),
    });

    if (!createRes.ok) {
      const text = await createRes.text().catch(() => '');
      throw new Error(`Failed to create Fly Machine: ${createRes.status} ${createRes.statusText} ${text}`);
    }

    const machineData = await createRes.json() as any;
    const machineId = machineData.id;

    const cleanup = async () => {
      try {
        await fetch(`https://api.machines.dev/v1/apps/${this.config.appName}/machines/${machineId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.config.apiToken}`,
          },
        });
      } catch (e) {
        // Ignore cleanup errors
      }
    };

    if (job.signal) {
      job.signal.addEventListener('abort', () => {
        cleanup();
      }, { once: true });
    }

    try {
      // Poll for completion
      while (true) {
        if (job.signal?.aborted) {
          throw new Error('Job was aborted');
        }

        const pollRes = await fetch(`https://api.machines.dev/v1/apps/${this.config.appName}/machines/${machineId}`, {
          headers: {
            'Authorization': `Bearer ${this.config.apiToken}`,
          },
        });

        if (pollRes.ok) {
          const stateData = await pollRes.json() as any;
          if (stateData.state === 'stopped' || stateData.state === 'destroyed') {
            const durationMs = Date.now() - startTime;
            return {
              exitCode: stateData.events?.[0]?.request?.exit_event?.exit_code ?? 0,
              stdout: `Machine ${machineId} executed.`,
              stderr: '',
              durationMs,
            };
          }
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    } finally {
      await cleanup();
    }
  }
}
