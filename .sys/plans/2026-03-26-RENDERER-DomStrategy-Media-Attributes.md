# Context & Goal
- **Objective**: Update `DomStrategy` to discover and respect `data-helios-offset`, `data-helios-seek`, and the standard `muted` attribute on `<audio>` and `<video>` elements.
- **Trigger**: Vision gap identified in `docs/status/RENDERER.md` (Media Sync Gap) and code analysis. Currently, `DomStrategy` ignores timing and mute state, causing all discovered media to play from T=0 at full volume.
- **Impact**: Enables precise audio synchronization (e.g., sound effects at specific times) and correct volume handling in DOM-based video compositions. This fulfills the "Use What You Know" promise by allowing standard DOM attributes to control composition logic.

# File Inventory
- **Modify**: `packages/renderer/src/strategies/DomStrategy.ts`
  - Update `prepare(page)` method to parse dataset attributes and mute state in the injected script.
- **Create**: `packages/renderer/tests/verify-dom-media-attributes.ts`
  - Verification script to confirm FFmpeg arguments reflect the attributes.
- **Read-Only**: `packages/renderer/src/utils/FFmpegBuilder.ts`
  - Ensure compatibility with `AudioTrackConfig` structure (it already supports offset/seek/volume).

# Implementation Spec
- **Architecture**:
  - The `prepare()` method injects a script into the browser page via `page.frames().map(...)`.
  - This script crawls the DOM for media elements (`video`, `audio`).
  - Currently, it only extracts `src` and `volume`.
  - It will be updated to extract:
    - `offset`: Parse from `dataset.heliosOffset` (float in seconds). Default to 0.
    - `seek`: Parse from `dataset.heliosSeek` (float in seconds). Default to 0.
    - `volume`: Check `el.muted`. If true, set volume to 0. Else use `el.volume`.
  - These values will be passed back to the Node.js context and stored in `this.discoveredAudioTracks`.
  - `DomStrategy.getFFmpegArgs` already merges these tracks. `FFmpegBuilder` handles the generation of `adelay` (offset), `-ss` (seek), and `volume` filters.

- **Pseudo-Code**:
  ```typescript
  // In DomStrategy.ts -> prepare() -> injected script
  FUNCTION extractMediaTracks():
    SELECT all 'video, audio' elements
    FOR each element:
      WAIT for metadata (readyState > 0) or timeout

      SET path = currentSrc OR src
      SET offset = parseFloat(dataset.heliosOffset) OR 0
      SET seek = parseFloat(dataset.heliosSeek) OR 0

      IF element.muted IS true:
        SET volume = 0
      ELSE:
        SET volume = element.volume

      IF path exists:
        PUSH { path, volume, offset, seek } to list

    RETURN list
  ```

- **Dependencies**: None. `FFmpegBuilder` already supports the schema.

# Test Plan
- **Verification**: `npx tsx packages/renderer/tests/verify-dom-media-attributes.ts`
- **Success Criteria**:
  - The script mocks a page with:
    - `<audio src="effect.mp3" data-helios-offset="2.5">`
    - `<video src="bg.mp4" data-helios-seek="10" muted>`
  - It asserts that `getFFmpegArgs` returns arguments containing:
    - `adelay=2500` (implied by offset=2.5s)
    - `-ss 10` (implied by seek=10s)
    - `volume=0` (implied by muted)
- **Edge Cases**:
  - Elements without attributes (should default to offset=0, seek=0).
  - Invalid float strings (should handle NaN safely, default to 0).
  - Muted but volume property is 1.0 (should result in effective volume 0).
