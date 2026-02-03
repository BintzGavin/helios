# 1. Context & Goal
- **Objective**: Fix `FFmpegBuilder` to correctly calculate the audio input seek time (`-ss`) when rendering a specific timeline range (`startFrame` > 0) with a non-default `playbackRate`.
- **Trigger**: Identified a logic gap where the current implementation ignores `playbackRate` when calculating how much audio to skip, leading to desynchronization.
- **Impact**: Ensures audio remains synchronized with video when rendering partial ranges of a composition, especially for clips with variable playback speeds.

# 2. File Inventory
- **Create**: `packages/renderer/tests/verify-audio-playback-seek.ts` (Verification script to test seek logic with rates)
- **Modify**: `packages/renderer/src/utils/FFmpegBuilder.ts` (Fix inputSeek calculation)
- **Read-Only**: `packages/renderer/src/types.ts`

# 3. Implementation Spec
- **Architecture**: Update `FFmpegBuilder.getArgs` to sanitize `playbackRate` early and use it in the `inputSeek` calculation for tracks starting before the render window.
- **Pseudo-Code**:
  ```typescript
  // In FFmpegBuilder.getArgs loop over tracks:

  // 1. Sanitize Rate
  LET rate = track.playbackRate OR 1.0
  IF rate <= 0 OR !isFinite(rate) THEN rate = 1.0

  // 2. Calculate Seek
  LET renderStartTime = startFrame / fps
  LET globalStart = track.offset OR 0
  LET inputSeek = track.seek OR 0
  LET delayMs = 0

  IF globalStart > renderStartTime THEN
    // Track starts after render window
    delayMs = (globalStart - renderStartTime) * 1000
    inputSeek = track.seek OR 0
  ELSE
    // Track starts before or at render window
    delayMs = 0
    LET timelineTimeDiff = renderStartTime - globalStart
    // Apply rate to timeline difference to get media time difference
    inputSeek = (track.seek OR 0) + (timelineTimeDiff * rate)
  END IF

  // 3. Use inputSeek in -ss argument
  ADD args: ['-ss', inputSeek.toString(), ...]
  ```
- **Dependencies**: None.

# 4. Test Plan
- **Verification**: `npx ts-node packages/renderer/tests/verify-audio-playback-seek.ts`
- **Success Criteria**:
  - **Case 1**: Rate 1.0, StartFrame corresponds to 5s. Audio at T=0. Expect Seek = 5s.
  - **Case 2**: Rate 2.0, StartFrame corresponds to 5s. Audio at T=0. Expect Seek = 10s.
  - **Case 3**: Rate 0.5, StartFrame corresponds to 10s. Audio at T=0. Expect Seek = 5s.
  - **Case 4**: Rate 1.5, StartFrame corresponds to 10s. Audio at T=2. Expect Seek = 0 (original seek) + (8s * 1.5) = 12s.
- **Edge Cases**:
  - `playbackRate` = Infinity (fallback to 1.0).
  - `track.seek` > 0 (should be added correctly).
