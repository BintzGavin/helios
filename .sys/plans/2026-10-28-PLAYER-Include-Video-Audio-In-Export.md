# PLAYER-Include-Video-Audio-In-Export

#### 1. Context & Goal
- **Objective**: Update `getAudioAssets` in `packages/player` to include audio from `<video>` elements, ensuring full audio fidelity during client-side export.
- **Trigger**: A discrepancy was identified where `AudioFader` (preview) correctly processes `<video>` elements, but `ClientSideExporter` (export) ignores them because `getAudioAssets` only queries `<audio>` tags. This leads to missing audio in exported videos.
- **Impact**: Users exporting compositions with `<video>` elements will now have the audio from those videos included in the exported file, matching the preview experience.

#### 2. File Inventory
- **Modify**: `packages/player/src/features/audio-utils.ts` (Update query selector to include `video` elements)
- **Modify**: `packages/player/src/features/audio-utils.test.ts` (Add test case for `video` elements)

#### 3. Implementation Spec
- **Architecture**: The `getAudioAssets` function currently scans the DOM for `audio` elements. It will be updated to scan for `audio, video` elements. Since both `HTMLAudioElement` and `HTMLVideoElement` inherit from `HTMLMediaElement` and share the same audio-related properties (`volume`, `muted`, `src`, `loop`), the existing logic for attribute extraction and ID generation will work for both without significant changes.
- **Pseudo-Code**:
  ```typescript
  // packages/player/src/features/audio-utils.ts
  export async function getAudioAssets(...) {
    // Change querySelectorAll('audio') to querySelectorAll('audio, video')
    const elements = Array.from(doc.querySelectorAll('audio, video'));

    const domAssetsPromises = elements.map((tag, index) => {
        // Existing logic for ID, volume, muted, src, loop, fade attributes
        // ...
        // Note: tag is now HTMLMediaElement (Audio or Video)
    });
    // ...
  }
  ```
- **Public API Changes**: None. `getAudioAssets` signature remains the same, but it will return `AudioAsset` objects for video elements as well.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm test packages/player/src/features/audio-utils.test.ts`.
- **Success Criteria**:
  - A new test case explicitly verifying that `<video>` elements are discovered and parsed correctly passes.
  - All existing tests pass (regression check).
- **Edge Cases**:
  - Video elements without `src` should be handled gracefully (already handled by existing `fetchAudioAsset` check).
  - Video elements with `muted` attribute should be respected.
  - Mixed `audio` and `video` elements should be handled correctly.
