# Infrastructure Domain Context

## Section A: Architecture
The infrastructure package provides orchestration and execution logic for distributed rendering jobs.

- **Workers**: Execute individual rendering chunks in a stateless manner (`WorkerRuntime`, `WorkerAdapter`).
- **Orchestrators**: Manage the job lifecycle, splitting jobs into chunks, distributing work, handling retries, and aggregating results (`JobManager`, `JobExecutor`).
- **Cloud Adapters**: Interface with cloud providers (e.g., AWS Lambda, GCP Cloud Run) for scalable execution (`AwsLambdaAdapter`, `CloudRunAdapter`).
- **Storage Adapters**: Provide standardized interfaces for uploading and downloading job assets and outputs to cloud storage solutions (e.g., `S3StorageAdapter`, `GcsStorageAdapter`, `LocalStorageAdapter`).
- **Governance Tooling**: Utilities to enforce monorepo workspace constraints during operations and test runs without breaking domain boundaries (e.g. `syncWorkspaceDependencies`).

## Section B: File Tree
```
packages/infrastructure/
├── examples/
│   ├── aws-lambda.ts
│   ├── cloudrun.ts
│   ├── ffmpeg-stitcher.ts
│   ├── gcs-storage.ts
│   ├── job-executor-standalone.ts
│   ├── local-storage.ts
│   ├── s3-storage.ts
│   └── worker-runtime.ts
├── src/
│   ├── index.ts
│   ├── types/
│   │   ├── adapter.ts
│   │   ├── command.ts
│   │   ├── job-status.ts
│   │   ├── render.ts
│   │   ├── stitcher.ts
│   │   └── worker.ts
│   ├── orchestrator/
│   │   ├── file-job-repository.ts
│   │   ├── index.ts
│   │   ├── job-executor.ts
│   │   └── job-manager.ts
│   ├── worker/
│   │   ├── aws-handler.ts
│   │   ├── cloudrun-server.ts
│   │   ├── index.ts
│   │   ├── render-executor.ts
│   │   └── worker-runtime.ts
│   ├── adapters/
│   │   ├── aws-adapter.ts
│   │   ├── cloudrun-adapter.ts
│   │   ├── index.ts
│   │   └── local-adapter.ts
│   ├── storage/
│   │   ├── gcs-storage.ts
│   │   ├── index.ts
│   │   ├── local-storage.ts
│   │   └── s3-storage.ts
│   ├── stitcher/
│   │   ├── ffmpeg-stitcher.ts
│   │   └── index.ts
│   ├── governance/
│   │   ├── index.ts
│   │   └── sync-workspace.ts
│   └── utils/
│       └── command.ts
├── tests/
│   ├── benchmarks/
│   │   ├── job-manager.bench.ts
│   │   └── local-storage.bench.ts
```

## Section C: Interfaces
- `WorkerAdapter`: `execute(chunk: RenderChunk, options?: ExecutionOptions, signal?: AbortSignal): Promise<WorkerResult>`
- `ArtifactStorage`: `uploadJobAssets(jobPath: string, bucketUri: string): Promise<void>`, `downloadJobAssets(bucketUri: string, downloadPath: string): Promise<void>`, `uploadOutput(filePath: string, bucketUri: string): Promise<void>`, `deleteAssetBundle(bucketUri: string): Promise<void>`
- `JobManager`: `createJob(...)`, `runJob(...)`, `pauseJob(...)`, `resumeJob(...)`, `cancelJob(...)`, `listJobs()`, `deleteJob(...)`
- `JobExecutor`: `executeJob(chunks: RenderChunk[], options: JobExecutionOptions)`
- `VideoStitcher`: `stitch(videoPaths: string[], outputPath: string, signal?: AbortSignal): Promise<void>`

## Section D: Cloud Adapters
- **AWS Lambda**: Submits chunks to an AWS Lambda execution environment.
- **GCP Cloud Run**: Submits chunks to a GCP Cloud Run service execution environment.

## Section E: Integration
- Consumed by `CLI` for executing remote jobs via `JobManager`.
- Exposes generated runtime entrypoints (`createAwsHandler`, `createCloudRunServer`) for platform deployment.
- Uses `ArtifactStorage` interfaces to transparently load remote job assets from platforms like S3 and GCS prior to render execution.

## Benchmark Support
The package includes automated IO benchmarks that can be run with `vitest bench` to evaluate the performance of core adapters and orchestrators like `LocalStorageAdapter`, `S3StorageAdapter`, and `GcsStorageAdapter`.
