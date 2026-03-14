# INFRASTRUCTURE CONTEXT
**Version**: 0.53.10

## Section A: Architecture
The infrastructure package provides cloud-agnostic distributed rendering capabilities. It orchestrates headless rendering workers, handles task distribution, and manages distributed asset lifecycle.

Key Concepts:
- **WorkerRuntime**: The core execution engine running within a stateless cloud function or container.
- **JobExecutor**: The client-side orchestration component that distributes rendering chunks to the WorkerRuntime.
- **JobManager**: The high-level orchestrator that manages job lifecycle, state persistence, and distributed chunk execution via `JobExecutor`.
- **WorkerAdapters**: Cloud-provider specific interfaces that map the generic `JobExecutor` requests to specific cloud function invocations (e.g., AWS Lambda, Google Cloud Run).
- **StorageAdapters**: Cloud-provider specific interfaces for managing remote asset storage (e.g., AWS S3, Google Cloud Storage) during distributed executions.

## Section B: File Tree
```
packages/infrastructure/
├── src/
│   ├── index.ts
│   ├── types/
│   │   ├── index.ts
│   │   ├── worker.ts
│   │   ├── job.ts
│   │   └── adapter.ts
│   ├── worker/
│   │   ├── index.ts
│   │   ├── stateless-worker.ts
│   │   ├── frame-worker.ts
│   │   ├── aws-handler.ts
│   │   └── cloudrun-server.ts
│   ├── orchestrator/
│   │   ├── index.ts
│   │   ├── job-executor.ts
│   │   ├── job-manager.ts
│   │   ├── file-job-repository.ts
│   │   └── render-executor.ts
│   ├── stitcher/
│   │   ├── index.ts
│   │   └── ffmpeg-stitcher.ts
│   ├── storage/
│   │   ├── index.ts
│   │   ├── local-storage.ts
│   │   ├── s3-storage.ts
│   │   └── gcs-storage.ts
│   ├── adapters/
│   │   ├── index.ts
│   │   ├── local-adapter.ts
│   │   ├── aws-lambda-adapter.ts
│   │   ├── cloudrun-adapter.ts
│   │   ├── cloudflare-workers-adapter.ts
│   │   ├── azure-functions-adapter.ts
│   │   ├── docker-adapter.ts
│   │   ├── fly-machines-adapter.ts
│   │   ├── hetzner-cloud-adapter.ts
│   │   ├── kubernetes-adapter.ts
│   │   ├── deno-deploy-adapter.ts
│   │   ├── vercel-adapter.ts
│   │   └── modal-adapter.ts
│   └── utils/
│       ├── command.ts
│       └── validation.ts
└── package.json
```

## Section C: Interfaces
- `WorkerAdapter`: Defines `execute(job: WorkerJob): Promise<WorkerResult>`
- `WorkerJob`: Defines payload for cloud chunks (command, args, metadata, streaming callbacks)
- `WorkerResult`: Defines stdout, stderr, and exit code.
- `JobRepository`: Defines interface for saving, listing, pausing, and deleting job states.
- `ArtifactStorage`: Defines interface for uploading and deleting remote job assets.

## Section D: Cloud Adapters
- `AwsLambdaAdapter`: Invokes AWS Lambda functions.
- `CloudRunAdapter`: Invokes Google Cloud Run services.
- `LocalWorkerAdapter`: Spawns local child processes.
- `CloudflareWorkersAdapter`: Invokes Cloudflare Workers.
- `AzureFunctionsAdapter`: Invokes Azure Functions.
- `DockerAdapter`: Spins up local Docker containers.
- `FlyMachinesAdapter`: Spawns Fly.io machines.
- `HetznerCloudAdapter`: Spawns Hetzner Cloud VMs.
- `KubernetesAdapter`: Dispatches Kubernetes Jobs.
- `DenoDeployAdapter`: Invokes Deno Deploy serverless functions.
- `VercelAdapter`: Invokes Vercel Serverless functions.
- `ModalAdapter`: Invokes Modal serverless Python functions.

## Section E: Integration
- Consumes interfaces from `packages/renderer` to render frames.
- Exported components are utilized by the CLI to manage and execute rendering jobs dynamically.
