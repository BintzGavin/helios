# Helios Infrastructure

> Distributed rendering orchestration and cloud execution adapters.

**Status**: Experimental / Incubating

This package provides the infrastructure for distributed rendering, including:
- Cloud adapters (AWS Lambda, Google Cloud Run)
- Worker orchestration
- Job management

## Features

### Video Stitching

Video stitching abstractions handle concatenating rendered segments into a single final video without re-encoding. This is crucial for performance after a distributed render.

- **VideoStitcher**: The primary interface for video stitching operations. It takes an array of video chunk paths and an output path, combining them seamlessly.
- **FfmpegStitcher**: An implementation of `VideoStitcher` that leverages `ffmpeg` and the `concat` demuxer. By skipping the re-encoding step and directly copying streams (`-c copy`), it achieves extremely fast merge times, perfectly suited for the final stage of distributed rendering workflows.

### Orchestration & Job Management

The orchestrator module provides robust, fault-tolerant execution of distributed rendering jobs. It manages state transitions, concurrency, and error recovery to ensure consistent results across parallel tasks.

- **JobManager**: The central orchestrator for job lifecycles. It provides APIs to submit, pause, resume, cancel, or delete rendering jobs. It integrates transparently with `ArtifactStorage` to handle automatic asset upload/download, aggregates execution metrics (durations, chunk logs), and manages persistence via pluggable `JobRepository` implementations.
- **JobExecutor**: The execution engine that distributes rendering chunks across worker nodes. It interfaces with abstract `WorkerAdapter` instances to support hybrid deployments, enforces strict concurrency limits to prevent rate-limiting, handles automated backoff and retry for transient network/cloud failures, and delegates final output composition to an injected `VideoStitcher` or custom merge command.
- **JobExecutionOptions**: The configuration schema governing job execution behavior, including fine-grained retry policies, chunking strategies, worker allocation parameters, and output artifact requirements.

### Cloud Execution Adapters

Cloud adapters provide the critical abstraction layer translating standardized worker jobs into provider-specific API invocations, enabling truly agnostic distributed rendering.

- **AwsLambdaAdapter**: Provisions and invokes rendering tasks on AWS Lambda infrastructure. It serializes job definitions, manages invocation payloads (job URL, chunk index), parses Lambda responses for execution status, and maps native AWS errors into the orchestrator's retry framework.
- **CloudRunAdapter**: Provisions and invokes rendering tasks on Google Cloud Run containerized services. It handles secure invocation via OIDC ID Tokens using the `google-auth-library`, constructs HTTP POST payloads matching the container's expected schema, and maps standard HTTP status codes to framework execution states.

### Worker Runtime

The worker runtime abstractions provide the localized execution environment necessary for processing individual rendering tasks statelessly within diverse, ephemeral cloud compute nodes.

- **WorkerRuntime**: The foundational engine deployed inside cloud workers. It provides the required stateless environment by automatically downloading necessary remote assets via an injected `ArtifactStorage` adapter, instantiating the core `RenderExecutor` for localized frame rendering, and managing local temporary filesystem state to prevent cross-invocation pollution.
- **createAwsHandler**: A factory function that constructs a production-ready AWS Lambda handler (`aws-handler.ts`). It wraps the generic `WorkerRuntime` inside an asynchronous execution shell that maps perfectly to the AWS Lambda Node.js signature, translating API Gateway or direct invocation events into standard job chunks.
- **createCloudRunServer**: A factory function that constructs a production-ready Google Cloud Run HTTP server (`cloudrun-server.ts`). It initializes an Express or Node.js native server designed to receive incoming POST requests containing job payloads, routing them to the internal `WorkerRuntime` for execution within containerized environments.

### Artifact Storage

Artifact storage is responsible for managing job assets during distributed cloud executions.
The following adapters are provided:
- **Local Storage**: `LocalStorageAdapter` for local execution and testing.
- **AWS S3**: `S3StorageAdapter` provides native cloud integration for AWS S3.
- **Google Cloud Storage (GCS)**: `GcsStorageAdapter` provides native cloud integration for GCS.

### Governance Tooling

Governance tooling provides utilities to enforce rules and maintain project integrity, adhering strictly to the "DEPENDENCY GOVERNANCE" law defined in the project's architectural guidelines. The guidelines state that agents are prohibited from manually synchronizing internal package versions, and that internal version propagation is handled by deterministic release tooling.

- **Workspace Dependency Synchronizer (`syncWorkspaceDependencies`)**: A bounded utility to automatically synchronize monorepo workspace package versions (e.g., dependencies on `@helios-project/*`) within constrained directories (like test fixtures or temporary build paths). This ensures consistent versions are used during test processes and operations without requiring manual agent intervention or breaking strict cross-package domain boundaries.
