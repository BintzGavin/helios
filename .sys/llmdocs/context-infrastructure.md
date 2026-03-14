# Infrastructure Context
## Section A: Architecture
The Infrastructure domain manages distributed rendering, orchestration, and worker adapters. It uses the Adapter pattern to integrate with various cloud providers (AWS, GCP, Cloudflare, Modal, etc.) and provides job management, stateless worker execution, and artifact storage.

## Section B: File Tree
```
packages/infrastructure/src
├── adapters
│   ├── aws-adapter.ts
│   ├── azure-functions-adapter.ts
│   ├── cloudflare-workers-adapter.ts
│   ├── cloudrun-adapter.ts
│   ├── deno-deploy-adapter.ts
│   ├── docker-adapter.ts
│   ├── fly-machines-adapter.ts
│   ├── hetzner-cloud-adapter.ts
│   ├── index.ts
│   ├── kubernetes-adapter.ts
│   ├── local-adapter.ts
│   ├── modal-adapter.ts
│   └── vercel-adapter.ts
├── governance
│   ├── index.ts
│   └── sync-workspace.ts
├── index.ts
├── orchestrator
│   ├── file-job-repository.ts
│   ├── index.ts
│   ├── job-executor.ts
│   └── job-manager.ts
├── stitcher
│   ├── ffmpeg-stitcher.ts
│   └── index.ts
├── storage
│   ├── gcs-storage.ts
│   ├── index.ts
│   ├── local-storage.ts
│   └── s3-storage.ts
├── types
│   ├── adapter.ts
│   ├── index.ts
│   ├── job-spec.ts
│   ├── job-status.ts
│   ├── job.ts
│   └── storage.ts
├── utils
│   ├── command.ts
│   └── index.ts
└── worker
    ├── aws-handler.ts
    ├── cloudrun-server.ts
    ├── index.ts
    ├── render-executor.ts
    └── runtime.ts

9 directories, 39 files
```

## Section C: Interfaces
```typescript
export interface WorkerResult
export interface WorkerAdapter
export interface RenderJobChunk
export interface JobSpec
export type JobState = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
export interface JobStatus
export interface JobRepository
export class InMemoryJobRepository implements JobRepository
export interface WorkerJob
export interface ArtifactStorage
```

## Section D: Cloud Adapters
The following adapters exist:
- aws-adapter
- azure-functions-adapter
- cloudflare-workers-adapter
- cloudrun-adapter
- deno-deploy-adapter
- docker-adapter
- fly-machines-adapter
- hetzner-cloud-adapter
- index
- kubernetes-adapter
- local-adapter
- modal-adapter
- vercel-adapter

## Section E: Integration
The CLI integrates with the JobManager for local or remote chunk execution. The Renderer acts as the execution core within workers.
