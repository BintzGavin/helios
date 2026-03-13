import * as k8s from '@kubernetes/client-node';
import { WorkerAdapter, WorkerResult } from '../types/adapter.js';
import { WorkerJob } from '../types/job.js';

/**
 * Options for configuring the KubernetesAdapter.
 */
export interface KubernetesAdapterOptions {
  kubeconfigPath?: string;
  namespace?: string;
  image: string;
  jobNamePrefix?: string;
  serviceAccountName?: string;
  pollIntervalMs?: number;
}

export class KubernetesAdapter implements WorkerAdapter {
  private kc: k8s.KubeConfig;
  private batchV1Api: k8s.BatchV1Api;
  private coreV1Api: k8s.CoreV1Api;

  constructor(private options: KubernetesAdapterOptions) {
    this.kc = new k8s.KubeConfig();
    if (options.kubeconfigPath) {
      this.kc.loadFromFile(options.kubeconfigPath);
    } else {
      this.kc.loadFromDefault();
    }
    this.batchV1Api = this.kc.makeApiClient(k8s.BatchV1Api);
    this.coreV1Api = this.kc.makeApiClient(k8s.CoreV1Api);
  }

  async execute(job: WorkerJob): Promise<WorkerResult> {
    const startTime = Date.now();
    const namespace = this.options.namespace || 'default';
    const prefix = this.options.jobNamePrefix || 'helios-worker';
    const chunkId = job.meta?.chunkId || 'default';
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const jobName = `${prefix}-${chunkId}-${randomSuffix}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    const env: k8s.V1EnvVar[] = [];
    if (job.env) {
      for (const [key, value] of Object.entries(job.env)) {
        env.push({ name: key, value });
      }
    }

    const k8sJob: k8s.V1Job = {
      metadata: { name: jobName, namespace },
      spec: {
        backoffLimit: 0,
        template: {
          metadata: { labels: { jobName } },
          spec: {
            containers: [
              {
                name: 'worker',
                image: this.options.image,
                command: [job.command],
                args: job.args || [],
                env: env.length > 0 ? env : undefined,
                workingDir: job.cwd,
              },
            ],
            restartPolicy: 'Never',
            serviceAccountName: this.options.serviceAccountName,
          },
        },
      },
    };

    let exitCode = 1;
    let stdout = '';
    let stderr = '';

    try {
      await this.batchV1Api.createNamespacedJob(namespace, k8sJob);

      let aborted = false;

      const onAbort = () => {
        aborted = true;
      };
      job.signal?.addEventListener('abort', onAbort);

      try {
        while (!aborted) {
          const response = await this.batchV1Api.readNamespacedJob(jobName, namespace);
          const jobResult = response.body ?? response; // Handle both mocked body shape and direct return

          if (jobResult.status?.succeeded && jobResult.status.succeeded > 0) {
            exitCode = 0;
            break;
          }
          if (jobResult.status?.failed && jobResult.status.failed > 0) {
            exitCode = 1;
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, this.options.pollIntervalMs || 2000));
        }

        if (aborted) {
          exitCode = 1;
          throw new Error('Job aborted');
        }

        const pods = await this.coreV1Api.listNamespacedPod(
          namespace,
          undefined,
          undefined,
          undefined,
          undefined,
          `jobName=${jobName}`
        );

        const podsBody = pods.body ?? pods;
        if (podsBody.items && podsBody.items.length > 0) {
          const podName = podsBody.items[0].metadata?.name;
          if (podName) {
            const logResponse = await this.coreV1Api.readNamespacedPodLog(
              podName,
              namespace
            );
            const logs = logResponse.body ?? logResponse;
            stdout = (logs as unknown as string) || '';
            if (job.onStdout && stdout) {
              job.onStdout(stdout);
            }
          }
        }

      } catch (error: any) {
        if (aborted) {
          stderr = 'Job aborted';
        } else {
          stderr = `Job monitoring failed: ${error.message || String(error)}`;
          if (job.onStderr && stderr) {
            job.onStderr(stderr);
          }
        }
      } finally {
        job.signal?.removeEventListener('abort', onAbort);
      }

    } catch (error: any) {
      exitCode = 1;
      stderr = `Failed to create Job: ${error.message || String(error)}`;
    } finally {
      try {
        await this.batchV1Api.deleteNamespacedJob(jobName, namespace, undefined, undefined, undefined, undefined, 'Background');
      } catch (error) {
        // Ignore deletion errors
      }
    }

    return {
      exitCode,
      stdout,
      stderr,
      durationMs: Date.now() - startTime,
    };
  }
}
