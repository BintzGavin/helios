# Context & Goal
- **Objective**: Update `DomStrategy` to parse and respect `data-helios-offset` (start time) and `data-helios-seek` (source seek) attributes on `<audio>` and `<video>` elements, as well as the standard `muted` property.
- **Trigger**: The current "Implicit Audio Discovery" feature in `DomStrategy` assumes all discovered media elements start at T=0 with their current volume, making it impossible to correctly render compositions with delayed or sequenced audio.
- **Impact**: Enables developers to define precise audio timing declaratively within their HTML (e.g., `<audio src="effect.mp3" data-helios-offset="5.5">`), ensuring the rendered video matches the intended audio experience.

# File Inventory
- **Create**:
  - `packages/renderer/tests/verify-audio-timing.ts`: A verification script to confirm that attributes are correctly parsed and mapped to FFmpeg arguments.
- **Modify**:
  - `packages/renderer/src/strategies/DomStrategy.ts`: Update `prepare` method to extract attributes and pass them to the audio track configuration.
- **Read-Only**:
  - `packages/renderer/src/types.ts`: For `AudioTrackConfig` interface reference.

# Implementation Spec
- **Architecture**:
  - Extend the existing DOM analysis logic in `DomStrategy.prepare(page)` to query standard and custom attributes on discovered media elements.
  - Map these attributes to the `AudioTrackConfig` interface (`offset`, `seek`, `volume`) which is already consumed by `FFmpegBuilder`.
  - Use `data-helios-*` prefix for non-standard timing attributes to avoid collisions.

- **Pseudo-Code**:
  ```typescript
  // In DomStrategy.prepare() inside page.evaluate()
  FUNCTION getDiscoveredTracks():
    WAIT for media elements to be ready (existing logic)

    SET tracks = []
    FOR each element in document.querySelectorAll('video, audio'):
      GET src = element.currentSrc || element.src
      IF src exists:
        // Parse attributes
        SET offset = parseFloat(element.getAttribute('data-helios-offset'))
        SET seek = parseFloat(element.getAttribute('data-helios-seek'))

        // Handle defaults and NaN
        IF offset is NaN: SET offset = 0
        IF seek is NaN: SET seek = 0

        // Handle volume/mute
        SET volume = element.volume
        IF element.muted: SET volume = 0

        PUSH { path: src, volume, offset, seek } to tracks

    RETURN tracks
  ```

- **Public API Changes**:
  - No changes to `Renderer` TypeScript API.
  - Introduces support for `data-helios-offset` and `data-helios-seek` HTML attributes in the DOM.

- **Dependencies**: None.

# Test Plan
- **Verification**:
  - Run `npx tsx packages/renderer/tests/verify-audio-timing.ts`
- **Success Criteria**:
  - The verification script must inject HTML with specific timing attributes.
  - It must assert that `strategy.getFFmpegArgs()` produces FFmpeg arguments where:
    - An element with `data-helios-offset="5"` results in an `adelay=5000|5000` filter for that input.
    - An element with `data-helios-seek="10"` results in `-ss 10` before the input `-i`.
    - A muted element results in `volume=0` (or effective silence).
- **Edge Cases**:
  - `data-helios-offset` is missing -> Default to 0.
  - `data-helios-offset` is "invalid" -> Default to 0.
  - Element is `muted` -> Volume should be 0 regardless of `volume` attribute.
  - Relative vs Absolute `src` handling (should remain as is, Playwright resolves it).
