# PENDING

## 1. Context & Goal
- **Objective**: Enable declarative audio fades in the DOM by parsing `data-helios-fade-in` and `data-helios-fade-out` attributes in `DomScanner`.
- **Trigger**: Vision gap "Implicit Audio Discovery" - currently, `AudioTrackConfig` supports fades (and `FFmpegBuilder` implements them), but `dom-scanner` ignores these attributes on HTML elements.
- **Impact**: Users can control audio fades directly from HTML/Components (e.g., `<audio data-helios-fade-in="2">`) without manual configuration in `RendererOptions`.

## 2. File Inventory
- **Modify**: `packages/renderer/src/utils/dom-scanner.ts` (Update scanning logic)
- **Create**: `packages/renderer/tests/verify-dom-audio-fades.ts` (New verification script)
- **Read-Only**: `packages/renderer/src/types.ts`, `packages/renderer/src/utils/FFmpegBuilder.ts`

## 3. Implementation Spec
- **Architecture**: Extend `scanForAudioTracks` to parse dataset attributes.
- **Pseudo-Code**:
  - IN `packages/renderer/src/utils/dom-scanner.ts`:
    - UPDATE `scanForAudioTracks` function:
      - INSIDE `page.evaluate` script:
        - FOR EACH media element:
          - GET `dataset.heliosFadeIn` -> parse float or 0.
          - GET `dataset.heliosFadeOut` -> parse float or 0.
          - ADD `fadeInDuration` and `fadeOutDuration` to the returned object.
      - UPDATE return mapping to include these new fields in `AudioTrackConfig`.

- **Public API Changes**: None (AudioTrackConfig already has these fields).
- **Dependencies**: None.

## 4. Test Plan
- **Verification**: `npx tsx packages/renderer/tests/verify-dom-audio-fades.ts`
- **Success Criteria**:
  - The test script launches a browser page with `<audio data-helios-fade-in="2" data-helios-fade-out="3">`.
  - Calls `scanForAudioTracks(page)`.
  - Asserts that the returned track has `fadeInDuration === 2` and `fadeOutDuration === 3`.
- **Edge Cases**:
  - Missing attributes (should be 0).
  - Invalid float values (should handle gracefully, e.g., 0).
