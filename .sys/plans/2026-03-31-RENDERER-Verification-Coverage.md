# Context & Goal
- **Objective**: Include all valid, self-contained verification scripts in `packages/renderer/tests/run-all.ts` to ensure full test coverage.
- **Trigger**: "Verification Gap in Run-All Script" identified in `.jules/RENDERER.md` and confirmed by file analysis.
- **Impact**: Prevents silent regressions in WAAPI sync, Shadow DOM audio discovery, CDP offsets, and Browser config by ensuring these tests run in CI/local test loop.

# File Inventory
- **Modify**: `packages/renderer/tests/run-all.ts`
- **Read-Only**:
  - `packages/renderer/tests/verify-browser-config.ts`
  - `packages/renderer/tests/verify-cdp-media-offsets.ts`
  - `packages/renderer/tests/verify-shadow-dom-audio.ts`
  - `packages/renderer/tests/verify-waapi-sync.ts`

# Implementation Spec
- **Architecture**: Update the `tests` array in `run-all.ts` to include the missing test files. These files are self-contained and do not depend on external build artifacts (like `example-build`).
- **Pseudo-Code**:
  ```typescript
  // In packages/renderer/tests/run-all.ts

  const tests = [
    // ... keep existing tests ...
    // Add the following:
    'tests/verify-browser-config.ts',
    'tests/verify-cdp-media-offsets.ts',
    'tests/verify-shadow-dom-audio.ts',
    'tests/verify-waapi-sync.ts',
    // ... keep existing scripts ...
  ];
  ```

# Test Plan
- **Verification**: Run `npm test` inside `packages/renderer`.
- **Success Criteria**:
  - All 4 new tests run and pass (output shows `✅ PASSED: ...`).
  - The overall test suite completes with exit code 0.
- **Edge Cases**:
  - Ensure `tests/verify-shadow-dom-audio.ts` properly mocks the audio request (it does via `page.route`).
  - Ensure `tests/verify-waapi-sync.ts` passes within tolerance (it has a tolerance check).
