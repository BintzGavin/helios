# INFRASTRUCTURE DOMAIN CONTEXT
**Version**: 0.54.24

## A. Architecture

The Infrastructure domain provides cloud execution abstractions, stateless workers, and orchestration logic for distributed rendering tasks within the Helios project.

- **Workers**: Provide isolated, stateless execution environments (e.g., AWS Lambda, Google Cloud Run) that fetch remote jobs, execute chunks, and return deterministic results.
- **Orchestration**: Manages job state transitions, chunk distribution, concurrency control, retry policies, and telemetry. Ensures failure recovery and coordinates with workers and storage.
- **Adapters**: Cloud-agnostic implementations that abstract away provider-specific APIs for compute and storage.
- **Storage**: Manages remote job assets (JobSpec, media) and generated outputs across cloud providers (AWS S3, Google Cloud Storage, Local).

## B. File Tree

```
packages/infrastructure/
├── README.md
├── package.json
├── src/
│   ├── governance/
│   │   ├── index.ts
│   │   └── sync-workspace.ts
│   ├── index.ts
│   ├── orchestrator/
│   │   ├── file-job-repository.ts
│   │   ├── in-memory-job-repository.ts
│   │   ├── index.ts
│   │   ├── job-executor.ts
│   │   └── job-manager.ts
│   ├── stitcher/
│   │   ├── ffmpeg-stitcher.ts
│   │   └── index.ts
│   ├── storage/
│   │   ├── gcs-storage.ts
│   │   ├── index.ts
│   │   ├── local-storage.ts
│   │   └── s3-storage.ts
│   ├── types/
│   │   ├── index.ts
│   │   ├── job-spec.ts
│   │   ├── job-status.ts
│   │   ├── orchestrator.ts
│   │   ├── storage.ts
│   │   └── worker.ts
│   ├── utils/
│   │   ├── command.ts
│   │   ├── error-mapping.ts
│   │   └── index.ts
│   └── worker/
│       ├── adapters/
│       │   ├── aws-lambda.ts
│       │   ├── azure-functions.ts
│       │   ├── cloudflare-workers.ts
│       │   ├── cloudrun.ts
│       │   ├── deno-deploy.ts
│       │   ├── docker.ts
│       │   ├── fly-machines.ts
│       │   ├── hetzner-cloud.ts
│       │   ├── index.ts
│       │   ├── kubernetes.ts
│       │   ├── local.ts
│       │   ├── modal.ts
│       │   └── vercel.ts
│       ├── aws-handler.ts
│       ├── cloudrun-server.ts
│       ├── index.ts
│       ├── render-executor.ts
│       └── worker-runtime.ts
├── tsconfig.json
└── vitest.config.ts
```

## C. Interfaces

- `WorkerAdapter`: Contract for compute execution (`executeChunk`, `mergeChunks`).
- `ArtifactStorage`: Contract for managing remote state (`uploadAssetBundle`, `downloadAssetBundle`, `uploadJobSpec`, `deleteAssetBundle`, `deleteJobSpec`).
- `JobRepository`: State persistence layer (`save`, `get`, `list`, `delete`).
- `JobManager`: High-level orchestrator (`submitJob`, `pauseJob`, `resumeJob`, `cancelJob`, `deleteJob`).
- `JobExecutor`: Fault-tolerant execution engine mapping jobs to chunks via `WorkerAdapter`.
- `WorkerRuntime`: Executes a given task statelessly via `RenderExecutor`, utilizing `ArtifactStorage` for remote inputs.
- `VideoStitcher`: Defines interfaces for stitching multiple chunks. Used post-orchestration to generate the final artifact.

## D. Cloud Adapters

- **Compute**:
  - `AwsLambdaAdapter`: Invokes serverless tasks on AWS Lambda.
  - `CloudRunAdapter`: Invokes containerized tasks on Google Cloud Run via OIDC.
  - `AzureFunctionsAdapter`: Invokes tasks on Azure Functions via HTTP POST.
  - `CloudflareWorkersAdapter`: Invokes edge-rendered tasks on Cloudflare Workers.
  - `FlyMachinesAdapter`: Invokes tasks on Fly.io using the Machines API via HTTP POST.
  - `KubernetesAdapter`: Executes rendering jobs across a Kubernetes cluster.
  - `DockerAdapter`: Executes tasks via local Docker child processes.
  - `ModalAdapter`: Executes jobs on Modal via endpoint URL.
  - `DenoDeployAdapter`: Executes tasks on Deno Deploy via native fetch.
  - `VercelAdapter`: Executes chunks on Vercel Serverless Functions.
  - `HetznerCloudAdapter`: Executes rendering tasks on Hetzner Cloud VMs.
  - `LocalWorkerAdapter`: Executes chunks via local child processes (for testing/development).

- **Storage**:
  - `S3StorageAdapter`: Amazon S3 integration.
  - `GcsStorageAdapter`: Google Cloud Storage integration.
  - `LocalStorageAdapter`: Local file system mapping.

## E. Integration

- The **Orchestrator** coordinates task execution across the system. It delegates granular work chunks to **Worker Adapters** configured with the desired infrastructure.
- The **CLI** and **Studio** invoke `JobManager.submitJob()` to queue renders.
- Distributed worker entry points (e.g., `createAwsHandler`, `createCloudRunServer`) wrap `WorkerRuntime` and delegate to `RenderExecutor` for localized processing utilizing `@helios-project/renderer`.
