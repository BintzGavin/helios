# 📋 RENDERER: Enable Full Test Coverage

#### 1. Context & Goal
- **Objective**: Enable all available verification tests in the `packages/renderer` CI pipeline.
- **Trigger**: The `run-all.ts` script currently ignores critical tests (Concat, Audio Codecs, Stream Copy) identified in the "Verification Gap" learning.
- **Impact**: Ensures recent features (Stream Copy, Stability Registry, Audio Mixing) are guarded against regressions.

#### 2. File Inventory
- **Modify**: `packages/renderer/tests/run-all.ts` (Add missing tests)
- **Modify**: `packages/renderer/tests/verify-concat.ts` (Remove external dependency)
- **Rename**: `packages/renderer/tests/test-canvas-strategy.ts` -> `packages/renderer/tests/verify-canvas-strategy.ts`
- **Rename**: `packages/renderer/tests/test-cdp-driver.ts` -> `packages/renderer/tests/verify-cdp-driver.ts`

#### 3. Implementation Spec
- **Architecture**:
  - Standardize all automated tests to `verify-*.ts` naming convention.
  - Make `verify-concat.ts` self-contained using a Data URI composition (Strategy Pattern: "Use What You Know").
  - Update `run-all.ts` to iterate over the complete list of verification scripts.

- **Pseudo-Code**:
  - **verify-concat.ts**:
    - DEFINE `compositionHtml` as string (Data URI) with embedded `<canvas>` and loop.
    - REPLACE `compositionUrl` logic to use `data:text/html;charset=utf-8,${encodeURIComponent(compositionHtml)}`.
    - REMOVE file system checks for `examples/`.
  - **run-all.ts**:
    - ADD `tests/verify-audio-codecs.ts` to `tests` array.
    - ADD `tests/verify-bitrate.ts` to `tests` array.
    - ADD `tests/verify-canvas-strategy.ts` to `tests` array.
    - ADD `tests/verify-cdp-driver.ts` to `tests` array.
    - ADD `tests/verify-codecs.ts` to `tests` array.
    - ADD `tests/verify-concat.ts` to `tests` array.
    - ADD `tests/verify-diagnose.ts` to `tests` array.
    - ADD `tests/verify-range-render.ts` to `tests` array.
    - ADD `tests/verify-seek-driver-offsets.ts` to `tests` array.
    - ADD `tests/verify-seek-driver-stability.ts` to `tests` array.
    - ADD `tests/verify-stream-copy.ts` to `tests` array.

- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npm test -w packages/renderer`
- **Success Criteria**:
  - Output shows "Running: tests/verify-stream-copy.ts" (and others).
  - All tests pass (Exit Code 0).
  - `verify-concat.ts` passes without needing `examples/` directory to be built.
- **Edge Cases**:
  - `verify-concat.ts` might fail if FFmpeg concat demuxer has issues with small files, but existing logic handles it.
