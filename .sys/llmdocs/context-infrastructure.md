# Infrastructure Context

## A. Architecture

The `packages/infrastructure` package provides the foundation for distributed rendering in Helios. It orchestrates rendering jobs across various compute environments (Local, AWS Lambda, Google Cloud Run) using a stateless worker model.

**Key Components:**
- **JobManager**: The higher-level component that orchestrates job lifecycle state tracking, persistence via `JobRepository`, and delegates execution.
- **JobExecutor**: The central orchestrator that manages the lifecycle of a render job execution. It splits jobs into chunks, distributes them to workers via adapters, handles retries, and invokes the stitcher for final assembly.
- **WorkerAdapter**: An abstraction layer that allows the orchestrator to interact with different compute providers uniformly.
- **WorkerRuntime**: The entry point for the worker process running in the cloud. It receives a job specification, renders the assigned frames using the `RenderExecutor`, and reports status.
- **RenderExecutor**: Executes the actual rendering commands (e.g., launching a browser or ffmpeg process).
- **FfmpegStitcher**: Concatenates individual video segments produced by workers into a final output file.

## B. File Tree

```
packages/infrastructure/
├── src/
│   ├── index.ts                    # Public exports
│   ├── types/
│   │   ├── index.ts                # Shared types
│   │   ├── worker.ts               # Worker interfaces (WorkerJob, WorkerResult)
│   │   ├── job-spec.ts             # Job specification interfaces
│   │   ├── job-status.ts           # Job status tracking interfaces
│   │   └── adapter.ts              # WorkerAdapter interface
│   ├── worker/
│   │   ├── index.ts
│   │   ├── runtime.ts              # Worker runtime logic
│   │   └── render-executor.ts      # Frame rendering execution
│   ├── orchestrator/
│   │   ├── index.ts
│   │   ├── job-executor.ts         # Job orchestration and retry logic
│   │   └── job-manager.ts          # Job lifecycle and state manager
│   ├── stitcher/
│   │   ├── index.ts
│   │   └── ffmpeg-stitcher.ts      # FFmpeg concatenation
│   ├── adapters/
│   │   ├── index.ts
│   │   ├── local-adapter.ts        # Local execution (for testing/dev)
│   │   ├── aws-adapter.ts          # AWS Lambda execution
│   │   └── cloudrun-adapter.ts     # Google Cloud Run execution
│   └── utils/
│       └── command.ts              # Command parsing utilities
└── tests/                          # Unit and integration tests
```

## C. Interfaces

### JobManager
```typescript
class JobManager {
  constructor(repository: JobRepository, executor: JobExecutor);
  submitJob(jobSpec: JobSpec, options?: JobExecutionOptions): Promise<string>;
  getJob(id: string): Promise<JobStatus | undefined>;
}
```

### JobExecutor
```typescript
interface JobExecutionOptions {
  concurrency?: number;
  jobDir?: string;
  merge?: boolean;
  retries?: number;      // Number of retries for failed chunks
  retryDelay?: number;   // Delay in ms between retries
}

class JobExecutor {
  constructor(adapter: WorkerAdapter);
  execute(job: JobSpec, options?: JobExecutionOptions): Promise<void>;
}
```

### WorkerAdapter
```typescript
interface WorkerAdapter {
  execute(job: WorkerJob): Promise<WorkerResult>;
}
```

### VideoStitcher
```typescript
interface VideoStitcher {
  stitch(segments: string[], outputFile: string): Promise<void>;
}
```

## D. Cloud Adapters

### LocalAdapter
Executes workers as child processes on the local machine. Useful for development and debugging.

### AwsLambdaAdapter
Invokes AWS Lambda functions to process chunks. Requires `aws-sdk`.

### CloudRunAdapter
Invokes Google Cloud Run services via HTTP. Uses `google-auth-library` for authentication.

## E. Integration

- **CLI**: The CLI uses `JobExecutor` to run render commands, selecting the appropriate adapter based on user configuration.
- **Renderer**: The infrastructure package relies on the renderer (conceptually) to produce the actual frames, though it treats the render command as a black box execution.
