# 2026-02-07-PLAYER-support-video-audio-export

#### 1. Context & Goal
- **Objective**: Include `<video>` element audio tracks in client-side exports.
- **Trigger**: Discrepancy between Preview (plays video audio) and Export (silences video audio). Currently, `getAudioAssets` only queries `<audio>` elements.
- **Impact**: Enables users to export compositions containing video clips with their original audio tracks intact, eliminating a major functionality gap.

#### 2. File Inventory
- **Modify**: `packages/player/src/features/audio-utils.ts` (Update query selector and type assertions)
- **Modify**: `packages/player/src/features/audio-utils.test.ts` (Add test case for video elements)
- **Read-Only**: `packages/player/src/features/audio-fader.ts` (Reference for `video` tag support)

#### 3. Implementation Spec
- **Architecture**: No architectural changes; simply broadening the scope of asset discovery in `getAudioAssets` to include `HTMLVideoElement`.
- **Pseudo-Code**:
  ```typescript
  // In packages/player/src/features/audio-utils.ts

  export async function getAudioAssets(doc, ...) {
    // Change querySelectorAll('audio') to querySelectorAll('audio, video')
    const elements = Array.from(doc.querySelectorAll('audio, video'));

    // Map over elements (cast to HTMLMediaElement) to extract:
    // - src
    // - volume
    // - muted
    // - loop
    // - data-start-time
    // - data-helios-fade-in/out
    // ...
  }
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

#### 4. Test Plan
- **Verification**: Run `npm test -w packages/player`.
- **Success Criteria**:
  - New test case in `audio-utils.test.ts` passes, confirming `<video>` elements are discovered and their audio properties are correctly parsed.
  - Existing tests for `<audio>` elements continue to pass.
- **Edge Cases**:
  - Video elements without `src` (should be handled gracefully).
  - Video elements with `muted` attribute (should be exported as silent).
