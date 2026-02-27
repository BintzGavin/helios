# INFRASTRUCTURE CONTEXT
**Domain**: `packages/infrastructure`
**Version**: 0.2.0

## A. Architecture

The Infrastructure domain handles the execution of rendering jobs across different environments (Local, AWS Lambda, Google Cloud Run). It uses an **Adapter Pattern** to abstract the execution details from the orchestration logic.

### Core Concepts

*   **Worker Adapter**: A unified interface (`WorkerAdapter`) for executing jobs.
*   **Stateless Worker**: Workers are designed to be stateless, receiving all necessary context in the job specification.

## B. File Tree

```
packages/infrastructure/src/
├── adapters/
│   ├── index.ts                # Adapter exports
│   └── local-adapter.ts        # Local process execution adapter
├── orchestrator/               # (Planned) Job lifecycle management
├── stitcher/                   # (Planned) FFmpeg concatenation
├── types/
│   ├── index.ts                # Shared type exports
│   ├── adapter.ts              # WorkerAdapter & WorkerResult interfaces
│   └── job.ts                  # WorkerJob interface
├── utils/                      # (Planned) Shared utilities
├── worker/
│   └── index.ts                # Re-exports types (legacy/compatibility)
└── index.ts                    # Public API
```

## C. Interfaces

### WorkerJob

Defines the unit of work to be executed.

```typescript
interface WorkerJob {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  timeout?: number;
}
```

### WorkerResult

The outcome of a job execution.

```typescript
interface WorkerResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}
```

### WorkerAdapter

The contract for execution environments.

```typescript
interface WorkerAdapter {
  execute(job: WorkerJob): Promise<WorkerResult>;
}
```

## D. Cloud Adapters

### LocalWorkerAdapter

Executes jobs as local child processes using Node.js `spawn`.

*   **Usage**: primarily for local development and testing.
*   **Security**: Forces `shell: false` to prevent injection.
*   **Features**: Supports timeouts, environment variable injection, and output capturing.

## E. Integration

*   **Renderer**: Will consume `WorkerAdapter` to offload rendering tasks.
*   **CLI**: Will use `LocalWorkerAdapter` for `helios render` and cloud adapters for `helios deploy`.
