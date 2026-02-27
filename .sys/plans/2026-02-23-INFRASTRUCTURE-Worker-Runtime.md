# INFRASTRUCTURE: Worker Runtime

## 1. Context & Goal
- **Objective**: Implement `WorkerRuntime` in `packages/infrastructure/src/worker/runtime.ts` to orchestrate job fetching and execution within stateless workers.
- **Trigger**: Vision requirement for "Stateless Workers" and "Cloud Execution". `RenderExecutor` exists but needs a higher-level controller to fetch the Job Spec and invoke the execution logic.
- **Impact**: This runtime logic will be used by AWS Lambda, Google Cloud Run, and other worker implementations to receive a job payload (URL + ChunkID), retrieve the definition, and execute the work.

## 2. File Inventory
- **Create**: `packages/infrastructure/src/worker/runtime.ts`
- **Modify**: `packages/infrastructure/src/worker/index.ts` (export the new runtime)
- **Read-Only**:
  - `packages/infrastructure/src/worker/render-executor.ts`
  - `packages/infrastructure/src/types/job-spec.ts`

## 3. Implementation Spec
- **Architecture**:
  - `WorkerRuntime` class acts as the facade for the worker process.
  - It supports fetching `JobSpec` from both HTTP(S) URLs and local file paths (for testing/hybrid use).
  - It delegates the actual command execution to `RenderExecutor`.
- **Pseudo-Code**:
  ```typescript
  export class WorkerRuntime {
    constructor(private config: { workspaceDir: string }) {}

    async run(jobPath: string, chunkId: number): Promise<WorkerResult> {
      // 1. Determine if jobPath is URL or File
      let jobSpec: JobSpec;
      if (isUrl(jobPath)) {
        // Fetch JSON
        jobSpec = await fetchJson(jobPath);
      } else {
        // Read File
        jobSpec = await readJson(jobPath);
      }

      // 2. Validate JobSpec (basic check)
      if (!jobSpec.chunks) throw new Error("Invalid JobSpec");

      // 3. Execute
      const executor = new RenderExecutor(this.config.workspaceDir);
      return executor.executeChunk(jobSpec, chunkId);
    }
  }
  ```
- **Public API Changes**: Export `WorkerRuntime` class.
- **Dependencies**: `RenderExecutor`, `JobSpec`, `WorkerResult`.
- **Cloud Considerations**: Uses global `fetch` (Node 18+) for network requests. Handles filesystem operations for local fallback.

## 4. Test Plan
- **Verification**: Create `packages/infrastructure/tests/worker/runtime.test.ts`.
- **Success Criteria**:
  - Mock `global.fetch` to return a sample `JobSpec`.
  - Call `WorkerRuntime.run('http://example.com/job.json', 0)`.
  - Verify `RenderExecutor` executes the correct chunk.
  - Test local file path resolution.
- **Edge Cases**:
  - Network failure (fetch throws).
  - Invalid JSON.
  - Chunk ID not found (propagated from RenderExecutor).
  - URL vs File path detection.
- **Integration Verification**: `npm test` in `packages/infrastructure`.
