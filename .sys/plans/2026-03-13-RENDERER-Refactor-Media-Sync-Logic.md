# 2026-03-13-RENDERER-Refactor-Media-Sync-Logic.md

#### 1. Context & Goal
- **Objective**: Consolidate the duplicated logic for parsing media attributes (`offset`, `seek`, `rate`, `loop`) and calculating target timestamps into a shared utility.
- **Trigger**: "Duplicate Media Discovery Logic" gap identified in journal and code analysis. The previous attempt (`1.71.3`) only consolidated the traversal logic (`findAllMedia`), leaving the synchronization logic triplicated.
- **Impact**: Improves maintainability, ensures consistency between DOM and Canvas rendering modes, and simplifies future feature additions (like declarative fades).

#### 2. File Inventory
- **Modify**:
  - `packages/renderer/src/utils/dom-scripts.ts`: Add `PARSE_MEDIA_ATTRIBUTES_FUNCTION` and `CALCULATE_MEDIA_TARGET_TIME_FUNCTION`.
  - `packages/renderer/src/utils/dom-scanner.ts`: Update to use the new shared functions.
  - `packages/renderer/src/drivers/CdpTimeDriver.ts`: Update to use the new shared functions.
  - `packages/renderer/src/drivers/SeekTimeDriver.ts`: Update to use the new shared functions.

#### 3. Implementation Spec
- **Architecture**:
  - Export string constants from `dom-scripts.ts` containing the source code for `parseMediaAttributes` and `calculateMediaTargetTime`.
  - Inject these functions into the browser context alongside `findAllMedia`.
  - Replace the inline logic in drivers and scanner with calls to these shared functions.
- **Pseudo-Code**:
  ```typescript
  // dom-scripts.ts
  export const PARSE_MEDIA_ATTRIBUTES_FUNCTION = `
    function parseMediaAttributes(el) {
       const offset = parseFloat(el.getAttribute('data-helios-offset') || '0');
       const seek = parseFloat(el.getAttribute('data-helios-seek') || '0');
       const fadeIn = parseFloat(el.getAttribute('data-helios-fade-in') || '0');
       const fadeOut = parseFloat(el.getAttribute('data-helios-fade-out') || '0');

       let rate = el.playbackRate;
       if (rate === 1.0) {
          const rateAttr = el.getAttribute('playbackRate');
          if (rateAttr) {
             const parsed = parseFloat(rateAttr);
             if (!isNaN(parsed)) rate = parsed;
          }
       }
       if (isNaN(rate) || rate <= 0) rate = 1.0;

       return {
         offset,
         seek,
         rate,
         loop: el.loop,
         duration: el.duration,
         fadeIn,
         fadeOut,
         volume: el.muted ? 0 : el.volume
       };
    }
  `;

  export const CALCULATE_MEDIA_TARGET_TIME_FUNCTION = `
    function calculateMediaTargetTime(attributes, globalTime) {
       const { offset, seek, rate, loop, duration } = attributes;
       let targetTime = Math.max(0, (globalTime - offset) * rate + seek);

       if (loop && duration > 0 && targetTime > duration) {
          targetTime = targetTime % duration;
       }
       return targetTime;
    }
  `;
  ```
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run existing verification scripts that exercise this logic.
  - `npx tsx tests/verify-video-loop.ts` (Verifies loop & offset logic)
  - `npx tsx tests/verify-audio-playback-rate.ts` (Verifies rate logic)
- **Success Criteria**: All tests pass, indicating the logic was preserved correctly.
- **Edge Cases**: Ensure `el.duration` being NaN or 0 is handled gracefully (logic should already exist, just moving it).
