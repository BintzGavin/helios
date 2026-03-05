# Infrastructure Package Context

## Section A: Architecture
The `infrastructure` package manages the distributed cloud rendering execution of Helios. The architecture is composed of:
- **Cloud Adapters**: Interfaces that bridge the gap between Helios core orchestrator and the execution environments (e.g. AWS Lambda, Google Cloud Run).
- **Stateless Workers**: Handlers that execute render chunks independent of one another.
- **Orchestration**: The `JobManager` and `JobExecutor` coordinate distributed tasks, schedule execution chunks, and aggregate status.
- **Artifact Storage**: Interfaces for storing output bundles, chunks, and metadata persistently on specific cloud environments (S3, GCS, Local File System).
- **Stitcher**: Merges output streams to generate the final media representation after rendering tasks complete.

## Section B: File Tree
```
packages/infrastructure/
├── package.json
├── src
│   ├── index.ts
│   ├── adapters
│   │   ├── index.ts
│   │   ├── aws-adapter.ts
│   │   ├── cloudrun-adapter.ts
│   │   └── local-adapter.ts
│   ├── governance
│   │   ├── index.ts
│   │   └── sync-workspace.ts
│   ├── orchestrator
│   │   ├── index.ts
│   │   ├── file-job-repository.ts
│   │   ├── job-executor.ts
│   │   └── job-manager.ts
│   ├── stitcher
│   │   ├── index.ts
│   │   └── ffmpeg-stitcher.ts
│   ├── storage
│   │   ├── index.ts
│   │   ├── gcs-storage.ts
│   │   ├── local-storage.ts
│   │   └── s3-storage.ts
│   ├── types
│   │   ├── index.ts
│   │   ├── adapter.ts
│   │   ├── job-spec.ts
│   │   ├── job-status.ts
│   │   ├── job.ts
│   │   └── storage.ts
│   ├── utils
│   │   ├── index.ts
│   │   └── command.ts
│   └── worker
│       ├── index.ts
│       ├── aws-handler.ts
│       ├── cloudrun-server.ts
│       ├── render-executor.ts
│       └── runtime.ts
├── tests
│   └── benchmarks
│       ├── gcs-storage.bench.ts
│       ├── job-manager.bench.ts
│       ├── local-storage.bench.ts
│       └── s3-storage.bench.ts
└── tsconfig.json
```

## Section C: Interfaces

### `WorkerJob` (from `packages/infrastructure/src/types/job.ts`)
```typescript
export interface WorkerJob {
  /** The command to execute */
  command: string;
  /** Arguments to pass to the command */
  args?: string[];
  /** Environment variables to set for the process */
  env?: Record<string, string>;
  /** Current working directory for the process */
  cwd?: string;
  /** Timeout in milliseconds after which the process will be killed */
  timeout?: number;
  /** Additional metadata for adapters (e.g., chunk ID) */
  meta?: Record<string, any>;
  /** Optional AbortSignal to gracefully cancel the job execution */
  signal?: AbortSignal;
  /** Optional callback for real-time stdout streaming */
  onStdout?: (data: string) => void;
  /** Optional callback for real-time stderr streaming */
  onStderr?: (data: string) => void;
}
```

### `WorkerAdapter` (from `packages/infrastructure/src/types/adapter.ts`)
```typescript
export interface WorkerResult {
  /** Exit code of the process */
  exitCode: number;
  /** Standard output of the process */
  stdout: string;
  /** Standard error of the process */
  stderr: string;
  /** Duration of execution in milliseconds */
  durationMs: number;
}

export interface WorkerAdapter {
  /**
   * Executes a job in the target environment.
   * @param job The job specification to execute
   * @returns A promise that resolves with the execution result
   */
  execute(job: WorkerJob): Promise<WorkerResult>;
}
```

### `ArtifactStorage` (from `packages/infrastructure/src/types/storage.ts`)
```typescript
export interface ArtifactStorage {
  uploadAssetBundle(jobId: string, localDir: string): Promise<string>;
  downloadAssetBundle(jobId: string, remoteUrl: string, targetDir: string): Promise<void>;
  deleteAssetBundle(jobId: string, remoteUrl: string): Promise<void>;
  uploadJobSpec(jobId: string, spec: import('./job-spec.js').JobSpec): Promise<string>;
  deleteJobSpec(jobId: string, remoteUrl: string): Promise<void>;
}
```

## Section D: Cloud Adapters
- `aws-adapter.ts`: Facilitates scheduling execution on AWS Lambda.
- `cloudrun-adapter.ts`: Facilitates scheduling execution on Google Cloud Run.
- `local-adapter.ts`: Facilitates scheduling execution on the local host (typically for debugging).

## Section E: Integration
The Infrastructure module provides the backend to scale distributed processing. The Helios `CLI` instantiates jobs using the `JobManager` and injects specific `WorkerAdapter` implementations and `ArtifactStorage` variants based on user inputs or deployment specs. Workers then execute isolated subsets of frames utilizing APIs implemented in the `Renderer`. Finally, output is joined by a `Stitcher` mechanism.