# Infrastructure Context

## A. Architecture

The `@helios-project/infrastructure` package provides distributed rendering orchestration and cloud execution adapters for Helios. The architecture is composed of:

- **Worker Adapters**: Cloud-agnostic interfaces (`WorkerAdapter`) with provider-specific implementations (`LocalWorkerAdapter`, `AwsLambdaAdapter`, `CloudRunAdapter`) to execute stateless rendering chunks.
- **Worker Runtime**: A standardized runtime (`WorkerRuntime`) that orchestrates fetching `JobSpec` assets, delegating chunk execution to `RenderExecutor`, and managing error boundaries for cloud workers.
- **Render Executor**: A local command runner (`RenderExecutor`) that spawns child processes to execute the rendering logic (e.g., calling `@helios-project/cli` or `@helios-project/renderer`).
- **Orchestration**: The `JobManager` manages the overall job lifecycle, tracking active jobs via `AbortController`s and persisting state via a `JobRepository`. The `JobExecutor` handles concurrent execution of `JobSpec` chunks across workers, offering robust retry logic, chunk failure isolation, and detailed progress tracking (`onProgress`, `onChunkComplete`).
- **Stitcher**: `VideoStitcher` interfaces (like `FfmpegStitcher`) for concatenating individual rendered video segments into a final output file without re-encoding.
- **Utilities**: Shared utilities like `parseCommand` for tokenizing shell commands properly (respecting quotes).

## B. File Tree

```
packages/infrastructure/
├── package.json
├── src/
│   ├── index.ts
│   ├── adapters/
│   │   ├── aws-lambda-adapter.ts
│   │   ├── cloudrun-adapter.ts
│   │   ├── index.ts
│   │   └── local-worker-adapter.ts
│   ├── orchestrator/
│   │   ├── file-job-repository.ts
│   │   ├── index.ts
│   │   ├── job-executor.ts
│   │   └── job-manager.ts
│   ├── stitcher/
│   │   ├── ffmpeg-stitcher.ts
│   │   └── index.ts
│   ├── types/
│   │   └── index.ts
│   ├── utils/
│   │   ├── command.ts
│   │   └── retry.ts
│   └── worker/
│       ├── index.ts
│       ├── render-executor.ts
│       └── runtime.ts
└── tests/
    ├── adapters/
    │   └── local-adapter.test.ts
    ├── aws-adapter.test.ts
    ├── cloudrun-adapter.test.ts
    ├── command.test.ts
    ├── job-executor.test.ts
    ├── job-manager.test.ts
    ├── orchestrator/
    │   ├── file-job-repository.test.ts
    │   └── job-manager.test.ts
    ├── placeholder.test.ts
    ├── render-executor.test.ts
    ├── stitcher.test.ts
    ├── worker-runtime.test.ts
    └── worker/
        ├── aws-handler.test.ts
        └── cloudrun-server.test.ts
```

## C. Interfaces

```typescript
export interface WorkerJob {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  timeout?: number;
  meta?: Record<string, any>;
  signal?: AbortSignal;
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

export interface JobExecutionOptions {
  concurrency?: number;
  jobDir?: string;
  merge?: boolean;
  retries?: number;
  retryDelay?: number;
  onProgress?: (completedChunks: number, totalChunks: number) => void;
  onChunkComplete?: (chunkId: number, result: WorkerResult) => void | Promise<void>;
  signal?: AbortSignal;
  mergeAdapter?: WorkerAdapter;
  stitcher?: VideoStitcher;
  outputFile?: string;
}
```

## D. Cloud Adapters

- **LocalWorkerAdapter**: Executes jobs locally using `WorkerRuntime`, intended for testing and local distributed rendering.
- **AwsLambdaAdapter**: Invokes AWS Lambda functions to execute chunks, translating `WorkerJob` to Lambda payloads.
- **CloudRunAdapter**: Invokes Google Cloud Run services to execute chunks via HTTP POST requests, handling OIDC authentication.

## E. Integration

- **Renderer**: Infrastructure leverages rendering interfaces and commands, eventually executing tasks spawned via `@helios-project/renderer` or CLI.
- **CLI**: The CLI utilizes Infrastructure's orchestration tools to manage and run distributed rendering jobs (`JobManager`, `JobExecutor`).
