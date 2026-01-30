# Context & Goal
- **Objective**: Ensure `CdpTimeDriver` synchronizes media elements (`<video>`, `<audio>`) *before* triggering the frame render (`requestAnimationFrame`) in Canvas mode.
- **Trigger**: Analysis of `CdpTimeDriver.setTime` revealed that `Emulation.setVirtualTimePolicy('advance')` (which triggers `rAF`) is called before the media synchronization script runs. This causes the canvas to be drawn with stale media states (from the previous time or pre-seek state).
- **Impact**: This change ensures true deterministic rendering for mixed-media Canvas applications (e.g., drawing video to canvas), preventing one-frame lag or desync issues. It aligns `CdpTimeDriver` behavior with the corrected "Sync-then-Render" pattern used in `SeekTimeDriver`.

# File Inventory
- **Create**:
  - `packages/renderer/tests/verify-cdp-media-sync-timing.ts`: A new verification script to validate the order of operations.
- **Modify**:
  - `packages/renderer/src/drivers/CdpTimeDriver.ts`: To split the injection script and reorder the `setTime` logic.
- **Read-Only**:
  - `packages/renderer/src/drivers/SeekTimeDriver.ts` (Reference for correct sync pattern).

# Implementation Spec
- **Architecture**: The `CdpTimeDriver` uses the Chrome DevTools Protocol (CDP) to advance virtual time. Currently, it advances time (triggering `rAF`) and *then* manually sets media `currentTime`. The fix is to invert this dependency: manually set media `currentTime` first, *then* advance virtual time so that `rAF` callbacks see the updated media state.
- **Pseudo-Code**:
  ```typescript
  CLASS CdpTimeDriver:
    METHOD setTime(page, timeInSeconds):
      CALCULATE delta = timeInSeconds - this.currentTime
      IF delta <= 0 RETURN

      // 1. Sync Media Phase
      // Execute script to force all media elements to the target time
      // This ensures that when rAF fires (in step 2), media is already positioned
      CALL page.evaluate((t) => {
        FIND all media elements (recursive Shadow DOM search)
        FOR each element:
          PAUSE element
          CALCULATE targetTime = t - offset + seek
          SET element.currentTime = targetTime
          // Do NOT await 'seeked' (avoids deadlock in paused virtual time)
      }, timeInSeconds)

      // 2. Advance Phase
      // Advance virtual time by delta
      // This triggers the browser event loop, running rAF callbacks for the NEW time
      CALL client.send('Emulation.setVirtualTimePolicy', { policy: 'advance', budget: delta * 1000 })
      UPDATE this.currentTime = timeInSeconds

      // 3. Stabilization Phase
      // Wait for any post-render stability checks
      CALL page.evaluate(() => {
        WAIT for document.fonts.ready
        WAIT for window.helios.waitUntilStable() if exists
      })
  ```
- **Public API Changes**: None.
- **Dependencies**: No external dependencies.

# Test Plan
- **Verification**: Run the new verification script:
  `npx tsx packages/renderer/tests/verify-cdp-media-sync-timing.ts`
- **Success Criteria**:
  - The verification script creates a page with a `<video>` element and registers a `requestAnimationFrame` loop.
  - The `rAF` loop records the `video.currentTime`.
  - The script calls `driver.setTime(T)`.
  - The test asserts that the value recorded by `rAF` is `T` (or `T - offset`), proving that Sync happened *before* Render.
  - If the value is `T_prev`, the test must fail.
- **Edge Cases**:
  - Ensure `delta=0` logic is preserved (early return).
  - Verify Shadow DOM traversal logic remains intact (it should be copied/moved to the Sync Phase script).
