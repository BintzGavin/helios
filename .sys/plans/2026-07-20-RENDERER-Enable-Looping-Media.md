# Context & Goal
- **Objective**: Ensure `<video>` and `<audio>` elements with the `loop` attribute correctly loop their playback during rendering, preventing visual freezes when the render duration exceeds the media duration.
- **Trigger**: Discovery that `SeekTimeDriver` and `CdpTimeDriver` linearly set `currentTime` without respecting the `loop` attribute, causing media to clamp to the end (freeze) instead of wrapping.
- **Impact**: Fixes visual rendering of background loops and ambient audio/video in long compositions. This addresses a functional gap where "Preview Mode" behavior (browser native) diverges from "Render Mode" behavior.

# File Inventory
- **Modify**: `packages/renderer/src/drivers/SeekTimeDriver.ts` (Update `setTime` script logic)
- **Modify**: `packages/renderer/src/drivers/CdpTimeDriver.ts` (Update `setTime` script logic)
- **Create**: `packages/renderer/tests/verify-video-loop.ts` (New verification script)

# Implementation Spec
- **Architecture**: Update the injected synchronization scripts in both TimeDrivers to strictly check for the `loop` property on media elements and apply modulo arithmetic to the target timestamp.
- **Pseudo-Code**:
  - In `setTime` (injected script):
    - FIND all media elements (AUDIO, VIDEO) recursively.
    - FOR EACH element:
      - PAUSE element.
      - GET attributes `data-helios-offset` and `data-helios-seek`.
      - CALCULATE `rawTime` = `t` - `offset` + `seek`.
      - IF `el.loop` is TRUE AND `el.duration` > 0 AND `rawTime` > `el.duration`:
        - SET `el.currentTime` = `rawTime` % `el.duration`.
      - ELSE:
        - SET `el.currentTime` = `rawTime`.
      - HANDLE `seeked` events (SeekTimeDriver) or just set time (CdpTimeDriver).
- **Public API Changes**: None.
- **Dependencies**: None.

# Test Plan
- **Verification**: `npx tsx packages/renderer/tests/verify-video-loop.ts`
- **Success Criteria**: The test script generates a `test-output-loop.mp4` file of 3 seconds duration without error.
- **Edge Cases**:
  - `duration` is NaN (media not loaded): Fallback to linear time (or handle gracefully).
  - `rawTime` < 0: `currentTime` should be 0.
