# Context: @helios-project/infrastructure (v0.6.0)

## Section A: Architecture
The `packages/infrastructure` package is responsible for the distributed rendering execution of Helios jobs. It abstracts away the execution environment (e.g., local, AWS Lambda, Google Cloud Run) behind a common `WorkerAdapter` interface.
- **Workers**: Execute individual chunk rendering tasks in an isolated, stateless manner.
- **Orchestrators**: Specifically `JobExecutor`, coordinates the execution of chunks using a worker adapter. It handles concurrency, failing fast, retries, and merging. `JobManager` manages the overall lifecycle of a job, tracking its state in a repository.
- **Adapters**: Concrete implementations of `WorkerAdapter`, such as `LocalWorkerAdapter`, translate generic execution commands into environment-specific API calls.

## Section B: File Tree
```
packages/infrastructure/
├── src/
│   ├── index.ts
│   ├── types/
│   │   ├── adapter.ts
│   │   ├── job-spec.ts
│   │   └── job-status.ts
│   ├── adapters/
│   │   └── local-adapter.ts
│   ├── orchestrator/
│   │   ├── job-executor.ts
│   │   └── job-manager.ts
│   ├── stitcher/
│   │   └── ffmpeg-stitcher.ts
│   ├── utils/
│   │   └── command.ts
│   └── worker/
│       ├── render-executor.ts
│       └── runtime.ts
├── tests/
│   ├── adapters/
│   ├── orchestrator/
│   ├── worker-runtime.test.ts
│   ├── render-executor.test.ts
│   ├── job-manager.test.ts
│   ├── job-executor.test.ts
│   └── ...
├── package.json
└── tsconfig.json
```

## Section C: Interfaces
- **WorkerAdapter**: `execute(job: WorkerJob): Promise<WorkerResult>`
- **JobExecutor**: `execute(job: JobSpec, options?: JobExecutionOptions): Promise<void>`
- **JobManager**: `submitJob(jobSpec: JobSpec, options?: JobExecutionOptions): Promise<string>`, `getJob(id: string): Promise<JobStatus | undefined>`
- **JobExecutionOptions**: `concurrency?: number`, `merge?: boolean`, `retries?: number`, `retryDelay?: number`, `onProgress?: (completedChunks: number, totalChunks: number) => void`

## Section D: Cloud Adapters
- **LocalWorkerAdapter**: Uses `child_process.spawn` to run commands locally. Ideal for testing and single-machine renders.
- **AWS Lambda**: Submits synchronous executions to AWS Lambda (implemented).
- **Google Cloud Run**: Submits HTTP requests to Google Cloud Run Jobs (implemented).

## Section E: Integration
- The CLI depends on the `JobExecutor` to execute rendering tasks either locally or via a cloud adapter.
- The RenderExecutor module communicates with the core renderer framework to generate frames via a subprocess.
