#### 1. Context & Goal
- **Objective**: Create an example script demonstrating the use of `GcsStorageAdapter` with `JobManager` for cloud-based distributed rendering.
- **Trigger**: The INFRASTRUCTURE domain has completed its primary V2 goals and requires fallback actions like Examples and Documentation clarity.
- **Impact**: Demonstrates to users how to configure and utilize Google Cloud Storage for artifact management during distributed cloud rendering.

#### 2. File Inventory
- **Create**:
  - `packages/infrastructure/examples/gcs-storage.ts` (Example script demonstrating `GcsStorageAdapter` usage)
- **Modify**: [None]
- **Read-Only**:
  - `packages/infrastructure/examples/s3-storage.ts` (To ensure consistency in example structure)
  - `packages/infrastructure/src/storage/gcs-storage.ts` (To understand `GcsStorageAdapter` instantiation)

#### 3. Implementation Spec
- **Architecture**: Create an executable Node.js script that instantiates `GcsStorageAdapter` and integrates it with `JobManager` to simulate job submission and artifact storage.
- **Pseudo-Code**:
  - Load environment variables (`GCP_PROJECT_ID`, `GCP_BUCKET_NAME`).
  - Initialize `GcsStorageAdapter` with the bucket name.
  - Initialize `FileJobRepository`, `LocalWorkerAdapter`, `JobExecutor`, and `JobManager`.
  - Create a mock `JobSpec`.
  - Submit the job via `JobManager.submitJob`.
  - Clean up local mock storage.
- **Public API Changes**: None.
- **Dependencies**: None.
- **Cloud Considerations**: The example must require necessary GCP environment variables and note the need for GCP authentication (e.g., via `GOOGLE_APPLICATION_CREDENTIALS`).

#### 4. Test Plan
- **Verification**: Run `npx tsx packages/infrastructure/examples/gcs-storage.ts`
- **Success Criteria**: The script executes, checks for environment variables, and either fails gracefully with instructions if variables are missing or successfully submits the mock job.
- **Edge Cases**: Missing environment variables.
- **Integration Verification**: Verify the code compiles without errors using `npm run build -w packages/infrastructure`.