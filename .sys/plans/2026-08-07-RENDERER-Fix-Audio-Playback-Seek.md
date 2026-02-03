# Fix Audio Playback Seek Calculation

#### 1. Context & Goal
- **Objective**: Fix the audio input seek calculation in `FFmpegBuilder` to correctly account for `playbackRate` when rendering a range that starts after the audio track's global offset.
- **Trigger**: Analysis of `FFmpegBuilder.ts` revealed that `inputSeek` (used for `-ss`) simply adds the timeline time difference to the track seek, ignoring that 1 timeline second equals `rate` media seconds.
- **Impact**: Ensures audio synchronization is maintained when rendering specific frame ranges (`startFrame > 0`) for compositions using variable speed audio tracks.

#### 2. File Inventory
- **Modify**: `packages/renderer/src/utils/FFmpegBuilder.ts` (Update seek calculation logic)
- **Create**: `packages/renderer/tests/verify-audio-playback-rate-seek.ts` (New verification script)
- **Read-Only**: `packages/renderer/tests/verify-audio-playback-rate.ts` (Reference for existing tests)

#### 3. Implementation Spec
- **Architecture**: No architectural changes. Logic fix within `FFmpegBuilder.getArgs` method.
- **Pseudo-Code**:
  ```typescript
  // inside getArgs, processing tracks loop
  rate = track.playbackRate OR 1.0

  IF globalStart > renderStartTime THEN
    // Track starts after render window
    delayMs = (globalStart - renderStartTime) * 1000
    // inputSeek remains as configured
  ELSE
    // Track starts before or at render window
    // We need to skip the part of the track before renderStart
    timelineDiff = renderStartTime - globalStart

    // SCALE the difference by playbackRate
    // If rate is 2.0, skipping 5s of timeline means skipping 10s of media
    mediaDiff = timelineDiff * rate

    delayMs = 0
    inputSeek = (track.seek OR 0) + mediaDiff
  END IF
  ```

#### 4. Test Plan
- **Verification**: Run the new verification script:
  ```bash
  npx ts-node packages/renderer/tests/verify-audio-playback-rate-seek.ts
  ```
- **Success Criteria**:
  - Test verifies that for `renderStartTime=5`, `offset=0`, `playbackRate=2.0`, the generated `-ss` argument is `10` (not `5`).
  - Test verifies that for `renderStartTime=5`, `offset=0`, `playbackRate=0.5`, the generated `-ss` argument is `2.5` (not `5`).
  - Test verifies `playbackRate=1.0` works as before.
- **Edge Cases**:
  - `playbackRate` infinite or negative (should be handled by existing validation, defaulting to 1.0).
  - `startFrame` causing `renderStartTime` to be exactly equal to `offset`.
