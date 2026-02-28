# Infrastructure Context

## A. Architecture

The `@helios-project/infrastructure` package handles distributed execution of render jobs across various environments (Local, AWS Lambda, Google Cloud Run).

- **Stateless Design**: Cloud functions are completely stateless.
- **Worker Adapters**: Abstractions for local and cloud execution.
- **Orchestration**: `JobManager` handles lifecycles; `JobExecutor` processes chunk queues with configurable retry logic, progress reporting, and cancellation via `AbortSignal`. Persistence is supported via `FileJobRepository`.
- **Stitching**: `FfmpegStitcher` safely concatenates chunked videos without re-encoding.

## B. File Tree

```
packages/infrastructure/
├── package.json
├── src/
│   ├── index.ts
│   ├── adapters/
│   │   ├── aws-adapter.ts
│   │   ├── cloudrun-adapter.ts
│   │   └── local-adapter.ts
│   ├── orchestrator/
│   │   ├── file-job-repository.ts
│   │   ├── job-executor.ts
│   │   └── job-manager.ts
│   ├── stitcher/
│   │   └── ffmpeg-stitcher.ts
│   ├── types/
│   │   ├── adapter.ts
│   │   ├── job-spec.ts
│   │   └── job-status.ts
│   ├── utils/
│   │   └── command.ts
│   └── worker/
│       ├── render-executor.ts
│       └── runtime.ts
└── tsconfig.json
```

## C. Interfaces

```typescript
export interface WorkerAdapter {
  execute(job: WorkerJob): Promise<WorkerResult>;
}

export interface WorkerJob {
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  meta?: Record<string, any>;
}

export interface JobExecutionOptions {
  concurrency?: number;
  jobDir?: string;
  merge?: boolean;
  retries?: number;
  retryDelay?: number;
  onProgress?: (completedChunks: number, totalChunks: number) => void;
  signal?: AbortSignal;
}

export class JobManager {
  submitJob(jobSpec: JobSpec, options?: JobExecutionOptions): Promise<string>;
  getJob(id: string): Promise<JobStatus | undefined>;
  listJobs(): Promise<JobStatus[]>;
  cancelJob(id: string): Promise<void>;
}

export class JobExecutor {
  execute(job: JobSpec, options?: JobExecutionOptions): Promise<void>;
}

export class FileJobRepository implements JobRepository {
  constructor(storageDir: string);
  save(job: JobStatus): Promise<void>;
  get(id: string): Promise<JobStatus | undefined>;
  list(): Promise<JobStatus[]>;
}
```

## D. Cloud Adapters

- **LocalWorkerAdapter**: Executes processes locally via `child_process`.
- **AwsLambdaAdapter**: Invokes AWS Lambda functions.
- **CloudRunAdapter**: Invokes Google Cloud Run services via HTTP with OIDC authentication.

## E. Integration

- **Renderer**: Infrastructure uses render output to build chunks.
- **CLI**: The CLI utilizes the job manager and orchestrator to execute distributed jobs locally or in the cloud.
