# Context & Goal
- **Objective**: Update `SeekTimeDriver` to correctly apply `data-helios-offset` and `data-helios-seek` attributes to `<video>` and `<audio>` elements during synchronization.
- **Trigger**: Vision gap identified - `DomStrategy` parses these attributes for FFmpeg (audio), but `SeekTimeDriver` ignores them for the visual DOM state, causing desynchronization.
- **Impact**: Ensures "Deterministic Rendering" and correct visual playback of offset/seeked media elements in DOM rendering mode.

# File Inventory
- **Modify**: `packages/renderer/src/drivers/SeekTimeDriver.ts`
- **Create**: `packages/renderer/tests/verify-dom-visual-sync.ts`
- **Read-Only**: `packages/renderer/src/strategies/DomStrategy.ts`

# Implementation Spec
- **Architecture**: In `SeekTimeDriver.setTime`, verify the parsing logic for `data-helios-offset` and `data-helios-seek` and apply the time shift `t - offset + seek`.
- **Pseudo-Code**:
  ```
  FUNCTION setTime(page, timeInSeconds):
    SCRIPT =:
        t = timeInSeconds
        FOR EACH mediaElement IN document:
            offset = parseFloat(dataset.heliosOffset) OR 0
            seek = parseFloat(dataset.heliosSeek) OR 0

            // Calculate target time in the media's local timeline
            targetTime = Math.max(0, t - offset + seek)

            element.pause()
            element.currentTime = targetTime

            // Wait for seeking to complete (same as existing logic)
            IF element.seeking OR element.readyState < 2:
                WAIT for 'seeked' OR 'canplay'
  ```
- **Dependencies**: None.

# Test Plan
- **Verification**: `npx ts-node --esm packages/renderer/tests/verify-dom-visual-sync.ts`
- **Success Criteria**:
    1.  Test launches a page with `<video id="v1" data-helios-offset="2" data-helios-seek="5" src="...">`.
    2.  Sets time to `t=3`.
    3.  Verifies `video.currentTime` is approximately `6` (3 - 2 + 5).
    4.  Also verifies default case (no attributes) -> `currentTime == t`.
- **Edge Cases**:
    - `targetTime < 0` (should clamp to 0).
    - Attributes missing (defaults to 0).
    - Non-numeric attributes (defaults to 0).
