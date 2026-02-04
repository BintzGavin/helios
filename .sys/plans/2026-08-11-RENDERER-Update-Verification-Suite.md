# Context & Goal
- **Objective**: Add orphaned verification scripts to the main test runner to ensure full regression testing coverage.
- **Trigger**: Discovery that `verify-canvas-shadow-dom.ts` and `verify-pseudo-element-preload.ts` are present in the codebase but not executed by `run-all.ts`.
- **Impact**: Prevents silent regressions in Canvas-in-Shadow-DOM rendering and CSS Pseudo-Element asset preloading.

# File Inventory
- **Modify**: `packages/renderer/tests/run-all.ts` (Add missing test files to the execution list)
- **Read-Only**: `packages/renderer/tests/verify-canvas-shadow-dom.ts`, `packages/renderer/tests/verify-pseudo-element-preload.ts`

# Implementation Spec
- **Architecture**: Update the test runner configuration array to include the missing file paths.
- **Pseudo-Code**:
  - DEFINE new test paths as strings: "tests/verify-canvas-shadow-dom.ts", "tests/verify-pseudo-element-preload.ts"
  - LOCATE the "tests" array in "run-all.ts"
  - APPEND the new test paths to the "tests" array
- **Dependencies**: None.

# Test Plan
- **Verification**: Run the full renderer verification suite using the command `npm test -w packages/renderer`.
- **Success Criteria**:
  - Output log must contain "Running: tests/verify-canvas-shadow-dom.ts"
  - Output log must contain "Running: tests/verify-pseudo-element-preload.ts"
  - Both new tests must pass.
  - Final summary must indicate "All tests passed".
- **Edge Cases**: Ensure the fixture `tests/fixtures/shadow-canvas.html` exists (verified).
