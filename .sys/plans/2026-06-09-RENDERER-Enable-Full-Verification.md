#### 1. Context & Goal
- **Objective**: Enable full verification coverage by adding recently implemented test scripts to the main test runner.
- **Trigger**: Journal entry `[2025-05-22]` identified a verification gap where valid tests exist but are not executed.
- **Impact**: Prevents regressions in critical features (Blob Audio, DOM Audio Fades, Frame Count, Shadow DOM Images) by ensuring they are actually tested in CI.

#### 2. File Inventory
- **Modify**: `packages/renderer/tests/run-all.ts` (Add missing test files to the execution list)
- **Read-Only**: `packages/renderer/tests/*.ts` (Reference for filenames)

#### 3. Implementation Spec
- **Architecture**: Update the `tests` array configuration in the test runner script.
- **Pseudo-Code**:
  ```
  IN packages/renderer/tests/run-all.ts:
    FIND `tests` array
    APPEND the following paths:
      - 'tests/verify-blob-audio.ts'
      - 'tests/verify-dom-audio-fades.ts'
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
