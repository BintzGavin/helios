#### 1. Context & Goal
- **Objective**: Implement `fadeInDuration` and `fadeOutDuration` in `AudioTrackConfig` to enable basic audio fading in the renderer.
- **Trigger**: Documented gap in "Advanced Audio Mixing" roadmap item; current audio support is limited to volume and offset.
- **Impact**: Enables users to create smoother audio transitions (fades) directly via `RendererOptions`, removing the need for external audio pre-processing.

#### 2. File Inventory
- **Modify**: `packages/renderer/src/types.ts` (Add fade properties to interface)
- **Modify**: `packages/renderer/src/utils/FFmpegBuilder.ts` (Implement `afade` filter logic)
- **Modify**: `packages/renderer/tests/run-all.ts` (Add new test to suite)
- **Create**: `packages/renderer/tests/verify-audio-fades.ts` (Unit test validating FFmpeg arguments)

#### 3. Implementation Spec
- **Architecture**: Extend `FFmpegBuilder` to generate `afade` filters within the audio filter chain.
- **Pseudo-Code**:
    - **In `AudioTrackConfig` (types.ts)**:
        - ADD `fadeInDuration?: number`
        - ADD `fadeOutDuration?: number`
    - **In `FFmpegBuilder.ts`**:
        - CALCULATE `compositionDuration` using `options.frameCount / fps` OR `options.durationInSeconds`.
        - ITERATE over `tracks`:
            - CALCULATE `delayMs` (existing logic).
            - INITIALIZE `filters` array.
            - ADD `adelay` (existing logic).
            - IF `track.fadeInDuration > 0`:
                - CALCULATE `startTime` = `delayMs / 1000`.
                - ADD `afade=t=in:st={startTime}:d={track.fadeInDuration}` to `filters`.
            - IF `track.fadeOutDuration > 0`:
                - CALCULATE `startTime` = `compositionDuration - track.fadeOutDuration`.
                - IF `startTime < 0`: SET `startTime = 0`.
                - ADD `afade=t=out:st={startTime}:d={track.fadeOutDuration}` to `filters`.
            - CONSTRUCT filter chain string.
- **Public API Changes**: `AudioTrackConfig` interface updated with optional `fadeInDuration` and `fadeOutDuration`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npx tsx packages/renderer/tests/verify-audio-fades.ts`
- **Success Criteria**: Test script outputs "✅ All verification tests passed!", confirming that correct `afade` arguments are generated for various configurations (fade in only, fade out only, both, with offset).
- **Edge Cases**:
    - Fade out duration longer than composition duration (should clamp start time to 0 or handle gracefully).
    - Fade in with offset (start time should account for delay).
    - Multiple tracks with different fades.
