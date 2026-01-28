# Context & Goal
- **Objective**: Scaffold `examples/podcast-visualizer` to verify multi-track audio mixing, `muted` attribute support, and `data-helios-offset` timing in the Renderer.
- **Trigger**: Vision gap identified in `docs/status/DEMO.md` (Audio Mixing Verification Gap) and lack of realistic examples for complex renderer features.
- **Impact**: Verifies `DomStrategy` correctly handles multiple audio sources, respecting offsets and mute states, ensuring robust audio support for the renderer.

# File Inventory
- **Create**:
  - `examples/podcast-visualizer/composition.html`: The main composition file with multi-track audio and visualization.
  - `examples/podcast-visualizer/vite.config.js`: Build configuration for the example.
- **Modify**:
  - `vite.build-example.config.js`: Add `podcast_visualizer` to the build inputs.
  - `tests/e2e/verify-render.ts`: Add `Podcast Visualizer` to the verification list.
- **Read-Only**:
  - `packages/core/src/index.ts`
  - `packages/renderer/src/index.ts`

# Implementation Spec
- **Architecture**:
  - Use `Helios` core with `autoSyncAnimations` enabled to drive the timeline.
  - Use standard HTML `<audio>` elements for source tracks to allow `DomStrategy` to discover and mix them via FFmpeg.
  - Use Web Audio API (`createMediaElementSource`) for visualization in the preview (Player), connecting the audio elements to an analyzer node.
  - Use Base64 Data URIs for audio sources to ensure the example is self-contained and does not require external file fetches.

- **Pseudo-Code**:
  - **Asset Preparation**:
    - Generate a Base64 string representing a short (0.5s) valid WAV file (e.g., 8kHz mono beep) to serve as the audio source.
  - **Composition Logic (composition.html)**:
    - Define two `<audio>` elements in the DOM:
      - `Host Track`: Uses the Base64 source.
      - `Background Track`: Uses the Base64 source but with the `muted` attribute (should be silent in output).
      - `Guest Track` (Optional): Uses the Base64 source with `data-helios-offset` set to a specific time (e.g., 1s) to test staggered start.
    - Initialize `Helios` instance with a fixed duration (e.g., 5s) and FPS.
    - Bind `Helios` to the document timeline.
    - Subscribe to `Helios` updates to drive a Canvas-based visualization (e.g., drawing bars or waves) based on the audio data from the Web Audio API analyzer.
  - **Build Configuration (vite.build-example.config.js)**:
    - Import the `resolve` function.
    - Add a new entry to the `rollupOptions.input` object pointing to the new `composition.html` path.
  - **Verification Logic (tests/e2e/verify-render.ts)**:
    - Add a new test case object to the `CASES` array with the name 'Podcast Visualizer', the correct relative path, and mode set to 'dom'.

- **Public API Changes**: None.
- **Dependencies**: None.

# Test Plan
- **Verification**:
  - Run `npm run build:examples` to ensure the new example is included in the build artifacts.
  - Run `npx tsx tests/e2e/verify-render.ts` to execute the verification script.
- **Success Criteria**:
  - The build process completes successfully.
  - The verification script outputs `✅ Podcast Visualizer Passed!`.
  - A video file `output/podcast-visualizer-render-verified.mp4` is generated.
- **Edge Cases**:
  - Verify that the `muted` track does not introduce audible audio (this is implicitly tested by the renderer not crashing, though audible verification is manual).
  - Verify that the offset track plays at the correct time (visual/manual verification of the output video).
