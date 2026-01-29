# 2025-05-22-RENDERER-Enable-Missing-Tests.md

## 1. Context & Goal
- **Objective**: Activate missing verification scripts in the renderer's test runner to ensure comprehensive coverage of the rendering pipeline.
- **Trigger**: `packages/renderer/tests/run-all.ts` currently excludes over 50% of the available test scripts (e.g., `verify-concat.ts`, `verify-stream-copy.ts`), leaving critical features like distributed rendering and codec selection unverified in CI.
- **Impact**: Ensures that critical features (Concatenation, Bitrate Control, Stream Copy, CDP Driver) are verified during the build process, preventing regressions.

## 2. File Inventory
- **Modify**: `packages/renderer/tests/run-all.ts` (Add missing test files to the `tests` array)
- **Read-Only**: `packages/renderer/tests/*.ts` (To confirm filenames)

## 3. Implementation Spec
- **Architecture**: No architectural changes. Just updating the test registry.
- **Pseudo-Code**:
  ```typescript
  // packages/renderer/tests/run-all.ts
  const tests = [
    'tests/test-canvas-strategy.ts', // Add Unit Test
    'tests/test-cdp-driver.ts',      // Add Unit Test
    'tests/verify-audio-codecs.ts',  // Add Verification
    'tests/verify-bitrate.ts',       // Add Verification
    'tests/verify-captions.ts',      // Existing
    'tests/verify-codecs.ts',        // Add Verification
    'tests/verify-concat.ts',        // Add Verification (Distributed Rendering)
    'tests/verify-deep-dom.ts',      // Existing
    'tests/verify-diagnose-ffmpeg.ts', // Existing
    'tests/verify-dom-media-attributes.ts', // Existing
    'tests/verify-dom-transparency.ts', // Existing
    'tests/verify-iframe-sync.ts',   // Existing
    'tests/verify-implicit-audio.ts', // Existing
    'tests/verify-media-sync.ts',    // Existing
    'tests/verify-range-render.ts',  // Add Verification
    'tests/verify-seek-driver-determinism.ts', // Existing
    'tests/verify-seek-driver-offsets.ts', // Add Verification
    'tests/verify-smart-codec-selection.ts', // Existing
    'tests/verify-stream-copy.ts',   // Add Verification (Optimization)
    'scripts/verify-error-handling.ts', // Existing
  ];
  ```
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: Run `npm test -w packages/renderer`
- **Success Criteria**: All tests (existing + new) pass with exit code 0.
- **Edge Cases**:
    - `verify-concat.ts` requires `examples/simple-canvas-animation` to be built or present. The script handles this by falling back to source if build artifact is missing.
