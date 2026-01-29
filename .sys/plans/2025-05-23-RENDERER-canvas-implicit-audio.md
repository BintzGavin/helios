# 1. Context & Goal
- **Objective**: Implement implicit audio discovery for `CanvasStrategy` to automatically include DOM-based audio/video media in the render output.
- **Trigger**: Vision Gap ("Use What You Know"). Currently, `DomStrategy` discovers `<audio>` tags, but `CanvasStrategy` (the default/performance path) ignores them, requiring manual configuration.
- **Impact**: Unifies behavior between rendering modes. Users can use standard HTML audio elements for background music or sound effects in Canvas-based compositions without changing their code or configuration.

# 2. File Inventory
- **Create**: `packages/renderer/src/utils/dom-scanner.ts` (Shared utility for inspecting DOM media)
- **Create**: `packages/renderer/tests/verify-canvas-implicit-audio.ts` (Verification script)
- **Modify**: `packages/renderer/src/strategies/DomStrategy.ts` (Refactor to use shared utility)
- **Modify**: `packages/renderer/src/strategies/CanvasStrategy.ts` (Implement discovery logic)

# 3. Implementation Spec
- **Architecture**: Extract the existing media discovery logic from `DomStrategy` into a shared stateless utility `scanForAudioTracks`. Both `DomStrategy` and `CanvasStrategy` will consume this utility during their `prepare` phase to populate a local `discoveredAudioTracks` state, which is then passed to `FFmpegBuilder`.
- **Pseudo-Code**:
  - **In `packages/renderer/src/utils/dom-scanner.ts`**:
    - EXPORT function `scanForAudioTracks(page)`:
      - CALL `page.evaluate` to execute browser-side script:
        - WAIT for `document.fonts.ready`
        - SELECT all `video` and `audio` elements
        - FOR EACH element:
          - IF `readyState` < 4 (HAVE_ENOUGH_DATA):
            - WAIT for `canplaythrough` event OR timeout
          - EXTRACT `src` or `currentSrc`
          - PARSE attributes: `volume` (or `muted`), `data-helios-offset`, `data-helios-seek`
        - RETURN list of tracks
      - FILTER out invalid paths (e.g., `blob:` URLs)
      - RETURN valid tracks
  - **In `packages/renderer/src/strategies/DomStrategy.ts`**:
    - IMPORT `scanForAudioTracks`
    - IN `prepare(page)`:
      - REPLACE inline media discovery logic with CALL to `scanForAudioTracks(page)`
      - SET `this.discoveredAudioTracks` to result
      - (Retain image/background preloading logic distinct to DomStrategy if not shared)
  - **In `packages/renderer/src/strategies/CanvasStrategy.ts`**:
    - ADD private property `discoveredAudioTracks` (array)
    - IN `prepare(page)`:
      - CALL `scanForAudioTracks(page)`
      - SET `this.discoveredAudioTracks` to result
    - IN `getFFmpegArgs`:
      - MERGE `this.discoveredAudioTracks` into the audio tracks list passed to `FFmpegBuilder`

- **Public API Changes**: None (Internal behavior change only).
- **Dependencies**: None.

# 4. Test Plan
- **Verification**: `npx ts-node packages/renderer/tests/verify-canvas-implicit-audio.ts`
- **Success Criteria**:
  - The test must instantiate `CanvasStrategy`.
  - The test must mock a page with an `<audio>` element (intercepting the request to provide a dummy file).
  - Calling `strategy.prepare(page)` must populate the internal state.
  - Calling `strategy.getFFmpegArgs(...)` must return FFmpeg arguments containing the input path of the mocked audio file.
- **Edge Cases**:
  - `<audio>` with `blob:` URL (should be ignored).
  - `<audio>` that fails to load (timeout should prevent hang).
  - `CanvasStrategy` used without any audio elements (should work as before).
