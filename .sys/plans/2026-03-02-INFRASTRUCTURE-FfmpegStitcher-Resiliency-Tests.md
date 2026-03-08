#### 1. Context & Goal
- **Objective**: Implement comprehensive resiliency and regression tests for `FfmpegStitcher`.
- **Trigger**: The FfmpegStitcher handles concatenating video segments without re-encoding, but lacks dedicated resiliency testing for its failure modes. Adding "Regression tests" is a permitted fallback action when the domain is in gravitational equilibrium according to `AGENTS.md`.
- **Impact**: Ensures robust error handling and temporary file cleanup during the final stage of distributed rendering workflows.

#### 2. File Inventory
- **Modify**: `packages/infrastructure/tests/stitcher.test.ts`
- **Read-Only**: `packages/infrastructure/src/stitcher/ffmpeg-stitcher.ts`

#### 3. Implementation Spec
- **Architecture**: Expand the existing tests suite in `packages/infrastructure/tests/stitcher.test.ts` to include more robust resiliency tests.
- **Pseudo-Code**:
  - Test case: Fails gracefully when no input files are provided (expecting specific error message). This is already somewhat tested, ensure edge cases like empty string elements are handled if needed.
  - Test case: Handles `ffmpeg` command execution failure (by mocking `adapter.execute` to return a non-zero exit code) and throws an error with the `ffmpeg` stderr output. Ensure the current test covers varying stderr outputs.
  - Test case: Verifies that the temporary file (`listPath`) created for `ffmpeg` input is successfully cleaned up (using a mocked `unlink` or checking the filesystem), even if the `ffmpeg` command throws an error. Ensure the existing test is robust.
  - Test case: Simulates a failure to unlink the temporary file (e.g., throwing an error from the mocked `unlink`) and verifies that the `stitch` method suppresses the cleanup error and continues normally or throws the original error if it was a stitching failure.
- **Public API Changes**: None.
- **Dependencies**: None.
- **Cloud Considerations**: This validates deterministic cleanup of temporary resources which is vital for preventing disk exhaustion on stateless cloud worker instances.

#### 4. Test Plan
- **Verification**: Run `cd packages/infrastructure && npm install --no-save --workspaces=false && npm run test && cd ../.. && npm run lint -w packages/infrastructure`.
- **Success Criteria**: All tests pass, ensuring that errors are correctly thrown and resources are effectively cleaned up even under simulated fs failure conditions.
- **Edge Cases**: Verify behaviour with 0 inputs, error thrown by the mock execution adapter, and error thrown by the mock `fs.unlink`.
- **Integration Verification**: This ensures that `FfmpegStitcher` will behave correctly when integrated into the larger `JobExecutor` orchestration flow, particularly around resource cleanup.
