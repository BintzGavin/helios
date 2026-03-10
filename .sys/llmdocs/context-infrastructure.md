# Infrastructure Package Context

## Section A: Architecture
The `infrastructure` package manages the distributed cloud rendering execution of Helios. The architecture is composed of:
- **Cloud Adapters**: Interfaces that bridge the gap between Helios core orchestrator and the execution environments (e.g. AWS Lambda, Google Cloud Run, Cloudflare Workers).
- **Stateless Workers**: Handlers that execute render chunks independent of one another.
- **Orchestration**: The `JobManager` and `JobExecutor` coordinate distributed tasks, schedule execution chunks, and aggregate status.
- **Artifact Storage**: Interfaces for storing output bundles, chunks, and metadata persistently on specific cloud environments (S3, GCS, Local File System).
- **Stitcher**: Merges output streams to generate the final media representation after rendering tasks complete.

## Section B: File Tree
```
packages/infrastructure/examples
├── aws-lambda.ts
├── cloudflare-workers-adapter-example.ts
├── cloudrun.ts
├── ffmpeg-stitcher.ts
├── file-job-repository.ts
├── gcs-storage.ts
├── job-executor-standalone.ts
├── job-manager-standalone.ts
├── local-adapter.ts
├── local-storage.ts
├── render-executor.ts
├── s3-storage.ts
├── sync-workspace.ts
└── worker-runtime.ts

packages/infrastructure/tests
├── adapters
│   ├── cloudflare-workers-adapter.test.ts
│   └── local-adapter.test.ts
├── aws-adapter.test.ts
├── benchmarks
│   ├── aws-adapter.bench.ts
│   ├── aws-handler.bench.ts
│   ├── cloudflare-workers-adapter.bench.ts
│   ├── cloudrun-adapter.bench.ts
│   ├── cloudrun-server.bench.ts
│   ├── command.bench.ts
│   ├── ffmpeg-stitcher.bench.ts
│   ├── file-job-repository.bench.ts
│   ├── gcs-storage.bench.ts
│   ├── job-executor.bench.ts
│   ├── job-manager.bench.ts
│   ├── local-adapter.bench.ts
│   ├── local-storage.bench.ts
│   ├── render-executor.bench.ts
│   ├── s3-storage.bench.ts
│   ├── sync-workspace.bench.ts
│   └── worker-runtime.bench.ts
├── cloudrun-adapter.test.ts
├── command.test.ts
├── e2e
│   ├── deterministic-seeking.test.ts
│   ├── job-manager-resiliency.test.ts
│   └── resiliency.test.ts
├── governance
│   └── sync-workspace.test.ts
├── job-executor.test.ts
├── job-manager.test.ts
├── orchestrator
│   ├── file-job-repository-resiliency.test.ts
│   ├── file-job-repository.test.ts
│   └── job-manager.test.ts
├── placeholder.test.ts
├── render-executor.test.ts
├── stitcher.test.ts
├── storage
│   ├── gcs-storage.test.ts
│   ├── local-storage.test.ts
│   └── s3-storage.test.ts
├── utils
│   └── command.test.ts
├── worker
│   ├── aws-handler-resiliency.test.ts
│   ├── aws-handler.test.ts
│   └── cloudrun-server.test.ts
└── worker-runtime.test.ts
```

## Section C: Interfaces
The `packages/infrastructure/src/types/index.ts` file acts as the public API definition layer.

- `WorkerAdapter`: Standard execution interface (`execute(job: WorkerJob)`)
- `ArtifactStorage`: Interface for managing remote job bundles (`uploadAssetBundle`, `downloadAssetBundle`, etc).
- `JobManager`: Manager for distributed job state.
- `Stitcher`: Joins final outputs into a single video file.

## Section D: Cloud Adapters
- `aws-adapter.ts`: Facilitates scheduling execution on AWS Lambda.
- `cloudrun-adapter.ts`: Facilitates scheduling execution on Google Cloud Run.
- `cloudflare-workers-adapter.ts`: Facilitates scheduling execution on Cloudflare Workers using the native fetch API.
- `azure-functions-adapter.ts`: Facilitates scheduling execution on Azure Functions using the native fetch API.
- `local-adapter.ts`: Facilitates scheduling execution on the local host (typically for debugging).

## Section E: Integration
The Infrastructure module provides the backend to scale distributed processing. The Helios `CLI` instantiates jobs using the `JobManager` and injects specific `WorkerAdapter` implementations and `ArtifactStorage` variants based on user inputs or deployment specs. Workers then execute isolated subsets of frames utilizing APIs implemented in the `Renderer`. Finally, output is joined by a `Stitcher` mechanism.
