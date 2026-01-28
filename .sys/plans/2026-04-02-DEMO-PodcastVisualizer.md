# 2026-04-02-DEMO-PodcastVisualizer.md

## 1. Context & Goal
- **Objective**: Scaffold the `examples/podcast-visualizer` example to verify multi-track audio mixing, `muted` attribute handling, and `data-helios-offset` timing in the Renderer.
- **Trigger**: Vision gap identified in `.jules/DEMO.md` ("Audio Mixing Verification Gap") and memory ("reserved for verifying...").
- **Impact**: Provides a dedicated test case for advanced audio features in the rendering pipeline, ensuring complex audio compositions (like podcasts) render correctly.

## 2. File Inventory
- **Create**:
  - `examples/podcast-visualizer/composition.html`: The example source code.
- **Modify**:
  - `vite.build-example.config.js`: Add the new example to the build input.
  - `tests/e2e/verify-render.ts`: Add a verification test case for this example.
- **Read-Only**:
  - `examples/media-element-animation/composition.html` (Reference)
  - `packages/renderer/src/index.ts` (Reference for behavior)

## 3. Implementation Spec

### A. Example Composition (`examples/podcast-visualizer/composition.html`)
- **Structure**:
  - Use `Helios` with `autoSyncAnimations: true`.
  - Bind to document timeline: `helios.bindToDocumentTimeline()`.
  - Duration: 5 seconds, 30 FPS.
  - Layout: Display "Podcast Visualizer" title and status indicators for the tracks.
- **Audio Tracks**:
  - Use valid Base64 Data URIs for audio sources (e.g., a simple sine beep or noise).
  - **Track 1 (Music)**:
    - Attribute: `loop`.
    - Attribute: `data-helios-offset="0"`.
    - Volume: `0.5` (set via JS or attribute if supported, mostly JS `el.volume = 0.5`).
  - **Track 2 (Voice)**:
    - Attribute: `data-helios-offset="2"` (Starts at 2s).
    - Attribute: `id="voice-track"`.
    - Volume: `1.0`.
  - **Track 3 (Muted)**:
    - Attribute: `muted`.
    - Should be inaudible.
- **Visuals**:
  - **Music Indicator**: A CSS animation (e.g., pulsing circle) that runs continuously.
  - **Voice Indicator**: An element that is initially hidden (`opacity: 0`) and becomes visible (`opacity: 1`) when `helios.currentFrame` corresponds to >= 2 seconds.
    - Logic: `helios.subscribe(state => { ... update DOM ... })`.
    - This visual sync ensures we can verify if the audio (handled by Renderer) matches the visual (handled by Helios).
- **Note on Preview**:
  - Add a visible warning in the HTML: "Note: In browser preview, 'Voice' track will play immediately (ignoring offset) due to DomDriver limitations. Use 'npm run verify' to check correct audio timing."

### B. Build Config (`vite.build-example.config.js`)
- Add entry to `rollupOptions.input`:
  ```javascript
  podcast_visualizer: resolve(__dirname, "examples/podcast-visualizer/composition.html"),
  ```

### C. Verification Script (`tests/e2e/verify-render.ts`)
- Add test case to `CASES` array:
  ```typescript
  { name: 'Podcast Visualizer', relativePath: 'examples/podcast-visualizer/composition.html', mode: 'dom' }
  ```

## 4. Test Plan
- **Verification**: Run `npm run verify` (which triggers `verify-render.ts`).
- **Success Criteria**:
  - Build succeeds (`npm run build:examples` implicitly run by verify).
  - `examples/podcast-visualizer` is compiled.
  - Render completes without error.
  - `output/podcast-visualizer-render-verified.mp4` exists.
- **Edge Cases**:
  - Verify `DomStrategy` doesn't crash with multiple audio tracks.
  - Verify `muted` attribute is respected (no audio from that track).
