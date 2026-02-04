# Infrastructure Domain Context

## A. Architecture

The Helios Infrastructure domain (`packages/infrastructure`) is planned but does not yet exist. It will provide distributed rendering capabilities for cloud execution.

**Planned Architecture:**
- **Stateless Workers**: Frame rendering workers with no state between invocations
- **Cloud Adapters**: Pluggable adapters for AWS Lambda, Google Cloud Run, local execution
- **Job Orchestrator**: Work distribution and lifecycle management
- **Output Stitcher**: Segment combination using FFmpeg concat demuxer

## B. File Tree

```
packages/infrastructure/   (PLANNED - does not exist yet)
├── src/
│   ├── index.ts                    # Public exports
│   ├── types/                      # Shared types and interfaces
│   ├── worker/                     # Stateless worker implementations
│   ├── orchestrator/               # Job management and scheduling
│   ├── stitcher/                   # Output segment combination
│   ├── adapters/                   # Cloud provider adapters
│   └── utils/                      # Retry logic, validation
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## C. Interfaces

**Planned interfaces (not yet implemented):**

```typescript
// Worker interface
interface FrameWorker {
  renderFrame(job: FrameJob): Promise<FrameResult>;
}

// Cloud adapter interface
interface CloudAdapter {
  invoke(worker: FrameWorker, job: FrameJob): Promise<FrameResult>;
  getStatus(): AdapterStatus;
}

// Job interface
interface RenderJob {
  id: string;
  composition: CompositionSpec;
  frameRange: [number, number];
  outputPath: string;
}
```

## D. Cloud Adapters

**Planned adapters:**
- `LocalAdapter` - Local execution for development and testing
- `LambdaAdapter` - AWS Lambda for serverless frame rendering
- `CloudRunAdapter` - Google Cloud Run for containerized rendering

## E. Integration

- **Renderer**: Infrastructure consumes renderer capabilities for frame generation
- **CLI**: CLI will expose commands to trigger distributed renders
- **Core**: Core provides deterministic animation state for stateless seeking
