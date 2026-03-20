import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { JobSpec } from '../types/job.js';
import { JobExecutor, LocalWorkerAdapter, AwsLambdaAdapter, CloudRunAdapter, CloudflareWorkersAdapter, AzureFunctionsAdapter, FlyMachinesAdapter, KubernetesAdapter, DockerAdapter, WorkerAdapter } from '@helios-project/infrastructure';

export async function loadJobSpec(file: string): Promise<{ jobSpec: JobSpec, jobDir: string }> {
  if (file.startsWith('http://') || file.startsWith('https://')) {
    const res = await fetch(file);
    if (!res.ok) {
      throw new Error(`Failed to fetch job: ${res.statusText} (${res.status})`);
    }
    const jobSpec = (await res.json()) as JobSpec;
    return { jobSpec, jobDir: process.cwd() };
  } else {
    const jobPath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(jobPath)) {
      throw new Error(`Job file not found: ${jobPath}`);
    }
    const jobSpec = JSON.parse(fs.readFileSync(jobPath, 'utf-8')) as JobSpec;
    return { jobSpec, jobDir: path.dirname(jobPath) };
  }
}

export function registerJobCommand(program: Command) {
  const jobCommand = program
    .command('job')
    .description('Manage distributed rendering jobs');

  jobCommand
    .command('run <file>')
    .description('Execute a distributed render job from a JSON spec')
    .option('--chunk <id>', 'Execute only the chunk with the specified ID')
    .option('--concurrency <number>', 'Number of concurrent chunks to run locally', '1')
    .option('--no-merge', 'Skip the final merge step')
    .option('--adapter <type>', 'Adapter to use (local, aws, gcp, cloudflare, azure, fly, kubernetes, docker)', 'local')
    .option('--fly-api-token <token>', 'Fly.io API token')
    .option('--fly-app-name <name>', 'Fly.io app name')
    .option('--fly-image-ref <ref>', 'Fly.io image ref')
    .option('--fly-region <region>', 'Fly.io region')
    .option('--k8s-kubeconfig-path <path>', 'Kubernetes kubeconfig path')
    .option('--k8s-namespace <namespace>', 'Kubernetes namespace', 'default')
    .option('--k8s-job-image <image>', 'Kubernetes job image')
    .option('--k8s-job-name-prefix <prefix>', 'Kubernetes job name prefix')
    .option('--k8s-service-account-name <name>', 'Kubernetes service account name')
    .option('--docker-image <image>', 'Docker image to use')
    .option('--aws-region <region>', 'AWS Region for Lambda adapter')
    .option('--aws-function-name <name>', 'AWS Lambda function name')
    .option('--aws-job-def-url <url>', 'URL of the job definition for AWS Lambda')
    .option('--gcp-service-url <url>', 'GCP Cloud Run service URL')
    .option('--gcp-job-def-url <url>', 'URL of the job definition for GCP Cloud Run')
    .option('--cloudflare-service-url <url>', 'Cloudflare Workers service URL')
    .option('--cloudflare-auth-token <token>', 'Cloudflare Workers bearer token')
    .option('--cloudflare-job-def-url <url>', 'URL of the job definition for Cloudflare Workers')
    .option('--azure-service-url <url>', 'Azure Functions service URL')
    .option('--azure-function-key <key>', 'Azure Functions function key')
    .option('--azure-job-def-url <url>', 'URL of the job definition for Azure Functions')
    .action(async (file, options) => {
      try {
        const { jobSpec, jobDir } = await loadJobSpec(file);
        const chunkId = options.chunk ? parseInt(options.chunk, 10) : undefined;

        if (chunkId !== undefined && isNaN(chunkId)) {
          throw new Error('Chunk ID must be a valid number');
        }

        const concurrency = parseInt(options.concurrency, 10);
        if (isNaN(concurrency) || concurrency < 1) {
          throw new Error('Concurrency must be a positive number');
        }

        let completedChunkIds: number[] | undefined;

        if (chunkId !== undefined) {
          const chunkExists = jobSpec.chunks.some(c => c.id === chunkId);
          if (!chunkExists) {
            throw new Error(`Chunk ${chunkId} not found in job spec`);
          }
          completedChunkIds = jobSpec.chunks
            .map(c => c.id)
            .filter(id => id !== chunkId);
        }

        const shouldMerge = options.merge && chunkId === undefined;

        let adapter: WorkerAdapter;

        if (options.adapter === 'aws') {
          if (!options.awsFunctionName) {
            throw new Error('AWS adapter requires --aws-function-name');
          }
          adapter = new AwsLambdaAdapter({
            region: options.awsRegion,
            functionName: options.awsFunctionName,
            jobDefUrl: options.awsJobDefUrl || file
          });
        } else if (options.adapter === 'gcp') {
          if (!options.gcpServiceUrl) {
            throw new Error('GCP adapter requires --gcp-service-url');
          }
          adapter = new CloudRunAdapter({
            serviceUrl: options.gcpServiceUrl,
            jobDefUrl: options.gcpJobDefUrl || file
          });
        } else if (options.adapter === 'cloudflare') {
          if (!options.cloudflareServiceUrl) {
            throw new Error('Cloudflare adapter requires --cloudflare-service-url');
          }
          adapter = new CloudflareWorkersAdapter({
            serviceUrl: options.cloudflareServiceUrl,
            authToken: options.cloudflareAuthToken,
            jobDefUrl: options.cloudflareJobDefUrl || file
          });
        } else if (options.adapter === 'azure') {
          if (!options.azureServiceUrl) {
            throw new Error('Azure adapter requires --azure-service-url');
          }
          adapter = new AzureFunctionsAdapter({
            serviceUrl: options.azureServiceUrl,
            functionKey: options.azureFunctionKey,
            jobDefUrl: options.azureJobDefUrl || file
          });
        } else if (options.adapter === 'fly') {
          if (!options.flyApiToken || !options.flyAppName || !options.flyImageRef) {
            throw new Error('Fly adapter requires --fly-api-token, --fly-app-name, and --fly-image-ref');
          }
          adapter = new FlyMachinesAdapter({
            apiToken: options.flyApiToken,
            appName: options.flyAppName,
            imageRef: options.flyImageRef,
            region: options.flyRegion
          });
        } else if (options.adapter === 'kubernetes') {
          if (!options.k8sJobImage) {
            throw new Error('Kubernetes adapter requires --k8s-job-image');
          }
          adapter = new KubernetesAdapter({
            kubeconfigPath: options.k8sKubeconfigPath,
            namespace: options.k8sNamespace,
            image: options.k8sJobImage,
            jobNamePrefix: options.k8sJobNamePrefix,
            serviceAccountName: options.k8sServiceAccountName
          });
        } else if (options.adapter === 'docker') {
          if (!options.dockerImage) {
            throw new Error('Docker adapter requires --docker-image');
          }
          adapter = new DockerAdapter({
            image: options.dockerImage
          });
        } else {
          adapter = new LocalWorkerAdapter();
        }

        const executor = new JobExecutor(adapter);

        // Ensure jobSpec has an id to satisfy infrastructure JobSpec interface
        const infrastructureJobSpec = {
          ...jobSpec,
          id: (jobSpec as any).id || `job-${Date.now()}`
        };

        await executor.execute(infrastructureJobSpec as any, {
          concurrency,
          jobDir,
          merge: shouldMerge,
          completedChunkIds,
          onChunkStdout: (id: number, data: string) => process.stdout.write(data),
          onChunkStderr: (id: number, data: string) => process.stderr.write(data)
        });

      } catch (err: any) {
        console.error('Job execution failed:', err.message);
        process.exit(1);
      }
    });
}
