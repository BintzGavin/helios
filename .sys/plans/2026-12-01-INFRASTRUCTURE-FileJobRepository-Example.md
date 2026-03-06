#### 1. Context & Goal
- **Objective**: Create an example script demonstrating the standalone use of `FileJobRepository` with `JobManager` for persistent job state storage.
- **Trigger**: The V2 vision requires robust orchestration and job management, and developers need a clear example of how to persist job state locally using `FileJobRepository`.
- **Impact**: Provides a reference implementation for persisting and recovering job state, improving the developer experience and understanding of the infrastructure package.

#### 2. File Inventory
- **Create**: `packages/infrastructure/examples/file-job-repository.ts` (Example script demonstrating `FileJobRepository` usage)
- **Modify**: None
- **Read-Only**: `packages/infrastructure/src/orchestrator/file-job-repository.ts`, `packages/infrastructure/src/orchestrator/job-manager.ts`

#### 3. Implementation Spec
- **Architecture**: A standalone Node.js script that instantiates a `FileJobRepository` backed by a local directory, submits a dummy job to a `JobManager` (using a mock or local adapter), and demonstrates persisting, retrieving, and updating the job state. It should simulate a job execution and show how the state is updated in the file system.
- **Pseudo-Code**:
  1. Define a local directory for the repository (`.tmp/jobs`).
  2. Instantiate `FileJobRepository` with the directory.
  3. Instantiate a dummy `WorkerAdapter`.
  4. Instantiate `JobExecutor` with the adapter.
  5. Instantiate `JobManager` with the repository and executor.
  6. Submit a sample `JobSpec` with multiple chunks.
  7. Periodically retrieve the job status from the repository using `JobManager.getJob` to show progress.
  8. Wait for the job to complete or fail.
  9. Show the final state loaded from the file system.
  10. Clean up the temporary directory.
- **Public API Changes**: None
- **Dependencies**: None
- **Cloud Considerations**: This example focuses on local file-based persistence, which is useful for local development, testing, or simple deployments before moving to a cloud-native database repository.

#### 4. Test Plan
- **Verification**: Run the example script using `npx tsx packages/infrastructure/examples/file-job-repository.ts`.
- **Success Criteria**: The script executes without errors, outputs the progression of the job state, and clearly demonstrates the job being persisted to and loaded from the local file system.
- **Edge Cases**: Ensure the temporary directory is created if it doesn't exist and cleaned up afterward.
- **Integration Verification**: Ensure the script correctly integrates `FileJobRepository`, `JobManager`, and `JobExecutor`.
