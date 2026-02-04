# Plan: Enable Negative Playback Rate in DomDriver

## 1. Context & Goal
- **Objective**: Implement robust support for reverse playback (negative playback rate) in `DomDriver`.
- **Trigger**: Browsers do not consistently support negative `playbackRate` on `HTMLMediaElement`, causing `el.play()` to fail or behave incorrectly when `Helios` is playing backwards.
- **Impact**: Ensures "Vision: Native Always Wins" parity where the Preview (DomDriver) matches the Logic (Helios) which supports reverse time, enabling frame-accurate scrubbing during rewind.

## 2. File Inventory
- **Modify**: `packages/core/src/drivers/DomDriver.ts` (Logic for negative rate handling)
- **Modify**: `packages/core/src/drivers/DomDriver.test.ts` (Add verification tests)

## 3. Implementation Spec
- **Architecture**:
  - Update `syncMediaElements` in `DomDriver` to intercept negative `playbackRate`.
  - Treat negative rates as "Scrubbing Mode" (force pause and seek) regardless of `isPlaying` state.
  - Prevent setting `el.playbackRate` to negative values (which throws `NotSupportedError` in some browsers).

- **Pseudo-Code**:
  ```typescript
  // packages/core/src/drivers/DomDriver.ts

  // Inside syncMediaElements loop:

  // 1. Sync Playback Rate (Guard against negative)
  // Ensure we don't pass negative rate to element
  if (playbackRate >= 0) {
     if (el.playbackRate !== playbackRate) el.playbackRate = playbackRate;
  }

  // 2. Playback Logic
  // Only enter "Native Playback" if playing AND forward
  if (isPlaying && !isBeforeStart && playbackRate >= 0) {
     // Existing play logic
  } else {
     // Existing scrubbing logic (pause + seek)
     // This correctly handles reverse because targetTime will decrease frame-by-frame
  }
  ```

- **Public API Changes**: None.

- **Dependencies**: None.

## 4. Test Plan
- **Verification**: `npm test -w packages/core`
- **Success Criteria**:
  - New test case: `should handle negative playback rate by scrubbing`.
  - When `driver.update(..., { isPlaying: true, playbackRate: -1 })` is called:
    - `el.play()` is NOT called.
    - `el.pause()` IS called.
    - `el.currentTime` matches target.
    - `el.playbackRate` is NOT negative.
- **Edge Cases**:
  - `playbackRate: 0` (Should function as paused/scrubbing).
  - Transitions from negative to positive rate.
