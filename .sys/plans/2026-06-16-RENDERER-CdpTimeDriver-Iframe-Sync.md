# Plan: Update CdpTimeDriver for Iframe Media Sync

#### 1. Context & Goal
- **Objective**: Update `CdpTimeDriver` to synchronize media elements (`<video>`, `<audio>`) across all frames (including iframes), ensuring correct rendering of nested compositions in Canvas mode.
- **Trigger**: Identified inconsistency between `SeekTimeDriver` (iterates all frames) and `CdpTimeDriver` (only main frame) regarding media synchronization, which causes media in iframes to drift or play incorrectly during Canvas rendering.
- **Impact**: Ensures deterministic rendering for complex compositions using iframes (e.g., sandboxed components, external visualizations) when using the high-performance Canvas rendering mode.

#### 2. File Inventory
- **Modify**: `packages/renderer/src/drivers/CdpTimeDriver.ts` (Update `setTime` to iterate frames)
- **Create**: `packages/renderer/tests/verify-cdp-iframe-media-sync.ts` (New verification script)

#### 3. Implementation Spec
- **Architecture**:
  - Leverage Playwright's `page.frames()` API to access all attached frames (including nested iframes).
  - Distribute the existing media synchronization logic (attribute parsing, offset calculation, `currentTime` setting) to execute within each frame's context.
  - Maintain the existing `Emulation.setVirtualTimePolicy` logic which controls the global browser clock.

- **Pseudo-Code**:
  ```typescript
  // In packages/renderer/src/drivers/CdpTimeDriver.ts

  async setTime(page, timeInSeconds):
    // ... existing init checks ...

    CALCULATE budget = (timeInSeconds - currentTime) * 1000

    // DEFINE the synchronization script (same as current, but ensure it's self-contained)
    CONST mediaSyncScript = `
      (async (t) => {
         // ... find all AUDIO/VIDEO ...
         // ... apply offsets and loop logic ...
         // ... set currentTime ...
      })(${timeInSeconds})
    `

    // EXECUTE script in ALL frames
    CONST frames = page.frames()
    AWAIT Promise.all(frames.map(frame =>
      frame.evaluate(mediaSyncScript).catch(err => {
        // Log warning but don't fail render if a frame is restricted (though usually disabled via args)
        console.warn('Failed to sync media in frame:', err)
      })
    ))

    // ADVANCE virtual time (Global)
    // ... existing Emulation.setVirtualTimePolicy logic ...

    // UPDATE local currentTime
    // ...
  ```

- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npx tsx packages/renderer/tests/verify-cdp-iframe-media-sync.ts`
- **Success Criteria**:
  - Script sets up a page with an iframe containing a video element with known duration.
  - Driver initializes and prepares page.
  - Driver sets time to `1.5` seconds.
  - Verification logic reads `video.currentTime` from inside the iframe.
  - Expect `1.5` (plus/minus small tolerance).
  - Verify looping behavior: Set time to `duration + 1.0`, expect `1.0`.
- **Edge Cases**:
  - Cross-origin iframes (should work due to `--disable-web-security`).
  - Empty iframes or iframes without media (should not crash).
