# Context & Goal
- **Objective**: Scaffold `examples/podcast-visualizer` to verify multi-track audio mixing, `muted` attribute support, and `data-helios-offset` timing in the Renderer.
- **Trigger**: Vision gap identified in `docs/status/DEMO.md` (Audio Mixing Verification Gap) and lack of "realistic" examples for complex renderer features. The example was previously planned but is missing from the codebase.
- **Impact**: Verifies `DomStrategy` correctly handles multiple audio sources, respecting offsets and mute states, ensuring robust audio support for the renderer.

# File Inventory
- **Create**:
  - `examples/podcast-visualizer/composition.html`: Main composition file with multi-track audio (Base64) and Canvas visualization.
  - `examples/podcast-visualizer/vite.config.js`: Dev server configuration.
- **Modify**:
  - `vite.build-example.config.js`: Add `podcast_visualizer` to `rollupOptions.input`.
  - `tests/e2e/verify-render.ts`: Add `Podcast Visualizer` to the `CASES` array.
- **Read-Only**:
  - `packages/core/src/index.ts`
  - `packages/renderer/src/index.ts`

# Implementation Spec
- **Architecture**:
  - **Framework**: Vanilla JS (native DOM + Canvas).
  - **Audio Strategy**: Use standard `<audio>` elements for Renderer discovery (FFmpeg mixing) and Web Audio API (`createMediaElementSource`) for visualization.
  - **Assets**: Embed Base64 Data URIs for "Voice" and "Music" tracks to keep the example self-contained.

- **Pseudo-Code (composition.html)**:
  - Define `VIDEO_SRC` (1x1 pixel black mp4 base64) to ensure `DomStrategy` treats it as a video composition if needed.
  - Define `VOICE_AUDIO` (Base64 WAV/MP3).
  - Define `MUSIC_AUDIO` (Base64 WAV/MP3).
  - Create `<audio id="voice">` with `src` and `data-helios-offset="0"`.
  - Create `<audio id="music">` with `src` and `data-helios-offset="2"` (starts at 2s).
  - Create `<audio id="muted-track">` with `muted` attribute.
  - Initialize `Helios` with `autoSyncAnimations: true`.
  - Connect `AudioContext` to `<audio>` elements for real-time visualization on `<canvas>`.
  - Draw waveform/bars on canvas in `helios.subscribe()`.

- **Pseudo-Code (vite.build-example.config.js)**:
  - Add `podcast_visualizer: resolve(__dirname, "examples/podcast-visualizer/composition.html")` to `rollupOptions.input`.

- **Pseudo-Code (tests/e2e/verify-render.ts)**:
  - Add `{ name: 'Podcast Visualizer', relativePath: 'examples/podcast-visualizer/composition.html', mode: 'dom' }` to `CASES`.

- **Dependencies**: None (uses root dependencies).

# Test Plan
- **Verification**:
  - Run `npm run build:examples`.
  - Run `npx ts-node tests/e2e/verify-render.ts` (or `tsx` if supported).
- **Success Criteria**:
  - Build succeeds.
  - E2E verification passes for 'Podcast Visualizer'.
  - Output video `output/podcast-visualizer-render-verified.mp4` exists.
