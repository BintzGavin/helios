#### 1. Context & Goal
- **Objective**: Integrate `ArtifactStorage` into `JobManager` to automatically upload local job assets before distributed cloud executions begin.
- **Trigger**: Backlog/Vision gap for Distributed Rendering. While `WorkerRuntime` downloads remote assets, the orchestration side (`JobManager`) lacks the mechanism to upload those local assets and append the resulting `assetsUrl` to the `JobSpec`.
- **Impact**: Unblocks the full distributed rendering pipeline by ensuring remote workers actually receive the assets they are instructed to render.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/infrastructure/src/orchestrator/job-manager.ts` - Update constructor to accept optional `ArtifactStorage` and modify `runJob` to upload assets and update `JobSpec.assetsUrl`.
- **Modify**: `packages/infrastructure/tests/job-manager.test.ts` - Add verification that `JobManager` uploads assets and properly modifies `JobSpec` before execution.
- **Read-Only**: `packages/infrastructure/src/types/storage.ts`

#### 3. Implementation Spec
- **Architecture**: `JobManager` acts as the orchestrator. Before calling `JobExecutor.execute`, it will check if `JobExecutionOptions.jobDir` is provided and if an `ArtifactStorage` instance is configured. If both are present, it will upload the local `jobDir` using `storage.uploadAssetBundle(jobId, jobDir)` and patch the `job.spec.assetsUrl` with the returned URL. It must then save the updated job status via `this.repository.save(job)` so that the workers receive the modified spec.
- **Pseudo-Code**:
  - Add `private storage?: ArtifactStorage` to `JobManager` constructor.
  - In `JobManager.runJob`:
    - Before calling `this.executor.execute`:
      - If `this.storage` and `options?.jobDir` exist:
        - `const assetsUrl = await this.storage.uploadAssetBundle(job.id, options.jobDir)`
        - `job.spec.assetsUrl = assetsUrl`
        - `await this.repository.save(job)`
  - Update tests to use a mock `ArtifactStorage` and verify it gets called correctly.
- **Public API Changes**: `JobManager` constructor signature will change to accept an optional third argument `storage?: ArtifactStorage`.
- **Dependencies**: None.
- **Cloud Considerations**: This change is purely an orchestration concern, independent of which specific cloud is used.

#### 4. Test Plan
- **Verification**: `cd packages/infrastructure && npm run test` and `npm run lint`.
- **Success Criteria**: Tests pass and `job-manager.test.ts` successfully asserts that `uploadAssetBundle` is called with the `jobId` and `jobDir`, and that the resulting `JobSpec.assetsUrl` is passed down to execution.
- **Edge Cases**: Ensure missing `storage` or `jobDir` gracefully skips the upload without failing the job.
- **Integration Verification**: Will verify with renderer locally in future steps.
