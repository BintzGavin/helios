# CONTEXT: INFRASTRUCTURE
**Owner**: `@helios-project/infrastructure`
**Purpose**: Handles distributed rendering, cloud execution, and worker orchestration.

## A. Architecture

The infrastructure package uses a **Stateless Worker** architecture to enable scalable distributed rendering across different cloud providers (AWS Lambda, Google Cloud Run) and local environments.

### Core Concepts

1.  **Orchestrator**: Manages the job lifecycle, splits work into chunks, and aggregates results.
2.  **Worker**: A stateless unit that executes a specific task (e.g., rendering a frame range).
3.  **Adapter**: Abstraction layer for different execution environments (Local, AWS, GCP).
4.  **Stitcher**: Combines partial outputs (video segments) into a final artifact.

## B. File Tree

```
packages/infrastructure/
├── src/
│   ├── index.ts                    # Public exports
│   ├── types/
│   │   ├── index.ts
│   │   ├── worker.ts               # WorkerJob, WorkerResult
│   │   └── adapter.ts              # WorkerAdapter interface
│   ├── adapters/
│   │   ├── index.ts
│   │   └── local-adapter.ts        # Local process execution
│   └── stitcher/
│       ├── index.ts
│       └── ffmpeg-stitcher.ts      # Concat demuxer implementation
└── tests/
    └── stitcher.test.ts
```

## C. Interfaces

### WorkerAdapter
Defines how to execute a job in a specific environment.

```typescript
interface WorkerAdapter {
  execute(job: WorkerJob): Promise<WorkerResult>;
}
```

### VideoStitcher
Defines how to combine video segments.

```typescript
interface VideoStitcher {
  stitch(inputs: string[], output: string): Promise<void>;
}
```

### WorkerJob
The payload sent to a worker.

```typescript
interface WorkerJob {
  command: string;
  args: string[];
  env?: Record<string, string>;
}
```

## D. Cloud Adapters

| Adapter | Status | Description |
| :--- | :--- | :--- |
| `LocalWorkerAdapter` | ✅ Ready | Executes jobs as child processes locally. |
| `AwsLambdaAdapter` | 🚧 Planned | Invokes AWS Lambda functions. |
| `CloudRunAdapter` | 🚧 Planned | Invokes Google Cloud Run services. |

## E. Integration

- **Renderer**: The `RenderOrchestrator` uses `WorkerAdapter` to dispatch rendering tasks.
- **CLI**: The `helios job` command configures the appropriate adapter based on user flags.
- **Stitcher**: The `FfmpegStitcher` uses a `WorkerAdapter` (typically local) to run the `ffmpeg` concat command.
