#### 1. Context & Goal
- **Objective**: Create an example script demonstrating the use of `LocalStorageAdapter` with `JobManager` for simulated local distributed rendering.
- **Trigger**: The INFRASTRUCTURE domain has completed its primary V2 goals and requires fallback actions like Examples and Documentation clarity.
- **Impact**: Demonstrates to users how to configure and utilize local storage for artifact management when testing distributed rendering workflows without cloud credentials.

#### 2. File Inventory
- **Create**:
  - `packages/infrastructure/examples/local-storage.ts` (Example script demonstrating `LocalStorageAdapter` usage)
- **Modify**: [None]
- **Read-Only**:
  - `packages/infrastructure/examples/s3-storage.ts` (To ensure consistency in example structure)
  - `packages/infrastructure/src/storage/local-storage.ts` (To understand `LocalStorageAdapter` instantiation)

#### 3. Implementation Spec
- **Architecture**: Create an executable Node.js script that instantiates `LocalStorageAdapter` and integrates it with `JobManager` to simulate job submission and artifact storage on the local filesystem.
- **Pseudo-Code**:
  - Define a base directory (e.g., `.local-bucket`) for the storage adapter.
  - Initialize `LocalStorageAdapter` with the base directory.
  - Initialize `FileJobRepository`, `LocalWorkerAdapter`, `JobExecutor`, and `JobManager`.
  - Create a mock `JobSpec`.
  - Submit the job via `JobManager.submitJob`.
  - Log successful submission and interaction with local storage.
  - Clean up local mock storage directories (the configured repository path and `storageDir`).
- **Public API Changes**: None.
- **Dependencies**: None.
- **Cloud Considerations**: This example serves as the local counterpart to the cloud-based S3 and GCS storage examples, proving the cloud-agnostic design of the `ArtifactStorage` interface by testing locally without network requests.

#### 4. Test Plan
- **Verification**: Run `npx tsx packages/infrastructure/examples/local-storage.ts`
- **Success Criteria**: The script executes, successfully submits the mock job, simulates the local artifact upload/storage, and cleans up the temporary directories without errors.
- **Edge Cases**: Temporary directory already exists or permission issues during cleanup.
- **Integration Verification**: Verify the code compiles without errors using `npm run build -w packages/infrastructure`.