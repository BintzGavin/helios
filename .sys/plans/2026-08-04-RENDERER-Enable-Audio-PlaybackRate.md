# Enable Audio Playback Rate

#### 1. Context & Goal
- **Objective**: Enable support for `playbackRate` (audio tempo/speed) on audio tracks, extracting it from `playbackRate` attribute or properties in DOM mode, and allowing it in configuration.
- **Trigger**: Vision gap "Use What You Know". Media elements support `playbackRate`, but it is currently ignored during rendering, leading to audio sync mismatches for speed-adjusted media.
- **Impact**: Allows accurate rendering of sped-up or slowed-down audio (e.g. 1.5x speed podcasts, slow-mo effects), ensuring audio duration matches visual timeline.

#### 2. File Inventory
- **Modify**: `packages/renderer/src/types.ts` (Add `playbackRate` to `AudioTrackConfig`)
- **Modify**: `packages/renderer/src/utils/dom-scanner.ts` (Extract `playbackRate` from element)
- **Modify**: `packages/renderer/src/utils/FFmpegBuilder.ts` (Apply `atempo` filter)
- **Create**: `packages/renderer/tests/verify-audio-playback-rate.ts` (New verification test)

#### 3. Implementation Spec
- **Architecture**:
  - Update `AudioTrackConfig` to include optional `playbackRate` (default 1.0).
  - Update `DomScanner` to read `el.playbackRate` or `el.getAttribute('playbackRate')`.
  - Update `FFmpegBuilder` to inject `atempo` filters at the *start* of the filter chain (before `adelay`).
  - Handle `atempo` chaining for rates outside the 0.5 - 2.0 range (e.g. 4.0 = 2.0 * 2.0).
- **Pseudo-Code**:
  - **dom-scanner.ts**:
    ```typescript
    // In extraction loop
    const playbackRate = el.playbackRate || parseFloat(el.getAttribute('playbackRate') || '1.0');
    tracks.push({ ..., playbackRate });
    ```
  - **FFmpegBuilder.ts**:
    ```typescript
    // In filter generation loop
    // 1. Apply Tempo (First in chain)
    if (track.playbackRate && track.playbackRate !== 1.0) {
       let rate = track.playbackRate;
       // Validation to prevent infinite loops (e.g. rate <= 0)
       if (rate <= 0) rate = 1.0;

       while (rate > 2.0) {
         filters.push('atempo=2.0');
         rate /= 2.0;
       }
       while (rate < 0.5) {
         filters.push('atempo=0.5');
         rate /= 0.5;
       }
       if (rate !== 1.0) {
         filters.push(`atempo=${rate}`);
       }
    }
    // 2. Apply Delay (Existing)
    // 3. Apply Volume (Existing)
    // 4. Apply Fades (Existing)
    ```
- **Public API Changes**:
  - `AudioTrackConfig` gains `playbackRate?: number`.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: `npx tsx packages/renderer/tests/verify-audio-playback-rate.ts`
- **Success Criteria**:
  - Render a video with an audio track set to `playbackRate: 2.0`.
  - The audible audio should play twice as fast (chipmunk style).
  - The total duration of the audio content in the video should be half of the original file duration.
- **Edge Cases**:
  - Rate = 1.0 (No filter).
  - Rate = 4.0 (Chained filters).
  - Rate = 0.25 (Chained filters).
  - Rate combined with `offset`/`delay`.
