# 2026-02-19-RENDERER-Strict-Error-Propagation.md

#### 1. Context & Goal
- **Objective**: Implement strict error handling in the Renderer to ensure the process aborts immediately if the browser page encounters uncaught exceptions, crashes, or asynchronous WebCodecs failures.
- **Trigger**: Vision requirement "Clear error messages" and "Predictable APIs". Current implementation logs errors to console but continues rendering, leading to "silent failures" or corrupted video output.
- **Impact**: Improves reliability and DX by failing fast with actionable error messages instead of producing broken artifacts.

#### 2. File Inventory
- **Modify**: `packages/renderer/src/Renderer.ts` (Add event listeners for `pageerror` and `crash`; check for errors during render loop)
- **Modify**: `packages/renderer/src/strategies/CanvasStrategy.ts` (Capture async `VideoEncoder` errors and propagate them during `capture` calls)
- **Read-Only**: `packages/renderer/src/strategies/RenderStrategy.ts`
- **Create**: `packages/renderer/scripts/verify-error-handling.ts` (Script to verify the fix)

#### 3. Implementation Spec
- **Architecture**:
  - Use a "Fail Fast" pattern. The Renderer will maintain a queue of errors caught from the Page.
  - `CanvasStrategy` will use a shared error state in the browser (`window.heliosWebCodecs.error`) to bridge asynchronous WebCodecs errors to the synchronous `capture` polling.
- **Pseudo-Code**:
  - **Renderer.ts**:
    - INIT `capturedErrors` array.
    - LISTEN to `page.on('pageerror')` -> push to `capturedErrors`.
    - LISTEN to `page.on('crash')` -> push "Page Crashed" error.
    - INSIDE `render` loop:
      - IF `capturedErrors` has items -> THROW first error (aborting render).
  - **CanvasStrategy.ts**:
    - IN `prepare()`: Set `window.heliosWebCodecs.error = null`.
    - IN `VideoEncoder.error` callback: Set `window.heliosWebCodecs.error = e.message`.
    - IN `capture()`:
      - CHECK `window.heliosWebCodecs.error`.
      - IF error exists -> THROW error.
  - **verify-error-handling.ts**:
    - IMPORT `Renderer` from `../src/Renderer`.
    - RUN `Renderer.render` with a composition URL that throws an error (using a data URI or a mock server).
    - ASSERT that the promise rejects.
- **Public API Changes**: None (Internal behavior change: render will now reject Promise on page error).

#### 4. Test Plan
- **Verification**:
  - Run the verification script: `npx ts-node packages/renderer/scripts/verify-error-handling.ts`
- **Regression Testing**:
  - Run existing tests:
    - `npx ts-node packages/renderer/tests/test-cdp-driver.ts`
    - `npx ts-node packages/renderer/tests/verify-range-render.ts`
