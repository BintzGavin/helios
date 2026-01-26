# Plan: Polyfill Virtual Time in SeekTimeDriver

## 1. Context & Goal
- **Objective**: Ensure deterministic rendering for JavaScript-based animations (using `performance.now()` or `requestAnimationFrame`) when using `DomStrategy`.
- **Trigger**: Vision gap "Deterministic Rendering". Currently, `DomStrategy` uses `SeekTimeDriver` (WAAPI) which allows wall-clock drift to affect `performance.now()`, causing non-deterministic behavior for JS animations during slow renders.
- **Impact**: Enables correct rendering of particle systems, game loops, and other JS-driven animations in DOM mode.

## 2. File Inventory
- **Modify**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
- **Create**: `packages/renderer/tests/verify-seek-driver-determinism.ts`

## 3. Implementation Spec
- **Architecture**: Use Playwright's `page.addInitScript` to inject a polyfill that overrides `window.performance.now`, `window.Date.now`, and `window.requestAnimationFrame`.
- **Pseudo-Code**:
  ```typescript
  // In SeekTimeDriver.prepare(page):
  CALL page.addInitScript(
    SET window.__HELIOS_VIRTUAL_TIME__ = 0
    SET initialDate = Date.now()
    OVERRIDE performance.now() -> RETURN window.__HELIOS_VIRTUAL_TIME__
    OVERRIDE Date.now() -> RETURN initialDate + window.__HELIOS_VIRTUAL_TIME__
    OVERRIDE requestAnimationFrame(cb) ->
      CALL originalRAF((timestamp) => cb(window.__HELIOS_VIRTUAL_TIME__))
  )

  // In SeekTimeDriver.setTime(page, timeInSeconds):
  CALCULATE timeInMs = timeInSeconds * 1000
  CALL page.evaluate(timeInMs,
    SET window.__HELIOS_VIRTUAL_TIME__ = timeInMs
    SET document.timeline.currentTime = timeInMs
    WAIT for requestAnimationFrame
  )
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: `npx ts-node packages/renderer/tests/verify-seek-driver-determinism.ts`
- **Success Criteria**:
  - The test script renders a simple HTML page that logs `performance.now()` values to the console.
  - The logs must show timestamps increasing exactly by `1000/fps` (e.g., 33.33ms) per frame, regardless of the actual render time (which will be artificially delayed in the test).
- **Edge Cases**:
  - `cancelAnimationFrame` must continue to work (ensure the wrapper returns the original handle).
  - Verify that `Date.now()` also advances deterministically.
