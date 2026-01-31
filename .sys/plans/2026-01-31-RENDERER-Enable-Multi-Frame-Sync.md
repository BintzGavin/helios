# 2026-01-31-RENDERER-Enable-Multi-Frame-Sync.md

## 1. Context & Goal
- **Objective**: Enable `CdpTimeDriver` to synchronize media elements inside iframes (offsets, seeking) during Canvas Mode rendering.
- **Trigger**: Vision Gap - `CdpTimeDriver` currently only executes media sync logic in the main frame, causing nested media to ignore scheduling attributes.
- **Impact**: Unlocks accurate rendering for compositions using iframes (e.g. encapsulated components) in Canvas Mode, ensuring parity with `SeekTimeDriver` (DOM Mode).

## 2. File Inventory
- **Create**: `packages/renderer/tests/verify-cdp-iframe-media.ts` (Verification test)
- **Modify**: `packages/renderer/src/drivers/CdpTimeDriver.ts` (Iterate frames)
- **Modify**: `packages/renderer/tests/run-all.ts` (Add test to suite)
- **Read-Only**: `packages/renderer/src/types.ts`

## 3. Implementation Spec

### `packages/renderer/src/drivers/CdpTimeDriver.ts`
- **Architecture**: Change the `setTime` method to iterate over all frames available in the page context instead of just targeting the main frame.
- **Pseudo-Code**:
  ```typescript
  METHOD setTime(page, timeInSeconds)
    // ... existing setup ...
    CONST mediaSyncScript = `...` // Existing script

    // CHANGE: Execute in all frames
    frames = page.frames()
    await Promise.all(frames.map(frame => frame.evaluate(mediaSyncScript)))

    // ... existing logic for virtual time advancement ...
  ```

### `packages/renderer/tests/run-all.ts`
- Add `'tests/verify-cdp-iframe-media.ts'` to the `tests` array.

### `packages/renderer/tests/verify-cdp-iframe-media.ts`
- **Goal**: Verify that `CdpTimeDriver` correctly sets `currentTime` on a `<video>` element inside an iframe, respecting `data-helios-offset`.
- **Logic**:
  1. Launch headless browser.
  2. Create `CdpTimeDriver` and `prepare(page)`.
  3. Load page with an iframe.
  4. Inject `<video data-helios-offset="2">` into the iframe.
  5. Call `driver.setTime(page, 5.0)`.
  6. Verify iframe video `currentTime` is approx `3.0`.
  7. Assert success.

## 4. Test Plan
- **Verification**: `npx tsx packages/renderer/tests/verify-cdp-iframe-media.ts`
- **Success Criteria**:
  - The test should create an iframe with a video element having `data-helios-offset="2"`.
  - At global time `t=5`, the iframe's video `currentTime` must be `3`.
  - Output should end with "✅ PASSED".
- **Edge Cases**:
  - Cross-origin iframes (handled by Playwright's `frame.evaluate`).
  - Empty iframes or iframes without media (script should gracefully handle).
