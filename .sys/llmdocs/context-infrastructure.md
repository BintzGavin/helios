# Context: Infrastructure

## Section A: Architecture
The infrastructure architecture manages distributed rendering through three main layers:
1. **Orchestration**: `JobManager` and `JobExecutor` manage job lifecycle, concurrency, retries, chunk progress, metrics, and artifact management.
2. **Workers**: Stateless worker abstractions (`WorkerRuntime`) execute deterministic job chunks, either locally or remotely.
3. **Cloud Adapters**: Interface implementations (`AwsLambdaAdapter`, `CloudRunAdapter`, etc.) bridge worker chunks to specific cloud execution environments. Storage adapters (`S3StorageAdapter`, `GcsStorageAdapter`, `LocalStorageAdapter`) bridge job assets to cloud storage.

## Section B: File Tree
```
packages/infrastructure/
├── README.md
├── package.json
├── src
│   ├── adapters
│   │   ├── aws-adapter.ts
│   │   ├── cloudrun-adapter.ts
│   │   ├── index.ts
│   │   └── local-adapter.ts
│   ├── governance
│   │   ├── index.ts
│   │   └── sync-workspace.ts
│   ├── index.ts
│   ├── orchestrator
│   │   ├── file-job-repository.ts
│   │   ├── index.ts
│   │   ├── job-executor.ts
│   │   └── job-manager.ts
│   ├── stitcher
│   │   ├── ffmpeg-stitcher.ts
│   │   └── index.ts
│   ├── storage
│   │   ├── gcs-storage.ts
│   │   ├── index.ts
│   │   ├── local-storage.ts
│   │   └── s3-storage.ts
│   ├── types
│   │   ├── adapter.ts
│   │   ├── index.ts
│   │   ├── job-spec.ts
│   │   ├── job-status.ts
│   │   └── storage.ts
│   ├── utils
│   │   ├── command.ts
│   │   └── index.ts
│   └── worker
│       ├── aws-handler.ts
│       ├── cloudrun-server.ts
│       ├── index.ts
│       ├── render-executor.ts
│       └── runtime.ts
```

## Section C: Interfaces

### Worker Adapter
```typescript
interface WorkerAdapter {
  execute(job: WorkerJob): Promise<WorkerResult>;
}
```

### Orchestration
```typescript
class JobManager {
  submitJob(jobSpec: JobSpec, options?: JobExecutionOptions): Promise<string>;
  getJob(id: string): Promise<JobStatus | undefined>;
  listJobs(): Promise<JobStatus[]>;
  cancelJob(id: string): Promise<void>;
  pauseJob(id: string): Promise<void>;
  resumeJob(id: string, options?: JobExecutionOptions): Promise<void>;
  deleteJob(id: string): Promise<void>;
}

class JobExecutor {
  execute(job: JobSpec, options: JobExecutionOptions = {}): Promise<void>;
}
```

### Artifact Storage
```typescript
interface ArtifactStorage {
  uploadAssetBundle(jobId: string, localDir: string): Promise<string>;
  downloadAssetBundle(jobId: string, remoteUrl: string, localDir: string): Promise<void>;
  deleteAssetBundle(jobId: string, remoteUrl: string): Promise<void>;
  uploadJobSpec(jobId: string, spec: JobSpec): Promise<string>;
  deleteJobSpec(jobId: string, remoteUrl: string): Promise<void>;
}
```

## Section D: Cloud Adapters

- **AWS Lambda**: `AwsLambdaAdapter` orchestrates chunks to Lambda. `createAwsHandler` exposes `WorkerRuntime` for Lambda deployment.
- **Google Cloud Run**: `CloudRunAdapter` orchestrates chunks to Cloud Run via OIDC. `createCloudRunServer` exposes `WorkerRuntime` as an HTTP POST server.
- **AWS S3**: `S3StorageAdapter` provides artifact storage on S3.
- **Google Cloud Storage (GCS)**: `GcsStorageAdapter` provides artifact storage on GCS.

## Section E: Integration

The Infrastructure layer integrates with:
- **Renderer**: Orchestrates rendering via CLI execution.
- **CLI**: Consumes the Orchestrator (`JobManager`, `JobExecutor`) and Governance Tooling to launch distributed rendering jobs and enforce monorepo checks.