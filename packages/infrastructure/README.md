# Helios Infrastructure

> Distributed rendering orchestration and cloud execution adapters.

**Status**: Experimental / Incubating

This package provides the infrastructure for distributed rendering, including:
- Cloud adapters (AWS Lambda, Google Cloud Run)
- Worker orchestration
- Job management

## Features

### Quickstart

Here is a quick example of how to configure and submit a distributed rendering job using the local worker adapter (useful for testing). For production, simply swap `LocalWorkerAdapter` with `AwsLambdaAdapter` or another cloud adapter.

```typescript
import {
  JobManager,
  JobExecutor,
  LocalWorkerAdapter,
  FileJobRepository
} from '@helios-project/infrastructure';
import { randomUUID } from 'crypto';

async function quickstart() {
  // 1. Initialize State Repository (stores job status)
  const repository = new FileJobRepository('/tmp/helios-jobs');

  // 2. Initialize Cloud Adapter (executes the actual rendering)
  // For production, replace this with new AwsLambdaAdapter({ ... })
  const workerAdapter = new LocalWorkerAdapter();

  // 3. Initialize Executor (distributes chunks to the adapter)
  const executor = new JobExecutor(workerAdapter);

  // 4. Initialize Job Manager (the orchestrator)
  const jobManager = new JobManager(repository, executor);

  // 5. Submit a Job
  const jobId = await jobManager.submitJob({
    id: randomUUID(),
    metadata: {
      totalFrames: 100,
      fps: 30,
      width: 1920,
      height: 1080,
      duration: 3.33
    },
    chunks: [
      {
        id: 0,
        startFrame: 0,
        frameCount: 100,
        outputFile: '/tmp/helios-output/chunk_0.mp4',
        command: 'node -e "console.log(\'Rendering chunk 0...\')"'
      }
    ],
    mergeCommand: 'node -e "console.log(\'Merging chunks...\')"'
  });

  console.log(`Job submitted! ID: ${jobId}`);

  // 6. Monitor Status
  const status = await jobManager.getJob(jobId);
  console.log(`Current State: ${status?.state}`);
}

quickstart().catch(console.error);
```

### Video Stitching

Video stitching abstractions handle concatenating rendered segments into a single final video without re-encoding. This is crucial for performance after a distributed render.

- **VideoStitcher**: The primary interface for video stitching operations. It takes an array of video chunk paths and an output path, combining them seamlessly.
- **FfmpegStitcher**: An implementation of `VideoStitcher` that leverages `ffmpeg` and the `concat` demuxer. By skipping the re-encoding step and directly copying streams (`-c copy`), it achieves extremely fast merge times, perfectly suited for the final stage of distributed rendering workflows.

### Orchestration & Job Management

The orchestrator module provides robust, fault-tolerant execution of distributed rendering jobs. It manages complex state transitions (Pending → Running → Stitching → Completed/Failed), precise concurrency controls, and comprehensive error recovery to ensure deterministic, consistent results across hundreds of parallel tasks. This abstraction guarantees that regardless of the underlying infrastructure, the orchestration logic remains strictly focused on task distribution and progress tracking.

- **JobManager**: The central orchestrator for distributed job lifecycles. It provides high-level APIs to `submitJob`, `pauseJob`, `resumeJob`, `cancelJob`, or `deleteJob` active rendering jobs. It integrates transparently with `ArtifactStorage` to handle automatic pre-execution asset uploads (`uploadAssetBundle`, `uploadJobSpec`) and post-execution cleanup (`deleteAssetBundle`, `deleteJobSpec`), aggregates execution metrics (task durations, chunk-level logs), and manages distributed state persistence via pluggable `JobRepository` implementations (such as `FileJobRepository`). It also provides telemetry hooks for realtime progress and log streaming. By abstracting away the storage layer and state persistence, `JobManager` serves as the singular entrypoint for higher-level applications like the CLI or Studio.
- **JobExecutor**: The resilient execution engine that distributes isolated rendering chunks across stateless worker nodes via its `execute` method. It interfaces with abstract `WorkerAdapter` instances to support hybrid multi-cloud deployments. It strictly enforces concurrency limits to prevent provider rate-limiting, handles exponential backoff and automated retry for transient network or cloud execution failures, and delegates the final output composition to an injected `VideoStitcher` (e.g., `FfmpegStitcher`) or a custom merge command (`mergeAdapter`) once all chunks succeed. It propagates `AbortSignal` for graceful cancellation.
- **JobExecutionOptions**: The detailed configuration schema governing job execution behavior. It includes fine-grained retry policies (`maxRetries`, `backoffMs`), dynamic chunking strategies, strict worker allocation parameters (`concurrency`), and output artifact requirements (`outputFile`).

### Cloud Execution Adapters

Cloud adapters provide the critical abstraction layer that translates standardized, internal worker jobs into provider-specific cloud compute API invocations (`executeChunk`, `mergeChunks`), enabling truly infrastructure-agnostic distributed rendering. The adapter pattern allows Helios to effortlessly switch between providers or execute in hybrid environments without modifying the core rendering logic or orchestration mechanisms.

- **AwsLambdaAdapter**: Provisions and invokes serverless rendering tasks on AWS Lambda infrastructure. It securely serializes job definitions, manages targeted invocation payloads (including remote job URL and specific chunk indices), rigorously parses Lambda execution responses to ascertain task status, and maps native AWS execution errors seamlessly into the orchestrator's standardized retry framework.
- **CloudRunAdapter**: Provisions and invokes containerized rendering tasks on Google Cloud Run services. It handles secure, authenticated invocations via OIDC ID Tokens using the `google-auth-library`, constructs robust HTTP POST payloads matching the container's expected schema, and maps standard HTTP status codes directly to the framework's internal execution states.
- **AzureFunctionsAdapter**: Provisions and invokes rendering tasks on Azure Functions HTTP triggers using the native `fetch` API. It supports secure, authenticated invocations via `x-functions-key`, constructs JSON payloads containing chunk and job definition metadata, and maps non-200 HTTP responses seamlessly into the execution's deterministic retry framework.
- **LocalWorkerAdapter**: A testing-focused adapter that executes rendering chunks via local child processes, enabling rapid local development and determinism verification without requiring cloud deployments.

### Worker Runtime

The worker runtime abstractions provide the localized, strictly isolated execution environment necessary for processing individual rendering tasks statelessly within diverse, ephemeral cloud compute nodes. This isolation ensures that each worker execution remains idempotent, drawing entirely from remote artifact storage rather than internal persistent state.

- **WorkerRuntime**: The foundational engine deployed deep inside cloud workers. It rigidly enforces the required stateless environment by automatically downloading only the necessary remote assets (`downloadAssetBundle`, `downloadJobSpec`) via an injected `ArtifactStorage` adapter, instantiating the core `RenderExecutor` for localized, deterministic frame rendering (`executeChunk`), and strictly managing isolated local temporary filesystems to prevent cross-invocation pollution or state leakage. It is designed to be fully cloud-agnostic, expecting specific handlers to wrap it for targeted cloud environments.
- **createAwsHandler**: A dedicated factory function that constructs a production-ready AWS Lambda handler (`aws-handler.ts`). It wraps the generic `WorkerRuntime` inside an asynchronous execution shell perfectly mapped to the AWS Lambda Node.js signature, effectively translating API Gateway requests or direct AWS SDK invocation events into standard, executable job chunks.
- **createCloudRunServer**: A dedicated factory function that constructs a production-ready Google Cloud Run HTTP server (`cloudrun-server.ts`). It initializes an Express or Node.js native server explicitly designed to receive incoming POST requests containing job payloads, securely routing them to the internal `WorkerRuntime` for execution within isolated containerized environments.

### Artifact Storage

Artifact storage is responsible for managing job assets during distributed cloud executions.
The following adapters are provided:
- **Local Storage**: `LocalStorageAdapter` for local execution and testing.
- **AWS S3**: `S3StorageAdapter` provides native cloud integration for AWS S3.
- **Google Cloud Storage (GCS)**: `GcsStorageAdapter` provides native cloud integration for GCS.

### Governance Tooling

Governance tooling provides utilities to enforce rules and maintain project integrity, adhering strictly to the "DEPENDENCY GOVERNANCE" law defined in the project's architectural guidelines. The guidelines state that agents are prohibited from manually synchronizing internal package versions, and that internal version propagation is handled by deterministic release tooling.

- **Workspace Dependency Synchronizer (`syncWorkspaceDependencies`)**: A bounded utility to automatically synchronize monorepo workspace package versions (e.g., dependencies on `@helios-project/*`) within constrained directories (like test fixtures or temporary build paths). This ensures consistent versions are used during test processes and operations without requiring manual agent intervention or breaking strict cross-package domain boundaries.
