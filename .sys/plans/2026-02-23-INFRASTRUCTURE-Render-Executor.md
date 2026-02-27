# 2026-02-23-INFRASTRUCTURE-Render-Executor.md

#### 1. Context & Goal
- **Objective**: Implement `RenderExecutor` class that standardizes the execution of rendering logic within a worker environment.
- **Trigger**: Backlog item "Implement stateless worker architecture" and recent completion of `JobExecutor` (orchestrator).
- **Impact**: This is the counterpart to `JobExecutor`. While `JobExecutor` runs on the orchestrator (client/server) to dispatch jobs, `RenderExecutor` runs inside the worker (Lambda/Cloud Run/Local) to receive the payload, download assets, and invoke the actual rendering logic.

#### 2. File Inventory
- **Create**:
  - `packages/infrastructure/src/worker/render-executor.ts`: Main logic for executing a render chunk.
  - `packages/infrastructure/tests/render-executor.test.ts`: Unit tests.
- **Modify**:
  - `packages/infrastructure/src/worker/index.ts`: Export `RenderExecutor`.
  - `packages/infrastructure/src/index.ts`: Export worker module.
- **Read-Only**:
  - `packages/infrastructure/src/types/job-spec.ts`: For `RenderJobChunk` type.
  - `packages/infrastructure/src/adapters/aws-adapter.ts`: To ensure payload compatibility.

#### 3. Implementation Spec
- **Architecture**:
  - `RenderExecutor` will handle the "inside-the-worker" logic.
  - It needs to:
    1. Accept a `JobSpec` (or URL to fetch it) and a `chunkId`.
    2. Resolve the specific `RenderJobChunk` from the spec.
    3. (Future) Download assets/setup environment.
    4. Construct the actual CLI command or function call to the renderer.
    5. Execute the render.
    6. Return standard `WorkerResult`.
  - It will use a `CommandExecutor` strategy (similar to `LocalWorkerAdapter`'s spawn logic, but scoped to the worker's internal execution).

- **Pseudo-Code**:
```typescript
class RenderExecutor {
  constructor(private workspaceDir: string) {}

  async executeChunk(jobSpec: JobSpec, chunkId: number): Promise<WorkerResult> {
    // 1. Find chunk
    const chunk = jobSpec.chunks.find(c => c.id === chunkId);
    if (!chunk) throw new Error("Chunk not found");

    // 2. Prepare environment (placeholder for now, mostly setting CWD)
    // Future: Download assets if jobSpec has remote assets

    // 3. Execute Command
    // We can reuse the logic from LocalWorkerAdapter or a shared utility for spawning processes
    // But since this RUNS inside the worker, it effectively IS a local execution relative to the container.

    return await spawnCommand(chunk.command, this.workspaceDir);
  }
}
```

- **Public API Changes**:
  - Export `RenderExecutor` class from `packages/infrastructure`.
  - `RenderExecutor` has public method `executeChunk(jobSpec: JobSpec, chunkId: number): Promise<WorkerResult>`.

- **Dependencies**:
  - `@helios-project/renderer` (conceptually, but `infrastructure` shouldn't depend on it directly to avoid cycles. It should invoke via CLI command string provided in `JobSpec`).

- **Cloud Considerations**:
  - This code runs INSIDE the Lambda/Container.
  - It must be lightweight.
  - It must handle `stdout/stderr` capture carefully to return it in the JSON response expected by the Adapters.

#### 4. Test Plan
- **Verification**: `npm test` in `packages/infrastructure`.
- **Pre Commit**:
  - Run `npm test` and complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
- **Success Criteria**:
  - `RenderExecutor` correctly identifies the chunk from a JobSpec.
  - It executes the command (mocked spawn).
  - It returns the expected `WorkerResult`.
- **Edge Cases**:
  - Invalid Chunk ID.
  - Command failure (non-zero exit code).
  - Exception during execution.
- **Integration Verification**:
  - In a future task, integrate `RenderExecutor` with `LocalWorkerAdapter` to simulate a full render job execution locally.
