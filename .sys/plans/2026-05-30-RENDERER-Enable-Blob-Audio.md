# 1. Context & Goal
- **Objective**: Enable the Renderer to detect and capture audio from `blob:` URLs created dynamically in the browser (e.g., from Text-to-Speech or generative audio).
- **Trigger**: Vision gap ("Use What You Know" - native web capabilities) and specific journal entry identifying `DomScanner` filtering out blobs.
- **Impact**: Unlocks support for dynamic audio generation, AI-generated speech, and other client-side audio workflows without requiring server-side file uploads.

# 2. File Inventory
- **Create**:
  - `packages/renderer/src/utils/blob-extractor.ts`: Utility to download blob content from the browser to temporary files in Node.js.
  - `packages/renderer/tests/verify-blob-audio.ts`: Verification script.
- **Modify**:
  - `packages/renderer/src/utils/dom-scanner.ts`: Remove the filter that excludes `blob:` URLs.
  - `packages/renderer/src/strategies/CanvasStrategy.ts`: Integrate blob extraction in `prepare()` and cleanup in `finish()`.
  - `packages/renderer/src/strategies/DomStrategy.ts`: Integrate blob extraction in `prepare()` and cleanup in `finish()`.
- **Read-Only**:
  - `packages/renderer/src/Renderer.ts`
  - `packages/renderer/src/types.ts`

# 3. Implementation Spec
- **Architecture**:
  - **Discovery**: `dom-scanner` will now report `blob:` URLs instead of ignoring them.
  - **Extraction**: A new `blob-extractor` utility will use `page.evaluate` to fetch the blob data (as Base64) from the browser context and write it to a temporary file on the host filesystem. This bridges the gap between the browser's memory and FFmpeg's file-based input.
  - **Integration**: Both `CanvasStrategy` and `DomStrategy` will use this utility during the `prepare` phase to "materialize" blobs into physical files that FFmpeg can ingest.
  - **Cleanup**: These temporary files will be tracked and deleted during the `finish` phase to prevent disk clutter.

- **Pseudo-Code**:
  - `dom-scanner.ts`:
    - REMOVE `.filter(track => !track.path.startsWith('blob:'))`

  - `blob-extractor.ts`:
    - EXPORT `extractBlobTracks(page: Page, tracks: AudioTrackConfig[])`
    - FOR each track in `tracks`:
      - IF path starts with `blob:`:
        - CALL `page.evaluate` with blob URL:
          - FETCH blob
          - READ as DataURL (base64)
          - RETURN base64 string
        - DECODE base64 to Buffer
        - WRITE Buffer to unique temp file (e.g. `temp_blob_[uuid].wav`)
        - SET track.path = temp file path
        - ADD temp file path to cleanup list
    - RETURN `{ tracks: updatedTracks, cleanup: async () => delete temp files }`

  - `CanvasStrategy.ts` AND `DomStrategy.ts`:
    - IN `prepare(page)`:
      - CALL `scanForAudioTracks(page)` -> `rawTracks`
      - CALL `extractBlobTracks(page, rawTracks)` -> `{ tracks, cleanup }`
      - SET `this.discoveredAudioTracks = tracks`
      - SET `this.cleanupAudio = cleanup`
    - IN `finish(page)`:
      - CALL `this.cleanupAudio()` if exists

- **Public API Changes**: None (Internal behavior change).
- **Dependencies**: None.

# 4. Test Plan
- **Verification**: `npx ts-node packages/renderer/tests/verify-blob-audio.ts`
- **Success Criteria**:
  - The script generates a video from a composition that uses a `blob:` URL for audio.
  - The output video contains an audio stream (verify via `ffprobe` or simple file size check).
  - No temporary files remain in the root directory or temp folder after execution.
- **Edge Cases**:
  - Blob revoked before capture (should fail gracefully or be handled if we capture early).
  - Large blobs (performance impact of base64 transfer - acceptable for MVP).
  - Invalid blob data (should log warning but not crash render).
