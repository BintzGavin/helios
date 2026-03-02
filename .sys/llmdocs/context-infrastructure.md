# Infrastructure Domain Context

## Section A: Architecture
The `@helios-project/infrastructure` package orchestrates distributed rendering across various compute environments (e.g., local child processes, Google Cloud Run, AWS Lambda). It embraces a stateless worker design, where frames can be independently rendered via a consistent command interface.

The orchestration lifecycle involves:
1. `JobManager`: Manages active rendering jobs. Employs `JobRepository` for state persistence and delegates execution to `JobExecutor`. Supports pausing, resuming, and deleting jobs. Integrates `ArtifactStorage` to automatically upload local job assets before distributed cloud executions begin.
2. `JobExecutor`: Takes a `JobSpec` and executes discrete rendering chunks via a `WorkerAdapter`. It gathers metrics, logs, limits concurrency, and provides `AbortSignal` implementation for graceful cancellation.
3. `WorkerAdapter`: Adapters implementing `execute(job: WorkerJob): Promise<WorkerResult>`. Current implementations include Local (child process execution), AWS Lambda, and Cloud Run.
4. `VideoStitcher`: A specialized entity (`FfmpegStitcher`) designed to securely concatenate rendered chunk artifacts seamlessly without re-encoding to assemble the final output video.

## Section B: File Tree
```
packages/infrastructure/
├── src/
│   ├── index.ts
│   ├── adapters/
│   │   ├── aws-adapter.ts
│   │   ├── cloudrun-adapter.ts
│   │   ├── index.ts
│   │   └── local-adapter.ts
│   ├── orchestrator/
│   │   ├── file-job-repository.ts
│   │   ├── index.ts
│   │   ├── job-executor.ts
│   │   └── job-manager.ts
│   ├── stitcher/
│   │   ├── ffmpeg-stitcher.ts
│   │   └── index.ts
│   ├── storage/
│   │   ├── index.ts
│   │   └── local-storage.ts
│   ├── types/
│   │   ├── adapter.ts
│   │   ├── index.ts
│   │   ├── job-spec.ts
│   │   ├── orchestrator.ts
│   │   └── storage.ts
│   ├── utils/
│   │   └── command.ts
│   └── worker/
│       ├── aws-handler.ts
│       ├── cloudrun-server.ts
│       ├── index.ts
│       ├── render-executor.ts
│       └── runtime.ts
└── tests/
    ├── e2e/
    │   └── deterministic-seeking.test.ts
    ├── adapters/
    │   └── local-adapter.test.ts
    ├── orchestrator/
    │   ├── file-job-repository.test.ts
    │   └── job-manager.test.ts
    ├── storage/
    │   └── local-storage.test.ts
    ├── worker/
    │   ├── aws-handler.test.ts
    │   └── cloudrun-server.test.ts
    ├── aws-adapter.test.ts
    ├── cloudrun-adapter.test.ts
    ├── command.test.ts
    ├── job-executor.test.ts
    ├── placeholder.test.ts
    ├── render-executor.test.ts
    ├── stitcher.test.ts
    └── worker-runtime.test.ts
```

## Section C: Interfaces

```typescript
// Shared Types (types/job.ts)
export interface WorkerJob {
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  meta?: Record<string, any>;
  signal?: AbortSignal;
  onStdout?: (data: string) => void;
  onStderr?: (data: string) => void;
}

// Orchestrator Execution Options (orchestrator/job-executor.ts)
export interface JobExecutionOptions {
  completedChunkIds?: number[];
  concurrency?: number;
  jobDir?: string;
  merge?: boolean;
  retries?: number;
  retryDelay?: number;
  onProgress?: (completedChunks: number, totalChunks: number) => void;
  onChunkComplete?: (chunkId: number, result: WorkerResult) => void | Promise<void>;
  onChunkStdout?: (chunkId: number, data: string) => void;
  onChunkStderr?: (chunkId: number, data: string) => void;
  signal?: AbortSignal;
  mergeAdapter?: WorkerAdapter;
  stitcher?: VideoStitcher;
  outputFile?: string;
}

export interface WorkerResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export interface WorkerAdapter {
  execute(job: WorkerJob): Promise<WorkerResult>;
}

// Job Orchestration (types/job-spec.ts)
export interface RenderJobChunk {
  id: number;
  command: string;
  outputFile: string;
}

export interface JobSpec {
  id: string;
  assetsUrl?: string;
  chunks: RenderJobChunk[];
  mergeCommand?: string;
}

// Orchestrator State Persistence (types/orchestrator.ts)
export type JobState = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';

export interface JobStatus {
  id: string;
  spec: JobSpec;
  status: JobStatus;
  createdAt: number;
  updatedAt: number;
  completedChunks: number;
  totalChunks: number;
  error?: string;
  result?: string;
  metrics?: {
    totalDurationMs: number;
  };
  chunkLogs?: Record<number, { stdout: string; stderr: string; durationMs: number }>;
}

export interface JobRepository {
  save(state: JobState): Promise<void>;
  get(id: string): Promise<JobState | null>;
  list(): Promise<JobState[]>;
  delete(id: string): Promise<void>;
}

// Storage Abstraction (types/storage.ts)
export interface ArtifactStorage {
  uploadAssetBundle(jobId: string, localDir: string): Promise<string>;
  downloadAssetBundle(jobId: string, remoteUrl: string, targetDir: string): Promise<void>;
  deleteAssetBundle(jobId: string, remoteUrl: string): Promise<void>;
}

// Video Stitching (stitcher/index.ts)
export interface VideoStitcher {
  stitch(inputFiles: string[], outputFile: string): Promise<void>;
}

// Worker Interfaces (worker/index.ts)
export interface AwsHandlerConfig {
  workspaceDir?: string;
  storage?: ArtifactStorage;
}

export interface CloudRunServerConfig {
  workspaceDir?: string;
  port?: number | string;
  storage?: ArtifactStorage;
}
```

## Section D: Cloud Adapters
- `LocalWorkerAdapter`: Invokes chunk commands via native `node:child_process.spawn`. Highly used for local rendering or integration/E2E testing (e.g., deterministic frame verifications).
- `AwsLambdaAdapter`: Translates `WorkerJob` requests to stateless chunk requests passed to AWS Lambda functions utilizing the payload structure via `@aws-sdk/client-lambda`. Wait state natively blocks until job execution completes. Supports dynamic `jobDefUrl` per execution when provided via `job.meta.jobDefUrl`.
- `CloudRunAdapter`: Proxies HTTP POST requests using `google-auth-library` to an OIDC-secured Google Cloud Run endpoint, delegating discrete execution of rendering chunk pipelines on demand. Supports dynamic `jobDefUrl` per execution.

## Section E: Integration
The infrastructure package acts as an orchestration intermediary. It expects deterministic render targets formatted by the `CLI` or `Studio` to build a `JobSpec`. Specifically:
1. It does not parse the actual React rendering directly; it spawns CLI executions (`npx helios render ...`).
2. Cloud adapters serve to "bridge" local orchestrator logic to ephemeral functions, requiring worker-side deployment entrypoints (`WorkerRuntime` + `CloudRun/AWS Lambda Server Handlers`) to download job contexts and process rendering autonomously using the system's `RenderExecutor`.
