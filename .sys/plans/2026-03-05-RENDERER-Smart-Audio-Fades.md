# Plan: Implement Smart Audio Fades

## 1. Context & Goal
- **Objective**: Update the audio fade implementation to correctly handle short, non-looping audio clips by resolving their source duration.
- **Trigger**: Currently, `data-helios-fade-out` is applied relative to the *video composition duration*, causing short clips (e.g., 5s clip in 30s video) to have their fade-out ignored or applied after silence.
- **Impact**: Enables precise, declarative audio fading for sound effects and short clips, aligning implementation with user expectations ("Use What You Know").

## 2. File Inventory
- **Modify**:
  - `packages/renderer/src/types.ts`: Add `sourceDuration` to `AudioTrackConfig`.
  - `packages/renderer/src/utils/dom-scanner.ts`: Extract `duration` from media elements during scan.
  - `packages/renderer/src/utils/FFmpegBuilder.ts`: Update `afade` logic to use `sourceDuration` when available.
- **Create**:
  - `packages/renderer/tests/verify-short-audio-fades.ts`: New verification test.
- **Read-Only**:
  - `packages/renderer/tests/verify-dom-audio-fades.ts` (Reference).

## 3. Implementation Spec
- **Architecture**:
  - Enhance `DomScanner` to capture metadata (`duration`) from the browser environment.
  - Pass this metadata through `AudioTrackConfig`.
  - Update `FFmpegBuilder` to conditionally calculate fade-out start time based on audio clip duration vs. global composition duration.
- **Pseudo-Code**:
  - **dom-scanner.ts**:
    - Inside `scanForAudioTracks` -> `findAllMedia` script:
      - Capture `el.duration` (float).
      - Ensure we handle `Infinity` or `NaN` (default to undefined or 0).
    - Map this value to `sourceDuration` in the returned track objects.
  - **types.ts**:
    - Add `sourceDuration?: number;` to `AudioTrackConfig` interface.
  - **FFmpegBuilder.ts**:
    - Iterate through tracks.
    - If `track.fadeOutDuration && track.fadeOutDuration > 0`:
      - Determine `effectiveEndTime`:
        - If `track.sourceDuration` is valid (> 0, finite) AND `!track.loop`:
           - `effectiveEndTime = (delayMs / 1000) + track.sourceDuration`.
           - Note: If `playbackRate` is used, the duration on timeline changes. `effectiveEndTime = start + (sourceDuration / rate)`.
           - Wait, `el.duration` is the *source* duration. If we play at 2x speed, the clip ends sooner.
           - Correct Formula: `effectiveEndTime = (delayMs / 1000) + (track.sourceDuration / track.playbackRate)`.
        - Else:
           - `effectiveEndTime = compositionDuration`.
      - Calculate `fadeStartTime`:
        - `fadeStartTime = effectiveEndTime - track.fadeOutDuration`.
        - `fadeStartTime` must be `>= 0`.
      - Apply filter: `afade=t=out:st=${fadeStartTime}:d=${track.fadeOutDuration}`.

- **Public API Changes**:
  - `AudioTrackConfig` interface now includes optional `sourceDuration` property.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: `npx tsx packages/renderer/tests/verify-short-audio-fades.ts`
- **Success Criteria**:
  - Test creates a 10s composition with a 5s audio clip having `data-helios-fade-out="1"`.
  - FFmpeg args must contain `afade=t=out:st=4:d=1` (relative to clip end: 5s - 1s = 4s) instead of `st=9` (relative to video end: 10s - 1s = 9s).
  - Also verify looping tracks still use video end logic.
- **Edge Cases**:
  - Looping audio (must still fade out at video end).
  - Audio longer than video (must still fade out at video end).
  - Playback rate != 1.0 (verify `st` calculation respects speed).
