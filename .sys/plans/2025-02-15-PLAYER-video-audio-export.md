# Plan: Enable Audio Export for Video Elements

#### 1. Context & Goal
- **Objective**: Update the audio asset discovery logic to include `<video>` elements, ensuring their audio is included in client-side exports.
- **Trigger**: The current implementation of `getAudioAssets` only queries `<audio>` elements, ignoring `<video>` elements which often contain audio tracks, leading to silent exports.
- **Impact**: Fixes a critical parity gap between the preview (where `AudioFader` supports video) and the export (where `ClientSideExporter` misses it), ensuring a WYSIWYG experience.

#### 2. File Inventory
- **Modify**:
  - `packages/player/src/features/audio-utils.ts`: Update selector to query `audio, video` and improve source URL extraction.
  - `packages/player/src/features/audio-utils.test.ts`: Add test cases for video elements and source tag handling.
- **Read-Only**:
  - `packages/player/src/features/audio-fader.ts`: Reference for correct selector usage.

#### 3. Implementation Spec
- **Architecture**: Update the `getAudioAssets` utility function to query for both `audio` and `video` tags. Treat all found elements as `HTMLMediaElement` to access shared properties like `src`, `currentSrc`, `volume`, and `muted`.
- **Pseudo-Code**:
  ```typescript
  // In packages/player/src/features/audio-utils.ts

  export async function getAudioAssets(...) {
    // 1. Update query selector to include video
    const elements = Array.from(doc.querySelectorAll('audio, video'));

    const domAssetsPromises = elements.map((tag, index) => {
      // 2. Cast to HTMLMediaElement (covers both Audio and Video)
      const el = tag as HTMLMediaElement;

      // 3. Extract ID and attributes (same logic as before)
      const id = el.getAttribute('data-helios-track-id') || el.id || `track-${index}`;

      // 4. Determine Source URL
      // Use currentSrc if available (for <source> tags), fall back to src attribute
      const src = el.currentSrc || el.src || '';

      // 5. Fetch asset (same logic as before)
      return fetchAudioAsset(id, src, { ... });
    });

    // ... rest of the function remains the same
  }
  ```
- **Public API Changes**: None. This is an internal utility update.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run the unit tests for audio-utils.
  ```bash
  npx vitest packages/player/src/features/audio-utils.test.ts
  ```
- **Success Criteria**:
  - Existing tests pass.
  - New test case for `<video>` element confirms it is discovered and its properties (volume, fade) are parsed.
  - New test case for element with `<source>` children confirms `currentSrc` is prioritized/used.
- **Edge Cases**:
  - Video elements without audio tracks (fetch will succeed, decoding might result in empty/silent buffer, which `mixAudio` handles).
  - Video elements with `src` attribute vs `<source>` children.
