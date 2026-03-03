# Helios Infrastructure

> Distributed rendering orchestration and cloud execution adapters.

**Status**: Experimental / Incubating

This package provides the infrastructure for distributed rendering, including:
- Cloud adapters (AWS Lambda, Google Cloud Run)
- Worker orchestration
- Job management

## Features

### Orchestration & Job Management

The orchestrator module is responsible for managing the lifecycle of distributed rendering jobs, tracking progress, and executing tasks efficiently.

- **JobManager**: The primary entry point for managing rendering jobs. It allows you to submit new jobs, pause, resume, cancel, or delete existing ones. It handles automatically uploading local job assets before distributed cloud executions begin (when provided an `ArtifactStorage` instance) and stores metrics such as total duration and logs per chunk.
- **JobExecutor**: Coordinates the execution of individual job chunks using a specified `WorkerAdapter`. It supports concurrency limits, automated retries for transient failures, and handles merging the completed chunks either via a provided command or a `VideoStitcher`.
- **JobExecutionOptions**: Configuration options passed to `JobManager` and `JobExecutor` to control concurrency, chunk execution logic, retry behavior, and merging strategies.

### Cloud Execution Adapters

Cloud adapters translate worker jobs into provider-specific invocations for scalable remote rendering.

- **AwsLambdaAdapter**: Executes rendering jobs on AWS Lambda. It invokes the Lambda function with the necessary job details (e.g., job definition URL, chunk index) and parses the response.
- **CloudRunAdapter**: Executes rendering jobs on Google Cloud Run. It authenticates using OIDC ID Tokens via `google-auth-library` and sends a POST request to the service with the job payload.

### Worker Runtime

The worker runtime abstractions facilitate processing rendering tasks across diverse cloud environments in a stateless manner.

- **WorkerRuntime**: The core engine for executing job chunks. It downloads remote job assets via an `ArtifactStorage` adapter, instantiates a `RenderExecutor`, and processes the specified chunk, ensuring a stateless execution environment.
- **createAwsHandler**: A helper function to create an AWS Lambda handler (`aws-handler.ts`). It wraps the `WorkerRuntime` into an async function compatible with the AWS Lambda Node.js runtime signature, allowing seamless deployment to AWS.
- **createCloudRunServer**: A helper function to create a Google Cloud Run HTTP server (`cloudrun-server.ts`). It spins up an HTTP server that listens for POST requests containing job payloads and processes them using the `WorkerRuntime`, suitable for containerized deployment on GCP.

### Artifact Storage

Artifact storage is responsible for managing job assets during distributed cloud executions.
The following adapters are provided:
- **Local Storage**: `LocalStorageAdapter` for local execution and testing.
- **AWS S3**: `S3StorageAdapter` provides native cloud integration for AWS S3.
- **Google Cloud Storage (GCS)**: `GcsStorageAdapter` provides native cloud integration for GCS.

### Governance Tooling

Governance tooling provides utilities to enforce rules and maintain project integrity.
- **Workspace Dependency Synchronizer**: Utilities to synchronize monorepo workspace dependencies, ensuring consistent versions are used during test processes and operations without breaking package boundaries.
