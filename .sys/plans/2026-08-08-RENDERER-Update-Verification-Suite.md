#### 1. Context & Goal
- **Objective**: Include recently added regression tests for audio and visual playback rate and seeking in the main verification suite (`run-all.ts`).
- **Trigger**: Discovery that `verify-audio-playback-rate.ts`, `verify-audio-playback-seek.ts`, and `verify-visual-playback-rate.ts` are present in the `tests/` directory but not executed by `npm test`.
- **Impact**: Ensures that critical features (variable playback speed, seeking with speed changes) are continuously tested, preventing future regressions.

#### 2. File Inventory
- **Create**: (None)
- **Modify**: `packages/renderer/tests/run-all.ts`
- **Read-Only**: `packages/renderer/tests/verify-audio-playback-rate.ts`, `packages/renderer/tests/verify-audio-playback-seek.ts`, `packages/renderer/tests/verify-visual-playback-rate.ts`

#### 3. Implementation Spec
- **Architecture**: Update the static `tests` array in the test runner script to include the missing file paths.
- **Pseudo-Code**:
  ```typescript
  // packages/renderer/tests/run-all.ts

  const tests = [
    // ... existing tests ...
    'tests/verify-video-loop.ts',
    'tests/verify-waapi-sync.ts', // Ensure we append after existing items

    // ADD THESE:
    'tests/verify-audio-playback-rate.ts',
    'tests/verify-audio-playback-seek.ts',
    'tests/verify-visual-playback-rate.ts',

    // ... scripts ...
  ];
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm test` from `packages/renderer`.
- **Success Criteria**:
  - The output must verify 3 additional tests compared to the previous run.
  - Specific lines `✅ PASSED: tests/verify-audio-playback-rate.ts`, `✅ PASSED: tests/verify-audio-playback-seek.ts`, and `✅ PASSED: tests/verify-visual-playback-rate.ts` must appear in the console output.
  - Final summary should be `SUMMARY: All tests passed.`.
- **Edge Cases**: Ensure the tests run in the correct environment (requires `tsx` which is handled by the runner).
