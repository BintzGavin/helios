#### 1. Context & Goal
- **Objective**: Refactor `AwsLambdaAdapter` to support passing `jobDefUrl` dynamically per job invocation via `job.meta`, rather than relying solely on a static configuration at adapter instantiation. Also add `deleteJob` to `JobManager` and `JobRepository`.
- **Trigger**: Currently `AwsLambdaAdapter` hardcodes `jobDefUrl` in its config. For a multi-tenant or varied distributed rendering environment, different jobs require different definitions.
- **Impact**: Enables a single adapter instance to service jobs with different definitions stored in arbitrary cloud storage locations.

#### 2. File Inventory
- **Create**: None
- **Modify**: `packages/infrastructure/src/adapters/aws-adapter.ts`, `packages/infrastructure/src/orchestrator/job-manager.ts`, `packages/infrastructure/src/types/job-status.ts`, `packages/infrastructure/src/orchestrator/file-job-repository.ts`
- **Read-Only**: `packages/infrastructure/tests/aws-adapter.test.ts`, `packages/infrastructure/tests/job-manager.test.ts`

#### 3. Implementation Spec
- **Architecture**: In `AwsLambdaAdapter`, check if `job.meta?.jobDefUrl` exists. If it does, use it over the statically configured `config.jobDefUrl`. In `JobRepository` add `delete(id: string): Promise<void>`. Implement it in `FileJobRepository` using `fs.unlink`, and in `InMemoryJobRepository`. Add `deleteJob(id: string): Promise<void>` to `JobManager`.
- **Pseudo-Code**:
  - Update `AwsLambdaAdapterConfig` to make `jobDefUrl` optional.
  - In `AwsLambdaAdapter.execute`, fall back to `this.config.jobDefUrl` if `job.meta?.jobDefUrl` is absent. Throw an error if neither is provided.
  - Add `delete` to `JobRepository` interface.
  - Implement `delete` in `FileJobRepository` wrapping `fs.unlink(filePath)` and handling `ENOENT`.
  - Add `deleteJob` to `JobManager`, cancelling first if running, then calling repository.delete.
- **Public API Changes**: `AwsLambdaAdapterConfig` makes `jobDefUrl` optional. `JobRepository` adds `delete`. `JobManager` adds `deleteJob`.
- **Dependencies**: None.
- **Cloud Considerations**: This unifies behavior with `CloudRunAdapter`, which already supports dynamic `jobDefUrl` via `job.meta`.

#### 4. Test Plan
- **Verification**: Run `npm run test` in `packages/infrastructure`.
- **Success Criteria**: New unit tests in `aws-adapter.test.ts` verify the dynamic `jobDefUrl` fallback. Tests in `job-manager.test.ts` verify successful job deletion.
- **Edge Cases**: Verify deletion of non-existent jobs gracefully returns or handles the error.
- **Integration Verification**: Not required.