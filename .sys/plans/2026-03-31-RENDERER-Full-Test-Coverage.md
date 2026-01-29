# Plan: Enable Full Verification Coverage in Renderer

#### 1. Context & Goal
- **Objective**: Ensure all critical features (Audio Mixing, Asset Preloading, Transparency, Advanced Audio Logic) are verified by the main test runner.
- **Trigger**: Audit of `packages/renderer/tests/run-all.ts` revealed it skips 6+ critical verification scripts present in `scripts/`, covering core features like Audio Mixing (v1.18.0) and DOM Preloading (v1.30.0).
- **Impact**: Prevents silent regressions in core features. Increases confidence in the release quality of the Renderer package.

#### 2. File Inventory
- **Modify**: `packages/renderer/tests/run-all.ts`
- **Read-Only**:
  - `packages/renderer/scripts/verify-advanced-audio.ts`
  - `packages/renderer/scripts/verify-audio-args.ts`
  - `packages/renderer/scripts/verify-audio-mixing.ts`
  - `packages/renderer/scripts/verify-dom-media-preload.ts`
  - `packages/renderer/scripts/verify-dom-preload.ts`
  - `packages/renderer/scripts/verify-transparency.ts`

#### 3. Implementation Spec
- **Architecture**: No architectural changes. Configuration of the test runner.
- **Pseudo-Code**:
  - OPEN `packages/renderer/tests/run-all.ts`
  - FIND the `tests` array variable.
  - APPEND the following string paths to the array:
    - `'scripts/verify-advanced-audio.ts'`
    - `'scripts/verify-audio-args.ts'`
    - `'scripts/verify-audio-mixing.ts'`
    - `'scripts/verify-dom-media-preload.ts'`
    - `'scripts/verify-dom-preload.ts'`
    - `'scripts/verify-transparency.ts'`
  - EXCLUDE `verify-cancellation.ts` and `verify-trace.ts` (dependencies on external artifacts).
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm test` inside `packages/renderer` directory (which executes `run-all.ts`).
- **Success Criteria**:
  - The output log lists all newly added tests.
  - All tests pass with "✅ PASSED".
  - The final summary shows "All tests passed."
- **Edge Cases**:
  - `verify-dom-media-preload.ts` requires internet access to fetch `BigBuckBunny.mp4`. Ensure environment allows outbound HTTP/HTTPS.
