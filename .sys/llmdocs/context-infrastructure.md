# Context: Infrastructure

## A. Architecture

The `packages/infrastructure` domain implements distributed rendering logic through a set of abstractions that separate the orchestration of jobs, the execution of stateless workers in the cloud, and the concatenation of media artifacts.

- **Job Management**: Orchestrates rendering tasks, divides jobs into chunks, uploads assets, and tracks progress.
- **Worker Adapters**: Provides cloud-agnostic interfaces for running stateless tasks (e.g., AWS Lambda, Cloud Run, Local execution).
- **Artifact Storage**: Abstracts cloud storage (e.g., AWS S3, Google Cloud Storage, Local) for managing input assets and resulting render chunks.
- **Stitching**: Combines the output of stateless workers into a final media asset using specialized logic like `FfmpegStitcher`.

## B. File Tree

```
packages/infrastructure/
├── src/
│   ├── adapters/
│   │   ├── aws-adapter.ts
│   │   ├── azure-functions-adapter.ts
│   │   ├── cloudflare-workers-adapter.ts
│   │   ├── cloudrun-adapter.ts
│   │   ├── deno-deploy-adapter.ts
│   │   ├── docker-adapter.ts
│   │   ├── fly-machines-adapter.ts
│   │   ├── hetzner-cloud-adapter.ts
│   │   ├── index.ts
│   │   ├── kubernetes-adapter.ts
│   │   ├── local-adapter.ts
│   │   ├── modal-adapter.ts
│   │   └── vercel-adapter.ts
│   ├── e2e/
│   ├── governance/
│   │   ├── index.ts
│   │   └── sync-workspace.ts
│   ├── index.ts
│   ├── orchestrator/
│   │   ├── file-job-repository.ts
│   │   ├── index.ts
│   │   ├── job-executor.ts
│   │   ├── job-manager.ts
│   │   └── scheduler.ts
│   ├── stitcher/
│   │   ├── concat-stitcher.ts
│   │   └── index.ts
│   ├── storage/
│   │   ├── gcs-storage.ts
│   │   ├── index.ts
│   │   ├── local-storage.ts
│   │   └── s3-storage.ts
│   ├── types/
│   │   ├── adapter.ts
│   │   ├── index.ts
│   │   ├── job.ts
│   │   ├── storage.ts
│   │   └── worker.ts
│   ├── utils/
│   │   ├── command.ts
│   │   ├── index.ts
│   │   ├── retry.ts
│   │   └── validation.ts
│   └── worker/
│       ├── aws-handler.ts
│       ├── cloudrun-server.ts
│       ├── frame-worker.ts
│       ├── index.ts
│       ├── stateless-worker.ts
│       └── worker-runtime.ts
├── tests/
│   ├── adapters/
│   │   ├── aws-adapter.test.ts
│   │   ├── azure-functions-adapter.test.ts
│   │   ├── cloudflare-workers-adapter.test.ts
│   │   ├── cloudrun-adapter.test.ts
│   │   ├── deno-deploy-adapter.test.ts
│   │   ├── docker-adapter.test.ts
│   │   ├── fly-machines-adapter.test.ts
│   │   ├── hetzner-cloud-adapter.test.ts
│   │   ├── kubernetes-adapter.test.ts
│   │   ├── local-adapter.test.ts
│   │   ├── modal-adapter.test.ts
│   │   └── vercel-adapter.test.ts
│   ├── e2e/
│   ├── orchestrator/
│   ├── storage/
│   └── utils/
```

## C. Interfaces

```typescript
export interface WorkerAdapter {
  execute(job: WorkerJob): Promise<WorkerResult>;
}

export interface WorkerJob {
  command: string;
  meta: Record<string, unknown>;
  onProgress?: (progress: number) => void;
  onStdout?: (chunk: string) => void;
  onStderr?: (chunk: string) => void;
  abortSignal?: AbortSignal;
}

export interface WorkerResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface ArtifactStorage {
  uploadAsset(localPath: string, remoteKey: string): Promise<string>;
  downloadAsset(remoteKey: string, localPath: string): Promise<void>;
  getAssetUrl(remoteKey: string): Promise<string>;
  deleteAssetBundle(bundlePrefix: string): Promise<void>;
}
```

## D. Cloud Adapters

- `AwsLambdaAdapter`: Dispatches tasks to AWS Lambda via `@aws-sdk/client-lambda`.
- `CloudRunAdapter`: Dispatches tasks to Google Cloud Run via HTTP POST.
- `AzureFunctionsAdapter`: Dispatches tasks to Azure Functions.
- `CloudflareWorkersAdapter`: Dispatches tasks to Cloudflare Workers via REST API.
- `DenoDeployAdapter`: Dispatches tasks to Deno Deploy via REST API.
- `DockerAdapter`: Dispatches tasks to a Docker Daemon using `docker exec`.
- `FlyMachinesAdapter`: Dispatches tasks to Fly.io Machines via the Fly Machines REST API.
- `HetznerCloudAdapter`: Dispatches tasks to Hetzner Cloud via hcloud REST API.
- `KubernetesAdapter`: Dispatches tasks as Kubernetes Jobs.
- `LocalWorkerAdapter`: Runs tasks locally using Node.js `child_process`.
- `ModalAdapter`: Dispatches tasks to Modal using Modal's Python-native serverless platform.
- `VercelAdapter`: Dispatches tasks to Vercel Serverless Functions.

## E. Integration

The infrastructure logic is consumed by `packages/cli` for rendering commands, taking advantage of the `JobManager` to partition rendering workloads across different environments. Rendering engines (like `packages/renderer`) produce the frame outputs which are eventually concatenated using `FfmpegStitcher`.
