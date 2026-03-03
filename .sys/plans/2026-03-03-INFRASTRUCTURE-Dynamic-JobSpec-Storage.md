#### 1. Context & Goal
- **Objective**: Implement Dynamic JobSpec Storage in the Orchestrator to ensure cloud workers receive correctly updated job definitions.
- **Trigger**: The current `JobManager` uploads local assets via `ArtifactStorage` and appends the `assetsUrl` to the `JobSpec`, but fails to serialize and upload this newly modified `JobSpec` to a remote URL. As a result, the cloud adapters (`AwsLambdaAdapter`, `CloudRunAdapter`) are triggered with stale or local `jobDefUrl` values, causing remote `WorkerRuntime` instances to fail when fetching the definition.
- **Impact**: This unlocks true distributed cloud execution by ensuring remote stateless workers can securely fetch the dynamically updated job specifications that contain the accurate remote asset pointers.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/infrastructure/src/types/storage.ts` - Add `uploadJobSpec` and `deleteJobSpec` methods to `ArtifactStorage` interface.
- **Modify**: `packages/infrastructure/src/storage/local-storage.ts` - Implement `uploadJobSpec` and `deleteJobSpec`.
- **Modify**: `packages/infrastructure/src/storage/s3-storage.ts` - Implement `uploadJobSpec` and `deleteJobSpec`.
- **Modify**: `packages/infrastructure/src/storage/gcs-storage.ts` - Implement `uploadJobSpec` and `deleteJobSpec`.
- **Modify**: `packages/infrastructure/src/orchestrator/job-manager.ts` - Update `runJob` to call `uploadJobSpec` and dynamically map the returned URL into `job.meta.jobDefUrl`. Update `deleteJob` to call `deleteJobSpec`.
- **Read-Only**: `packages/infrastructure/src/worker/runtime.ts` - To understand how `jobDefUrl` is consumed.
- **Read-Only**: `packages/infrastructure/src/adapters/aws-adapter.ts` - To understand how `jobDefUrl` is passed.

#### 3. Implementation Spec
- **Architecture**: We will extend the `ArtifactStorage` interface to support serializing and uploading/deleting the `JobSpec` directly as a JSON file. The `JobManager` will coordinate this immediately after the `uploadAssetBundle` step. The resulting URL will be passed dynamically to the executor's `meta.jobDefUrl`.
- **Pseudo-Code**:
  ```typescript
  // In JobManager.runJob
  if (this.storage && options?.jobDir) {
    const assetsUrl = await this.storage.uploadAssetBundle(id, options.jobDir);
    specToRun.assetsUrl = assetsUrl;

    // NEW: Upload the modified JobSpec
    const jobDefUrl = await this.storage.uploadJobSpec(id, specToRun);

    // Ensure the executor receives the dynamic jobDefUrl
    options.meta = { ...options.meta, jobDefUrl };
  }

  // In JobManager.deleteJob
  if (this.storage) {
     if (job.spec.assetsUrl) {
        await this.storage.deleteAssetBundle(id, job.spec.assetsUrl);
     }
     // NEW: Delete the JobSpec
     if (job.meta?.jobDefUrl) {
        await this.storage.deleteJobSpec(id, job.meta.jobDefUrl);
     }
  }
  ```
- **Public API Changes**:
  - `ArtifactStorage` interface updated with `uploadJobSpec(jobId: string, spec: JobSpec): Promise<string>` and `deleteJobSpec(jobId: string, remoteUrl: string): Promise<void>`.
- **Dependencies**: None.
- **Cloud Considerations**: S3 and GCS storage adapters must correctly serialize the `JobSpec` object to a JSON string, assume `application/json` content type, and upload it to a path like `${jobId}/job.json`.

#### 4. Test Plan
- **Verification**: Run `npm test -w packages/infrastructure`
- **Success Criteria**: All unit tests for `JobManager` and `ArtifactStorage` adapters pass, specifically validating that `uploadJobSpec` is called during `runJob` and `deleteJobSpec` is called during `deleteJob`.
- **Edge Cases**: Handle failures gracefully if `uploadJobSpec` throws an error. Ensure `deleteJob` does not fail if `jobDefUrl` is missing or deletion fails.
- **Integration Verification**: End-to-end tests or manual verification simulating a cloud execution to ensure `jobDefUrl` correctly points to the newly uploaded JSON file.
