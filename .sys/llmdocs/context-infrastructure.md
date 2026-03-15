# Infrastructure Context

This context is automatically generated.

## Section A: Architecture
The infrastructure package provides components for distributed rendering.
- **Workers**: Stateless worker implementations for executing chunks of work.
- **Adapters**: Cloud provider-specific execution wrappers.
- **Orchestrators**: JobManager and JobExecutor to distribute work.
- **Stitchers**: OutputStitcher abstractions to merge chunked videos.

## Section B: File Tree
```
- adapters/
  - aws-adapter.ts
  - azure-functions-adapter.ts
  - cloudflare-workers-adapter.ts
  - cloudrun-adapter.ts
  - deno-deploy-adapter.ts
  - docker-adapter.ts
  - fly-machines-adapter.ts
  - hetzner-cloud-adapter.ts
  - index.ts
  - kubernetes-adapter.ts
  - local-adapter.ts
  - modal-adapter.ts
  - vercel-adapter.ts
- governance/
  - index.ts
  - sync-workspace.ts
- index.ts
- orchestrator/
  - file-job-repository.ts
  - index.ts
  - job-executor.ts
  - job-manager.ts
- stitcher/
  - ffmpeg-stitcher.ts
  - index.ts
- storage/
  - gcs-storage.ts
  - index.ts
  - local-storage.ts
  - s3-storage.ts
- types/
  - adapter.ts
  - index.ts
  - job-spec.ts
  - job-status.ts
  - job.ts
  - storage.ts
- utils/
  - command.ts
  - index.ts
- worker/
  - aws-handler.ts
  - cloudrun-server.ts
  - index.ts
  - render-executor.ts
  - runtime.ts
```

## Section C: Interfaces
```typescript
// packages/infrastructure/src/types/worker.ts
export interface WorkerAdapter {
  execute(job: WorkerJob): Promise<WorkerResult>;
}

// packages/infrastructure/src/types/job.ts
export interface WorkerJob {
  command: string;
  meta: Record<string, any>;
  signal?: AbortSignal;
}

// packages/infrastructure/src/types/adapter.ts
export interface WorkerResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}
```

## Section D: Cloud Adapters
- LocalStorageAdapter
- S3StorageAdapter
- GcsStorageAdapter
- LocalWorkerAdapter
- AwsLambdaAdapter
- CloudRunAdapter
- CloudflareWorkersAdapter
- AzureFunctionsAdapter
- DockerAdapter
- DenoDeployAdapter
- VercelAdapter
- FlyMachinesAdapter
- HetznerCloudAdapter
- KubernetesAdapter
- ModalAdapter

## Section E: Integration
The JobExecutor distributes chunks to a pool of adapters and coordinates the stitching phase via `FfmpegStitcher`. The CLI and Studio components directly use JobManager to orchestrate renderings.

## Packages
packages/infrastructure/src/orchestrator/job-manager.ts
packages/infrastructure/src/orchestrator/job-executor.ts
