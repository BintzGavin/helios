# 2026-03-28 - Implement WAAPI Sync in SeekTimeDriver

#### 1. Context & Goal
- **Objective**: Implement correct synchronization of Web Animations API (including CSS Animations) in `SeekTimeDriver` by iterating `document.getAnimations()` instead of setting the read-only `document.timeline.currentTime`.
- **Trigger**: Vision Gap. The `README.md` states "Helios drives the browser's native animation engine... document.getAnimations().forEach...", but `SeekTimeDriver` incorrectly attempts to set `document.timeline.currentTime`.
- **Impact**: Ensures deterministic rendering of CSS animations and transitions when using the DOM rendering strategy, fulfilling the "Native Always Wins" thesis.

#### 2. File Inventory
- **Create**:
  - `packages/renderer/tests/verify-waapi-sync.ts` (Verification script to test CSS animation sync)
- **Modify**:
  - `packages/renderer/src/drivers/SeekTimeDriver.ts` (Implement WAAPI seeking logic)
- **Read-Only**:
  - `packages/renderer/src/drivers/TimeDriver.ts`

#### 3. Implementation Spec
- **Architecture**: `SeekTimeDriver` acts as the "Engine" for DOM-based rendering. It must take control of the browser's animation timeline. Since `document.timeline.currentTime` is read-only, we must manually seek every active animation on the page.
- **Pseudo-Code**:
  ```javascript
  // In SeekTimeDriver.setTime(page, timeInSeconds):

  // 1. Calculate timeInMs
  const timeInMs = timeInSeconds * 1000;

  // 2. Set Virtual Time Global (for JS animations)
  window.__HELIOS_VIRTUAL_TIME__ = timeInMs;

  // 3. Sync WAAPI Animations (for CSS/WAAPI animations)
  // Replaces: document.timeline.currentTime = timeInMs;
  if (document.getAnimations) {
    document.getAnimations().forEach((anim) => {
      anim.currentTime = timeInMs;
      anim.pause(); // Pause to hold the frame
    });
  }

  // 4. Continue with Media Element sync (existing logic) ...
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npx tsx packages/renderer/tests/verify-waapi-sync.ts`
- **Success Criteria**:
  - The verification script loads a page with a CSS animation (e.g., `div` moving 100px over 1s).
  - Calling `driver.setTime(0.5)` results in the `div` being at exactly `50px`.
  - Calling `driver.setTime(0.8)` results in the `div` being at exactly `80px`.
- **Edge Cases**:
  - `document.getAnimations()` not supported (unlikely in Playwright/Chrome, but good to handle safely).
  - Animations starting with delays (handled by `currentTime`).
  - Infinite loops (handled by `currentTime`).
