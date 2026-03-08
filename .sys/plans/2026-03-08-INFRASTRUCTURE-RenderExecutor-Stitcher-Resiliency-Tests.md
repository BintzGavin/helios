#### 1. Context & Goal
- **Objective**: Implement comprehensive resiliency and regression tests for `RenderExecutor` and `FfmpegStitcher`.
- **Trigger**: The domain has reached gravitational equilibrium with the V2 vision, meaning fallback actions like "Regression tests" are prioritized.
- **Impact**: Increased confidence and stability of worker execution and video stitching abstractions, ensuring they correctly handle edge cases and transient failures.

#### 2. File Inventory
- **Modify**: `packages/infrastructure/tests/render-executor.test.ts`
- **Modify**: `packages/infrastructure/tests/stitcher.test.ts`
- **Read-Only**: `packages/infrastructure/src/worker/render-executor.ts`
- **Read-Only**: `packages/infrastructure/src/stitcher/ffmpeg-stitcher.ts`

#### 3. Implementation Spec
- **Architecture**: Expand existing unit test suites with specific resiliency cases.
- **Pseudo-Code**:
  - For `RenderExecutor`: Mock `node:child_process` `spawn` to simulate specific `error` events and verify they are correctly rejected. Ensure output streaming (`stdout`/`stderr`) correctly processes disjointed data chunks. Validate behavior when command parsing throws errors. Verify correct handling when `chunkId` is missing from `JobSpec`.
  - For `FfmpegStitcher`: Provide edge cases such as simulating file writing failures or adapter execution delays. Test the file creation cleanup logic explicitly by rejecting file write or unlink operations and verifying it doesn't crash the system. Simulate adapter execution delays or specific exit codes outside of the typical range.
- **Public API Changes**: None
- **Dependencies**: None
- **Cloud Considerations**: Ensure test execution environments remain decoupled from real cloud resources using mocks.

#### 4. Test Plan
- **Verification**: Run `cd packages/infrastructure && npm install --no-save --workspaces=false && npm run test -- tests/render-executor.test.ts tests/stitcher.test.ts`
- **Success Criteria**: All newly added resiliency tests pass, verifying correct error handling, cleanup, and retry mechanisms.
- **Edge Cases**: Missing chunk IDs, process spawn failures, stream errors, and file system cleanup failures.
- **Integration Verification**: Ensure existing E2E and resiliency tests in `tests/e2e/` continue to pass.