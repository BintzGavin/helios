#### 1. Context & Goal
- **Objective**: Implement comprehensive resiliency and regression tests for `FfmpegStitcher`.
- **Trigger**: The FfmpegStitcher handles concatenating video segments without re-encoding, but lacks dedicated resiliency testing for its failure modes.
- **Impact**: Ensures robust error handling and temporary file cleanup during the final stage of distributed rendering workflows.

#### 2. File Inventory
- **Modify**: `packages/infrastructure/tests/e2e/resiliency.test.ts`
- **Read-Only**: `packages/infrastructure/src/stitcher/ffmpeg-stitcher.ts`

#### 3. Implementation Spec
- **Architecture**: Expand the existing resiliency tests suite to include a new `describe('FfmpegStitcher Resiliency')` block.
- **Pseudo-Code**:
  - Test case: Fails gracefully when no input files are provided (expecting specific error message).
  - Test case: Handles `ffmpeg` command execution failure (by mocking `adapter.execute` to return a non-zero exit code) and throws an error with the `ffmpeg` stderr output.
  - Test case: Verifies that the temporary file (`listPath`) created for `ffmpeg` input is successfully cleaned up (using a mocked `unlink` or checking the filesystem), even if the `ffmpeg` command throws an error.
- **Public API Changes**: None.
- **Dependencies**: None.
- **Cloud Considerations**: This validates deterministic cleanup of temporary resources which is vital for preventing disk exhaustion on stateless cloud worker instances.

#### 4. Test Plan
- **Verification**: Run `cd packages/infrastructure && npm install --no-save --workspaces=false && npm run test && cd ../.. && npm run lint -w packages/infrastructure`.
- **Success Criteria**: All tests pass, ensuring that errors are correctly thrown and resources are effectively cleaned up.
- **Edge Cases**: Verify behaviour with 0 inputs, and an error thrown by the mock execution adapter.
- **Integration Verification**: This ensures that `FfmpegStitcher` will behave correctly when integrated into the larger `JobExecutor` orchestration flow.