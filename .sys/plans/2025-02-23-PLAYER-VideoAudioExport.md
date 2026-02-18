# Plan: Enable Audio Export from Video Elements

## 1. Context & Goal
- **Objective**: Update `getAudioAssets` to include audio tracks from `<video>` elements in client-side exports.
- **Trigger**: "Preview/Export Parity Gap" identified in `.jules/PLAYER.md` and confirmed by code analysis. `AudioFader` (preview) supports video elements, but `getAudioAssets` (export) does not.
- **Impact**: Users exporting compositions with video elements will now have audio in the exported file, matching the preview experience.

## 2. File Inventory
- **Modify**:
  - `packages/player/src/features/audio-utils.ts`: Update `querySelectorAll` to include `video` tag.
  - `packages/player/src/features/audio-utils.test.ts`: Add test case for `<video>` element discovery.
- **Read-Only**:
  - `packages/player/src/features/audio-fader.ts` (Reference for correct logic)

## 3. Implementation Spec
- **Architecture**:
  - The `getAudioAssets` function is the single source of truth for gathering audio for export. It currently only looks for `<audio>`.
  - It will be updated to query `audio, video`.
  - Since `HTMLVideoElement` inherits from `HTMLMediaElement` (like `HTMLAudioElement`), the existing property extraction logic (`src`, `volume`, `muted`, `loop`) applies correctly.
  - `fetchAudioAsset` uses `fetch` + `arrayBuffer`, which supports video files. `mixAudio` uses `decodeAudioData`, which supports extracting audio from video containers.
- **Pseudo-Code**:
  ```typescript
  // packages/player/src/features/audio-utils.ts

  export async function getAudioAssets(...) {
    // CHANGE: querySelectorAll('audio') -> querySelectorAll('audio, video')
    const elements = Array.from(doc.querySelectorAll('audio, video'));

    const domAssetsPromises = elements.map((tag) => {
       // Cast tag to HTMLMediaElement to access common properties
       // ... existing logic ...
    });
    // ...
  }
  ```

## 4. Test Plan
- **Verification**: Run unit tests for `audio-utils`.
  ```bash
  npm test packages/player/src/features/audio-utils.test.ts
  ```
- **Success Criteria**:
  - New test case passes: `<video>` element is discovered and properties (volume, src) are extracted.
  - Existing tests pass.
- **Edge Cases**:
  - Video elements without audio tracks (handled by `decodeAudioData` or `mixAudio` gracefully? - `decodeAudioData` might fail or return empty buffer, which `mixAudio` should handle). *Self-correction: I should ensure `mixAudio` handles decoding failures gracefully, which it already does with a try-catch block.*
