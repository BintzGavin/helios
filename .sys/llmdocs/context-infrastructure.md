# Infrastructure Context

## Section A: Architecture
The infrastructure package provides cloud execution adapters and orchestration logic for distributed rendering.
Key components include:
- **Workers**: Stateless worker implementations for rendering frames.
- **Orchestrators**: Job managers and schedulers for distributing work across workers.
- **Adapters**: Cloud-specific adapters for executing workers (AWS Lambda, Google Cloud Run) and managing artifact storage (Local, S3, GCS).
- **Stitchers**: Output stitchers for concatenating rendered frames into final artifacts.

## Section B: File Tree
```
packages/infrastructure/src
├── adapters
│   ├── aws-adapter.ts
│   ├── cloudrun-adapter.ts
│   ├── index.ts
│   └── local-adapter.ts
├── governance
│   ├── index.ts
│   └── sync-workspace.ts
├── index.ts
├── orchestrator
│   ├── file-job-repository.ts
│   ├── index.ts
│   ├── job-executor.ts
│   └── job-manager.ts
├── stitcher
│   ├── ffmpeg-stitcher.ts
│   └── index.ts
├── storage
│   ├── gcs-storage.ts
│   ├── index.ts
│   ├── local-storage.ts
│   └── s3-storage.ts
├── types
│   ├── adapter.ts
│   ├── index.ts
│   ├── job-spec.ts
│   ├── job-status.ts
│   ├── job.ts
│   └── storage.ts
├── utils
│   ├── command.ts
│   └── index.ts
└── worker
    ├── aws-handler.ts
    ├── cloudrun-server.ts
    ├── index.ts
    ├── render-executor.ts
    └── runtime.ts
```

## Section C: Interfaces
- `Worker`: Interface for executing rendering tasks.
- `JobManager`: Interface for managing job lifecycles.
- `StorageAdapter`: Interface for uploading and downloading job assets.

## Section D: Cloud Adapters
- **AWS Lambda**: `LambdaAdapter` for executing stateless workers on AWS Lambda.
- **Google Cloud Run**: `CloudRunAdapter` for executing stateless workers on Google Cloud Run.
- **Local Storage**: `LocalStorageAdapter` for managing job assets locally.
- **AWS S3**: `S3StorageAdapter` for managing job assets on AWS S3.
- **Google Cloud Storage**: `GcsStorageAdapter` for managing job assets on Google Cloud Storage.

## Section E: Integration
The infrastructure package integrates with the renderer package for frame generation and the CLI package for user interactions. Storage adapters are configured to manage job assets during distributed cloud executions.
