# Plan: Enable Comprehensive Verification Suite

## 1. Context & Goal
- **Objective**: Update the `run-all.ts` test runner to include currently ignored verification scripts, ensuring full coverage of critical features like CDP determinism, Shadow DOM media sync, and WAAPI synchronization.
- **Trigger**: Discovery that `packages/renderer/tests/run-all.ts` omits several `verify-*.ts` files present in the `tests/` directory.
- **Impact**: Improves CI reliability and regression testing by ensuring all implemented features are actually verified during the build process.

## 2. File Inventory
- **Modify**: `packages/renderer/tests/run-all.ts` (Update `tests` array)
- **Read-Only**: `packages/renderer/tests/*.ts` (To verify filenames)

## 3. Implementation Spec
- **Architecture**: Append the missing test file paths to the `tests` array in `packages/renderer/tests/run-all.ts`. The files to add are existing, self-contained Playwright scripts in the `tests/` directory.
- **Pseudo-Code**:
  ```typescript
  // In packages/renderer/tests/run-all.ts
  const tests = [
    // ... existing tests ...

    // Add missing verification scripts:
    'tests/verify-browser-config.ts',
    'tests/verify-cdp-determinism.ts',
    'tests/verify-cdp-media-offsets.ts',
    'tests/verify-cdp-media-sync-timing.ts',
    'tests/verify-codec-validation.ts',
    'tests/verify-shadow-dom-animations.ts',
    'tests/verify-shadow-dom-audio.ts',
    'tests/verify-waapi-sync.ts',

    // ... existing scripts ...
  ];
  ```
- **Dependencies**: None. These tests are self-contained and do not require external build artifacts (unlike `scripts/*.ts`).

## 4. Test Plan
- **Verification**: Run `npx tsx packages/renderer/tests/run-all.ts` from the `packages/renderer` directory.
- **Success Criteria**:
  1. The output lists each new test file being run (e.g., `Running: tests/verify-cdp-determinism.ts`).
  2. The script completes with `SUMMARY: All tests passed.` (or if tests fail, they are at least attempted, identifying valid regressions).
