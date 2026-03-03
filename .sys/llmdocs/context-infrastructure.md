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
packages/infrastructure/
├── README.md
├── src/
│   ├── index.ts
│   ├── types/
│   │   ├── worker.ts
│   │   ├── job.ts
│   │   └── adapter.ts
│   ├── worker/
│   │   ├── index.ts
│   │   ├── stateless-worker.ts
│   │   └── frame-worker.ts
│   ├── orchestrator/
│   │   ├── index.ts
│   │   ├── job-manager.ts
│   │   └── scheduler.ts
│   ├── stitcher/
│   │   ├── index.ts
│   │   └── concat-stitcher.ts
│   ├── adapters/
│   │   ├── index.ts
│   │   ├── local-adapter.ts
│   │   ├── lambda-adapter.ts
│   │   └── cloudrun-adapter.ts
│   ├── storage/
│   │   ├── index.ts
│   │   ├── local-storage.ts
│   │   ├── s3-storage.ts
│   │   └── gcs-storage.ts
│   ├── governance/
│   │   ├── index.ts
│   │   └── sync-workspace.ts
│   └── utils/
│       ├── retry.ts
│       └── validation.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts
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
