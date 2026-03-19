# Infrastructure Context
## Section A: Architecture
The infrastructure package provides cloud execution, stateless workers, and deployment tooling for distributed video rendering.
- **Workers**: Execute rendering chunks deterministically and statelessly.
- **Orchestrators**: Manage job lifecycles and schedule chunks across workers.
- **Adapters**: Cloud-agnostic interfaces with specific implementations for AWS Lambda, Google Cloud Run, Vercel, Fly Machines, etc.
- **Storage**: Artifact storage implementations (GCS, S3, Local) for bundles and job specs. GCS utilizes concurrent uploads.

## Section B: File Tree
```
packages/infrastructure/
├── src/
│   ├── index.ts
│   ├── types/
│   ├── worker/
│   ├── orchestrator/
│   ├── stitcher/
│   ├── adapters/
│   ├── storage/
│   └── utils/
├── tests/
├── package.json
└── tsconfig.json
```

## Section C: Interfaces
- `WorkerAdapter`: `execute(job: WorkerJob): Promise<WorkerResult>`
- `JobExecutor`: `execute(jobSpec: JobSpec, options: JobExecutionOptions): Promise<void>`
- `JobManager`: manages job creation, status, pause, resume, cancel, delete.
- `ArtifactStorage`: methods for uploading/downloading asset bundles and job specs.
- `VideoStitcher`: `stitch(inputs: string[], output: string): Promise<void>`

## Section D: Cloud Adapters
Available adapters: LocalAdapter, DockerAdapter, CloudRunAdapter, AwsLambdaAdapter, VercelAdapter, AzureFunctionsAdapter, FlyMachinesAdapter, CloudflareWorkersAdapter, ModalAdapter, DenoDeployAdapter, HetznerCloudAdapter, KubernetesAdapter.

## Section E: Integration
- Consumes interfaces from `packages/renderer`.
- Exposes orchestration and execution APIs utilized by the CLI and server environments.
