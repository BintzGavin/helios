# Plan: Implicit Audio Discovery for DomStrategy

## 1. Context & Goal
- **Objective**: Automatically detect `<audio>` and `<video>` elements in the DOM during rendering and include their audio tracks in the final video output.
- **Trigger**: "Use What You Know" philosophy. Users expect standard HTML media elements to just work, but currently they are visually rendered (via screenshots) but silent unless manually configured in `audioTracks`.
- **Impact**: Removes the need for manual audio configuration for simple use cases, ensuring `<video>` and `<audio>` elements have sound in the exported video.

## 2. File Inventory
- **Create**: `packages/renderer/tests/verify-implicit-audio.ts`
- **Modify**: `packages/renderer/src/strategies/DomStrategy.ts`
  - Add private state `discoveredAudioTracks` to class.
  - Implement implicit audio discovery in `prepare()` (step 4).
  - Merge discovered tracks in `getFFmpegArgs()`.
- **Read-Only**: `packages/renderer/src/utils/FFmpegBuilder.ts`

## 3. Implementation Spec
- **Architecture**:
  - `DomStrategy` will maintain a `private discoveredAudioTracks: AudioTrackConfig[]` state.
  - During `prepare(page)`, scanning for media elements is already done for preloading. I will EXTEND this step to also return metadata (`src`, `volume`) from these elements.
  - `getFFmpegArgs` will merge these discovered tracks with any user-provided `options.audioTracks`.
- **Pseudo-Code**:
  ```typescript
  class DomStrategy {
    private discoveredTracks = [];

    async prepare(page) {
       // ... existing steps 1-3 ...

       // Step 4: Media Elements
       const mediaInfo = await page.evaluate(async () => {
          // ... existing preloading logic ...

          // NEW: Extraction logic
          return Array.from(document.querySelectorAll('audio, video')).map(el => ({
             path: el.currentSrc || el.src,
             volume: el.volume,
             // skip blobs, etc.
          }));
       });

       this.discoveredTracks = mediaInfo
          .filter(t => isSupportedProtocol(t.path))
          .map(t => ({ path: t.path, volume: t.volume }));
    }

    getFFmpegArgs(options, output) {
       const videoInputArgs = [
         '-f', 'image2pipe',
         '-framerate', `${options.fps}`,
         '-i', '-',
       ];

       // Clone options and merge tracks
       const combinedOptions = {
          ...options,
          audioTracks: [
             ...(options.audioTracks || []),
             ...this.discoveredTracks
          ]
       };
       return FFmpegBuilder.getArgs(combinedOptions, output, videoInputArgs);
    }
  }
  ```
- **Public API Changes**: None.
- **Dependencies**: None.

## 4. Test Plan
- **Verification**:
  - Create `packages/renderer/tests/verify-implicit-audio.ts` which:
    - Launches a headless browser using Playwright.
    - Sets page content to include an `<audio>` tag (e.g. `<audio src="https://example.com/test.mp3">`).
    - Instantiates `DomStrategy`.
    - Calls `prepare(page)`.
    - Calls `getFFmpegArgs(options, output)`.
    - Asserts that the returned FFmpeg arguments include `-i https://example.com/test.mp3`.
  - Run existing tests: `npx ts-node packages/renderer/tests/verify-audio-codecs.ts` to ensure no regression in audio handling.
- **Success Criteria**:
  - `verify-implicit-audio.ts` passes (confirms audio input detected).
  - `verify-audio-codecs.ts` passes.
- **Edge Cases**:
  - Page contains no audio/video elements (should render successfully without audio).
  - Elements have `blob:` URLs (should be skipped with a warning).
  - Elements have relative URLs (should be resolved by the browser to absolute URLs).
- **Pre-commit**:
  - Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.
