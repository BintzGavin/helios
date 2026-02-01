#### 1. Context & Goal
- **Objective**: Revive the orphaned plan `2026-06-09-RENDERER-Enable-Full-Verification.md` and include recently discovered missing tests to enable full verification coverage.
- **Trigger**: Journal entry `[2026-06-09]` identified an orphaned plan, and subsequent exploration found 5 valid test scripts (`verify-blob-audio.ts`, `verify-dom-audio-fades.ts`, `verify-enhanced-dom-preload.ts`, `verify-frame-count.ts`, `verify-shadow-dom-images.ts`) that are present in the directory but ignored by the main test runner.
- **Impact**: Prevents regressions in critical features (Blob Audio, DOM Fades, Enhanced Preloading, Frame Precision, Shadow DOM Images) by ensuring they are actually tested in CI.

#### 2. File Inventory
- **Modify**: `packages/renderer/tests/run-all.ts` (Add missing test files to the execution list)
- **Read-Only**: `packages/renderer/tests/*.ts` (Reference for filenames)

#### 3. Implementation Spec
- **Architecture**: Update the `tests` array configuration in the test runner script to include the missing files.
- **Pseudo-Code**:
  ```
  IN packages/renderer/tests/run-all.ts:
    FIND `tests` array
    APPEND the following paths:
      - 'tests/verify-blob-audio.ts'
      - 'tests/verify-dom-audio-fades.ts'
      - 'tests/verify-enhanced-dom-preload.ts'
      - 'tests/verify-frame-count.ts'
      - 'tests/verify-shadow-dom-images.ts'
  ```
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npx tsx packages/renderer/tests/run-all.ts`
- **Success Criteria**:
  - The output must show "✅ PASSED" for all new tests.
  - The script must exit with code 0.
  - "SUMMARY: All tests passed." must be printed at the end.
- **Edge Cases**:
  - Ensure `verify-blob-audio.ts` cleans up its temporary files.
  - Ensure `verify-frame-count.ts` does not hang if the mock FFmpeg fails.
