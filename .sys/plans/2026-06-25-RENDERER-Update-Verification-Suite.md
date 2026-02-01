# 2026-06-25-RENDERER-Update-Verification-Suite.md

#### 1. Context & Goal
- **Objective**: Update the Renderer verification suite to include critical feature tests (Cancellation, Trace Viewer, Custom FFmpeg Path) that are currently excluded from CI.
- **Trigger**: `packages/renderer/tests/run-all.ts` excludes several scripts in `packages/renderer/scripts/` that test core features promised in the README, creating a coverage gap.
- **Impact**: Ensures "Progress & Cancellation", "Playwright Trace", and "FFmpeg Config" features are regression-tested automatically, fulfilling the "Robustness" vision.

#### 2. File Inventory
- **Modify**: `packages/renderer/scripts/verify-cancellation.ts` (Refactor to remove external build dependency)
- **Modify**: `packages/renderer/scripts/verify-trace.ts` (Refactor to remove external build dependency)
- **Modify**: `packages/renderer/tests/run-all.ts` (Add scripts to execution list)
- **Read-Only**: `packages/renderer/scripts/verify-ffmpeg-path.ts`

#### 3. Implementation Spec
- **Architecture**:
  - The verification scripts will be converted into self-contained Integration Tests.
  - Instead of relying on `npm run build:examples` artifacts (which may not exist in a fresh CI environment), each script will generate a minimal `composition.html` at runtime using the `fs` module.
  - This ensures tests are hermetic and robust.

- **Pseudo-Code**:
  - **Refactor `verify-cancellation.ts` and `verify-trace.ts`**:
    - DEFINE html_content as a string containing a basic HTML structure with a `<canvas>` element and a simple JS loop drawing a color.
    - CREATE a temporary directory path.
    - WRITE html_content to `temp_dir/composition.html`.
    - INSTANTIATE Renderer with `mode: 'canvas'` targeting this file.
    - EXECUTE the test logic (e.g., call render, trigger abort signal, verify error is 'Aborted').
    - IN FINALLY block: DELETE the temporary directory and files.
  - **Update `run-all.ts`**:
    - APPEND the relative paths of the three scripts to the `tests` array:
      - `scripts/verify-cancellation.ts`
      - `scripts/verify-trace.ts`
      - `scripts/verify-ffmpeg-path.ts`

- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm test -w packages/renderer` from the root.
- **Success Criteria**:
  - The output should list the new scripts being run.
  - All tests must pass (green checkmarks).
  - No "File not found" errors regarding `output/example-build`.
- **Edge Cases**:
  - Verify that temporary files are cleaned up even if the test fails (using `try/finally`).
