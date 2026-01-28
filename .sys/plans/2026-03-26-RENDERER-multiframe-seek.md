# 2026-03-26 - Renderer: Multi-Frame SeekTimeDriver

## 1. Context & Goal
- **Objective**: Update `SeekTimeDriver` to synchronize virtual time, media elements, and font loading across ALL frames (including iframes), ensuring deterministic rendering for complex compositions.
- **Trigger**: Discovery that `SeekTimeDriver.setTime` only updates the main frame's `window.__HELIOS_VIRTUAL_TIME__`, leaving iframes frozen at `t=0` even though they receive the polyfill.
- **Impact**: Enables correct rendering of compositions that use iframes for component isolation or social media embeds, preventing frozen animations and potential race conditions in subframes.

## 2. File Inventory
- **Modify**: `packages/renderer/src/drivers/SeekTimeDriver.ts` (Update `setTime` logic)
- **Create**: `packages/renderer/tests/verify-iframe-sync.ts` (Verification script)
- **Read-Only**: `packages/renderer/src/types.ts`

## 3. Implementation Spec

### Architecture
- **Pattern**: Broadcast Synchronization.
- The `SeekTimeDriver` acts as the master clock. Instead of only talking to the main page context, it will iterate through all attached frames using Playwright's `page.frames()` API and execute the time-setting logic in each frame's context.

### Pseudo-Code

#### `packages/renderer/src/drivers/SeekTimeDriver.ts`

```typescript
CLASS SeekTimeDriver IMPLEMENTS TimeDriver:
  METHOD init(page):
    CALL page.addInitScript(POLYFILL_CODE) // Already implemented, affects all frames

  METHOD setTime(page, timeInSeconds):
    SET frames = page.frames() // Get all frames including main

    // Execute sync in parallel for all frames
    CALL Promise.all(frames.map(frame => {
      RETURN frame.evaluate((t) => {
        // 1. Update Global Virtual Time
        SET window.__HELIOS_VIRTUAL_TIME__ = t * 1000

        // 2. Sync Web Animations API
        IF document.timeline:
           SET document.timeline.currentTime = t * 1000

        // 3. Sync Media Elements (Video/Audio)
        FOR EACH mediaElement IN document.querySelectorAll('video, audio'):
           CALL mediaElement.pause()
           SET mediaElement.currentTime = t
           IF mediaElement.seeking OR not ready:
              WAIT for 'seeked' event

        // 4. Wait for Fonts
        WAIT for document.fonts.ready

        // 5. Wait for RAF
        WAIT for requestAnimationFrame
      }, timeInSeconds)
    }))
```

### Public API Changes
- None. (Internal logic improvement)

### Dependencies
- None.

## 4. Test Plan

### Verification Script: `packages/renderer/tests/verify-iframe-sync.ts`
- **Setup**:
  - Launch Browser.
  - Create a page with an `<iframe>`.
  - The iframe contains a script that logs `performance.now()` to a global array (accessible via frame evaluation).
- **Execution**:
  - Initialize `SeekTimeDriver`.
  - Call `driver.setTime(page, 0.5)` (500ms).
- **Assertion**:
  - Evaluate `performance.now()` inside the **iframe**.
  - Expect value to be exactly `500`.
  - Evaluate `performance.now()` inside the **main frame**.
  - Expect value to be exactly `500`.
- **Command**: `npx ts-node packages/renderer/tests/verify-iframe-sync.ts`

### Edge Cases
- **Detached Frames**: `page.frames()` might include frames that detach during execution. `frame.evaluate` might throw. Handle/Ignore errors for detached frames? (Playwright usually handles this, but we should wrap in try-catch if robust).
- **Cross-Origin**: Playwright handles cross-origin `frame.evaluate` automatically via CDP.
- **Zero Frames**: Should work fine (just main frame).
