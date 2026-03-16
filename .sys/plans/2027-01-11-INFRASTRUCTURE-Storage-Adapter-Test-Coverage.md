#### 1. Context & Goal
- **Objective**: Expand test coverage for `s3-storage.ts`, `gcs-storage.ts`, and `local-storage.ts` to reach 100%.
- **Trigger**: `vitest --coverage` identified missing coverage on lines 162 and 209 in `s3-storage.ts`, line 102 in `gcs-storage.ts`, and line 83 in `local-storage.ts` involving unhandled error throwing edges in cleanup and url parsing.
- **Impact**: Ensures that cloud execution storage adapters handle edge cases robustly during distributed rendering setup and teardown.

#### 2. File Inventory
- **Create**: []
- **Modify**:
  - `packages/infrastructure/tests/storage/s3-storage.test.ts`
  - `packages/infrastructure/tests/storage/gcs-storage.test.ts`
  - `packages/infrastructure/tests/storage/local-storage.test.ts`
- **Read-Only**:
  - `packages/infrastructure/src/storage/s3-storage.ts`
  - `packages/infrastructure/src/storage/gcs-storage.ts`
  - `packages/infrastructure/src/storage/local-storage.ts`

#### 3. Implementation Spec
- **Architecture**: Expand existing vitest suites for storage adapters.
- **Pseudo-Code**:
  - `s3-storage.test.ts`:
    - Add tests for `deleteAssetBundle` when `bucket !== this.bucket` (covering line 162).
    - Add tests for `parseRemoteUrl` when `parts.length < 2` (covering line 209).
  - `gcs-storage.test.ts`:
    - Add tests for `deleteAssetBundle` catching errors where `e.code !== 404` (covering line 102).
  - `local-storage.test.ts`:
    - Add tests for `deleteAssetBundle` catching errors where `e.code !== 'ENOENT'` (covering line 83).
- **Public API Changes**: None.
- **Dependencies**: None.
- **Cloud Considerations**: Enhances testing resiliency for S3 and GCS adapters.

#### 4. Test Plan
- **Verification**: `cd packages/infrastructure && npx vitest run --coverage --dir tests/storage/`
- **Success Criteria**: 100% statement, branch, and function coverage reported by vitest for `s3-storage.ts`, `gcs-storage.ts`, and `local-storage.ts`.
- **Edge Cases**: Verified correct exception throwing for unknown errors and malformed remote URLs.
- **Integration Verification**: Verified `npm run test` still passes.
