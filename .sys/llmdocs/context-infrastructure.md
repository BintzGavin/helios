# Infrastructure Context

## Section A: Architecture
The `@helios-project/infrastructure` package handles distributed rendering orchestration and cloud execution for Helios. It defines the core abstractions for running rendering jobs across multiple workers, handling the lifecycle, scheduling, state management, output stitching, and robust transient failure retries.

### Core Components
1. **Adapters**: Concrete implementations of the `WorkerAdapter` interface. Adapters bridge the `JobExecutor` to physical execution environments. Cloud adapters (`AwsLambdaAdapter`, `CloudRunAdapter`) support dynamic scaling, deterministic remote execution, and dynamically routing executions to different deployment targets via properties like `jobDefUrl`. Local adapter (`LocalWorkerAdapter`) allows simulated multi-worker concurrency on a single machine.
2. **Orchestrator**: High-level job lifecycle management components, including `JobManager` (handles pause, resume, cancel, and complete transitions) and `JobRepository` (abstracts persistence of `JobState`).
3. **Storage**: Implementations of the `ArtifactStorage` interface (e.g., `LocalStorageAdapter`, `S3StorageAdapter`, `GcsStorageAdapter`) that securely handle the uploading, downloading, and cleanup of job asset bundles required for remote cloud executions.
4. **Worker**: Runtime execution components (`WorkerRuntime`, `createAwsHandler`, `createCloudRunServer`) for processing rendering chunks dynamically. It securely accesses distributed files via injected `ArtifactStorage`.
5. **Stitcher**: Output merging strategies (e.g., `FfmpegStitcher`) for concatenating distributed video chunks.
6. **Governance**: Workspace administration and safety enforcement tools (e.g., `syncWorkspaceDependencies`).

## Section B: File Tree
```
packages/infrastructure/
├── src/
│   ├── index.ts
│   ├── adapters/
│   │   ├── index.ts
│   │   ├── local-adapter.ts
│   │   ├── aws-adapter.ts
│   │   └── cloudrun-adapter.ts
│   ├── governance/
│   │   ├── index.ts
│   │   └── sync-workspace.ts
│   ├── orchestrator/
│   │   ├── index.ts
│   │   ├── file-job-repository.ts
│   │   ├── job-executor.ts
│   │   ├── job-manager.ts
│   │   └── scheduler.ts
│   ├── stitcher/
│   │   ├── index.ts
│   │   └── ffmpeg-stitcher.ts
│   ├── storage/
│   │   ├── index.ts
│   │   ├── local-storage.ts
│   │   ├── s3-storage.ts
│   │   └── gcs-storage.ts
│   ├── types/
│   │   ├── adapter.ts
│   │   ├── index.ts
│   │   ├── job-spec.ts
│   │   ├── job.ts
│   │   ├── orchestrator.ts
│   │   ├── storage.ts
│   │   └── worker.ts
│   └── worker/
│       ├── aws-handler.ts
│       ├── cloudrun-server.ts
│       ├── index.ts
│       └── runtime.ts
├── tests/
│   ├── adapters/
│   │   └── local-adapter.test.ts
│   ├── e2e/
│   │   └── deterministic-seeking.test.ts
│   ├── governance/
│   │   └── sync-workspace.test.ts
│   ├── orchestrator/
│   │   ├── file-job-repository.test.ts
│   │   └── job-manager.test.ts
│   ├── storage/
│   │   ├── local-storage.test.ts
│   │   ├── s3-storage.test.ts
│   │   └── gcs-storage.test.ts
│   ├── worker/
│   │   ├── aws-handler.test.ts
│   │   └── cloudrun-server.test.ts
│   ├── aws-adapter.test.ts
│   ├── cloudrun-adapter.test.ts
│   ├── command.test.ts
│   ├── job-executor.test.ts
│   ├── job-manager.test.ts
│   ├── placeholder.test.ts
│   ├── render-executor.test.ts
│   ├── stitcher.test.ts
│   └── worker-runtime.test.ts
```

## Section C: Interfaces

### Orchestrator Interfaces
```typescript
interface JobManager {
  createJob(spec: JobSpec): Promise<JobState>;
  getJob(id: string): Promise<JobState | null>;
  listJobs(): Promise<JobState[]>;
  pauseJob(id: string): Promise<void>;
  resumeJob(id: string): Promise<void>;
  cancelJob(id: string): Promise<void>;
  deleteJob(id: string): Promise<void>;
  runJob(id: string, options?: JobExecutionOptions): Promise<void>;
}

interface JobRepository {
  get(id: string): Promise<JobState | null>;
  list(): Promise<JobState[]>;
  save(state: JobState): Promise<void>;
  delete(id: string): Promise<void>;
}

interface JobExecutor {
  execute(spec: JobSpec, adapter: WorkerAdapter, options: JobExecutionOptions): Promise<WorkerResult>;
}

interface JobExecutionOptions {
  concurrency?: number;
  maxRetries?: number;
  completedChunkIds?: number[];
  stitcher?: OutputStitcher;
  outputFile?: string;
  mergeCommand?: string;
  mergeAdapter?: WorkerAdapter;
  onProgress?: (progress: number) => void;
  onChunkComplete?: (chunkIndex: number, result: WorkerResult) => void;
  onChunkStdout?: (chunkIndex: number, chunk: Buffer | string) => void;
  onChunkStderr?: (chunkIndex: number, chunk: Buffer | string) => void;
}
```

### Storage Interfaces
```typescript
interface ArtifactStorage {
  uploadAssetBundle(jobId: string, localDir: string): Promise<string>;
  downloadAssetBundle(jobId: string, remoteUrl: string, targetDir: string): Promise<void>;
  deleteAssetBundle(jobId: string, remoteUrl: string): Promise<void>;
}
```

### Adapter and Worker Interfaces
```typescript
interface WorkerAdapter {
  executeChunk(job: WorkerJob, signal?: AbortSignal): Promise<WorkerResult>;
}

interface WorkerJob {
  id: string;
  jobPath: string;
  chunkIndex: number;
  totalChunks: number;
  meta?: Record<string, string>;
  onStdout?: (chunk: Buffer | string) => void;
  onStderr?: (chunk: Buffer | string) => void;
}

interface WorkerResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  exitCode?: number;
}
```

### Worker Runtime Interfaces
```typescript
interface WorkerRuntimeOptions {
  jobPath: string;
  chunkIndex: number;
  assetsUrl?: string;
  storage?: ArtifactStorage;
}

interface WorkerRuntime {
  executeChunk(options: WorkerRuntimeOptions): Promise<WorkerResult>;
}
```

## Section D: Cloud Adapters
- **AwsLambdaAdapter**: Executes rendering chunks dynamically on AWS Lambda. Supports reading `job.meta.jobDefUrl` or constructor configuration (`functionName`).
- **CloudRunAdapter**: Executes rendering chunks via an HTTP POST request to a Google Cloud Run service (`serviceUrl`). Supports identity-token based authentication via `google-auth-library`.
- **LocalStorageAdapter**: Simulates remote upload/download/delete logic securely mapped to a local bounded directory to verify distributed state behavior offline.
- **S3StorageAdapter**: Validates remote URL schemes, handles reliable chunked uploading, listing, and bulk-deleting of assets purely through the standard AWS S3 REST APIs (`@aws-sdk/client-s3`).
- **GcsStorageAdapter**: Validates remote URL schemes, handles reliable chunked uploading, listing, and bulk-deleting of assets via the official Google Cloud Storage SDK (`@google-cloud/storage`).

## Section E: Integration
- The CLI (`packages/cli`) requires explicit installation of `@helios-project/infrastructure` to utilize advanced remote rendering commands (e.g. `--adapter="lambda"` or `--storage="s3"`).
- Cloud adapters provide stateless environments. Execution relies on `ArtifactStorage` to map a remote `assetsUrl` locally before `WorkerRuntime` delegates exact frame production to `packages/renderer`.
