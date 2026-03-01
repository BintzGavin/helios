# 2026-11-12-INFRASTRUCTURE-Cloud-Artifact-Storage

## 1. Context & Goal
- **Objective**: Design an artifact storage abstraction to manage job assets during distributed cloud executions.
- **Trigger**: Vision gap: V2 Infrastructure requires distributed rendering for cloud execution. The current cloud adapters (`AwsLambdaAdapter` and `CloudRunAdapter`) pass job payloads, but lack a mechanism to securely upload local rendering assets to a shared location before the job begins, and subsequently allow workers to securely fetch those assets prior to rendering chunks.
- **Impact**: This abstraction unlocks true distributed rendering in the cloud by ensuring all stateless workers have reliable, consistent access to the necessary files, decoupling local asset storage from remote chunk execution.

## 2. File Inventory
- **Create**:
  - `packages/infrastructure/src/types/storage.ts`: Core `ArtifactStorage` and related interfaces for uploading/downloading assets.
  - `packages/infrastructure/src/storage/index.ts`: Export storage module.
  - `packages/infrastructure/src/storage/local-storage.ts`: A concrete file-system based implementation of `ArtifactStorage` for local testing/mocking.
- **Modify**:
  - `packages/infrastructure/src/index.ts`: Export the new storage module.
  - `packages/infrastructure/src/types/index.ts`: Export the new storage types.
- **Read-Only**:
  - `packages/infrastructure/src/types/job-spec.ts`
  - `packages/infrastructure/src/adapters/aws-adapter.ts`
  - `packages/infrastructure/src/adapters/cloudrun-adapter.ts`
  - `packages/infrastructure/src/orchestrator/job-executor.ts`

## 3. Implementation Spec
- **Architecture**:
  - Define an `ArtifactStorage` interface representing a generic blob storage system capable of handling asset bundles.
  - Expose two primary methods on `ArtifactStorage`: `uploadAssetBundle(jobId: string, localDir: string): Promise<string>` returning a remote URL or identifier, and `downloadAssetBundle(jobId: string, remoteUrl: string, targetDir: string): Promise<void>` for retrieving it.
  - Create a `LocalStorageAdapter` implementing `ArtifactStorage` that simply copies files on the local filesystem. This ensures the design is sound without coupling to a specific cloud vendor yet, allowing tests and local workflows to simulate remote execution.
- **Pseudo-Code**:
  - `ArtifactStorage.uploadAssetBundle`: (Interface definition)
  - `ArtifactStorage.downloadAssetBundle`: (Interface definition)
  - `LocalStorageAdapter.uploadAssetBundle`: Use `node:fs/promises` to copy files from `localDir` to a designated local "remote" directory, returning the path.
  - `LocalStorageAdapter.downloadAssetBundle`: Use `node:fs/promises` to copy files from the "remote" directory to `targetDir`.
- **Public API Changes**: Exports `ArtifactStorage` interface and `LocalStorageAdapter` class.
- **Dependencies**: None. This is a foundational interface that will be consumed by `JobExecutor` and cloud adapters in subsequent steps.
- **Cloud Considerations**: The interface must strictly use asynchronous promises and avoid assumptions about persistent filesystem availability on the server side, ensuring it can eventually be implemented cleanly with object storage APIs.

## 4. Test Plan
- **Verification**: Run `npm test` and `npm run lint` in the `packages/infrastructure` package. Write a unit test specifically for `LocalStorageAdapter` verifying it can "upload" and "download" files correctly to and from temporary directories.
- **Success Criteria**: The unit test successfully completes a round-trip (upload then download) of a mock asset directory, verifying file contents remain intact.
- **Edge Cases**: Empty directories, missing files, permission errors during local copying.
- **Integration Verification**: Verify that the exported types are visible to other modules in `packages/infrastructure`.
