# 2025-02-18-PLAYER-IncludeVideoAudio.md

#### 1. Context & Goal
- **Objective**: Update the audio asset discovery logic to include `<video>` elements, ensuring their audio tracks are included in client-side exports and audio controls.
- **Trigger**: "Vision Gap" identified where `getAudioAssets` only scans for `<audio>` tags, violating the "Comprehensive Asset Discovery" learning and causing missing audio for video elements.
- **Impact**: Enables users to include background videos or other video elements with sound in their client-side exports, and allows controlling their volume via the player's audio menu.

#### 2. File Inventory
- **Modify**: `packages/player/src/features/audio-utils.ts` (Update `getAudioAssets` selector)
- **Modify**: `packages/player/src/features/audio-utils.test.ts` (Add test case for `<video>` element discovery)

#### 3. Implementation Spec
- **Architecture**: The `getAudioAssets` function in `audio-utils` is responsible for scanning the DOM for media elements that contribute to the audio mix. Currently, it only queries `audio`. It will be updated to query `audio, video`.
- **Pseudo-Code**:
  ```typescript
  // In getAudioAssets function:
  // Change querySelectorAll('audio') to querySelectorAll('audio, video')
  // No other changes needed as HTMLVideoElement shares the same HTMLMediaElement interface (src, volume, muted, loop)
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm test -w packages/player` to ensure no regressions and verify the new test case passes.
- **Success Criteria**:
  - New test case "should include video elements" passes.
  - Existing tests pass.
- **Edge Cases**:
  - Mixed `audio` and `video` elements in the DOM.
  - Video elements without audio tracks (handled gracefully by `fetchAudioAsset` / `decodeAudioData` which might return empty buffer or silence, effectively no-op).
  - Video elements with `muted` attribute.

#### 5. Pre-Commit Steps
- Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
