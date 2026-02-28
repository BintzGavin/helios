# Infrastructure Context

## A. Architecture

The `@helios-project/infrastructure` package provides the orchestration and execution capabilities for distributed rendering of Helios compositions. It enables splitting rendering tasks into smaller chunks, running them concurrently across various compute environments (local, serverless, cloud), and stitching the results back together.

**Key Components:**
- **JobManager**: The primary entrypoint for lifecycle operations (create, run, cancel, list, get). Uses `JobRepository` to persist state and `JobExecutor` to run jobs.
- **JobExecutor**: The workhorse that takes a `JobSpec`, splits it into chunks, dispatches work to a `WorkerAdapter`, manages retries and concurrency, and coordinates the final merge step (using a `VideoStitcher` or a dedicated merge command).
- **WorkerAdapters**: Cloud-agnostic interfaces that translate chunk execution requests into platform-specific invocations.
- **RenderExecutor**: The underlying Node.js runtime component that takes a `JobSpec` chunk, executes the appropriate CLI rendering command (`node cli.js --headless ...`), and returns the chunk result.
- **WorkerRuntime**: The runtime that bridges a stateless worker environment (e.g. Lambda, Cloud Run) to the `RenderExecutor` by resolving `JobSpec` references (URL/file).
- **Cloud Worker Entrypoints**: Ready-to-use handlers for AWS Lambda (`aws-handler.ts`) and Google Cloud Run (`cloudrun-server.ts`) that instantiate `WorkerRuntime` to execute jobs.

## B. File Tree

```
packages/infrastructure/
├── package.json
├── src/
│   ├── adapters/
│   │   ├── aws-adapter.ts
│   │   ├── cloudrun-adapter.ts
│   │   ├── index.ts
│   │   └── local-adapter.ts
│   ├── index.ts
│   ├── orchestrator/
│   │   ├── file-job-repository.ts
│   │   ├── index.ts
│   │   ├── job-executor.ts
│   │   └── job-manager.ts
│   ├── stitcher/
│   │   ├── ffmpeg-stitcher.ts
│   │   └── index.ts
│   ├── types/
│   │   ├── adapter.ts
│   │   ├── index.ts
│   │   └── job.ts
│   └── worker/
│       ├── aws-handler.ts
│       ├── cloudrun-server.ts
│       ├── index.ts
│       ├── render-executor.ts
│       └── runtime.ts
└── tsconfig.json
```

## C. Interfaces

```typescript
// Shared Types
export interface WorkerJob {
  id: string;
  command: string;
  meta?: Record<string, any>; // Used to pass jobDefUrl, chunkId to adapters
}

export interface WorkerResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  outputFile?: string;
  durationMs: number;
}

export interface WorkerAdapter {
  execute(job: WorkerJob): Promise<WorkerResult>;
}

export interface VideoStitcher {
  stitch(inputs: string[], output: string): Promise<WorkerResult>;
}

export interface JobExecutionOptions {
  workerAdapter?: WorkerAdapter;
  mergeAdapter?: WorkerAdapter;
  stitcher?: VideoStitcher;
  outputFile?: string;
  concurrency?: number;
  retries?: number;
  retryDelay?: number;
  onProgress?: (progress: { chunkId: number; totalChunks: number; percent: number }) => void;
  signal?: AbortSignal;
}

export interface JobRepository {
  save(job: JobState): Promise<void>;
  get(jobId: string): Promise<JobState | null>;
  list(): Promise<JobState[]>;
  delete(jobId: string): Promise<void>;
}

// Orchestrator
export class JobManager {
  constructor(options?: { repository?: JobRepository; defaultConcurrency?: number });
  async createJob(spec: JobSpec): Promise<JobState>;
  async runJob(jobId: string, options?: JobExecutionOptions): Promise<JobState>;
  async getJob(jobId: string): Promise<JobState | null>;
  async listJobs(): Promise<JobState[]>;
  async cancelJob(jobId: string): Promise<JobState>;
}

export class JobExecutor {
  constructor(jobSpec: JobSpec, options: JobExecutionOptions = {});
  async execute(): Promise<WorkerResult>;
}

// Workers
export class RenderExecutor {
  constructor(workspaceDir: string);
  async executeChunk(jobSpec: JobSpec, chunkId: number): Promise<WorkerResult>;
  async executeMerge(jobSpec: JobSpec): Promise<WorkerResult>;
}

export class WorkerRuntime {
  constructor(config: { workspaceDir: string });
  async run(jobPath: string, chunkId: number): Promise<WorkerResult>;
}
```

## D. Cloud Adapters and Entrypoints

### AWS Lambda
- **Adapter**: `AwsLambdaAdapter(config: AwsLambdaAdapterConfig)` invokes Lambda functions synchronously (`RequestResponse`) using `@aws-sdk/client-lambda`. Passes `jobPath` and `chunkIndex`.
- **Entrypoint**: `createAwsHandler(config: AwsHandlerConfig)` returns an async function compatible with the Node.js Lambda runtime. It parses the incoming event, initializes `WorkerRuntime`, and formats the response for the adapter.

### Google Cloud Run
- **Adapter**: `CloudRunAdapter(config: CloudRunAdapterConfig)` invokes Cloud Run services via HTTP POST. Authenticates automatically using OIDC ID Tokens via `google-auth-library`.
- **Entrypoint**: `createCloudRunServer(config: CloudRunServerConfig)` returns an HTTP server (using `node:http`) that listens for POST requests, initializes `WorkerRuntime`, and returns the expected JSON response.

### Local Execution
- **Adapter**: `LocalWorkerAdapter` executes commands as local child processes (`child_process.spawn`). Used for local testing and synchronous execution.

## E. Integration

- **Renderer**: Infrastructure depends on `@helios-project/renderer` conceptually to define the render commands (e.g. `npx helios render --chunk...`), which the `RenderExecutor` ultimately runs via `child_process`.
- **CLI**: The `@helios-project/cli` uses `JobManager` to coordinate local rendering workflows (`helios render --emit-job` followed by execution) and configures cloud adapters when deploying to AWS or GCP (`helios job run --adapter=aws`).
