# 2025-02-23-DEMO-PodcastVisualizer.md

## 1. Context & Goal
- **Objective**: Scaffold the `examples/podcast-visualizer` example to verify multi-track audio mixing, `muted` attribute handling, and `data-helios-offset` timing in the Renderer.
- **Trigger**: Vision gap "Audio Mixing Verification Gap" and missing implementation.
- **Impact**: Provides a dedicated test case for advanced audio features (mixing, offset, mute) in the rendering pipeline.

## 2. File Inventory
- **Create**:
  - `examples/podcast-visualizer/composition.html`: The example source code.
- **Modify**:
  - `vite.build-example.config.js`: Add the new example to the build input.
  - `tests/e2e/verify-render.ts`: Add a verification test case for this example.

## 3. Implementation Spec

### A. Example Composition (`examples/podcast-visualizer/composition.html`)
- **Structure**:
  - Use `Helios` with `autoSyncAnimations: true` and `bindToDocumentTimeline`.
  - Duration: 5 seconds, 30 FPS.
  - Layout: Simple status display.
- **Audio Generation (In-Browser)**:
  - Include a script to generate simple WAV Base64 Data URIs (sine waves) to avoid external assets.
  - `function createBeep(freq, duration)` -> returns Data URI.
- **Tracks**:
  - **Track 1 (Background Music)**: 440Hz, Loop, Volume 0.3.
  - **Track 2 (Voice)**: 880Hz, Starts at 2.0s via `data-helios-offset="2"`, Volume 1.0. ID: `voice-track`.
  - **Track 3 (Muted)**: 220Hz, Muted attribute present.
- **Visualization**:
  - **Voice Indicator**: A DOM element that changes opacity based on frame count (simulating visualization of Track 2).
    - Logic: `helios.subscribe(state => indicator.style.opacity = state.currentFrame >= 60 ? 1 : 0.2)`
  - **Music Indicator**: CSS Animation (pulsing) running continuously.
- **Warning**:
  - Display text: "Note: Audio offsets rely on Renderer. In browser preview, all tracks may start immediately."

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
- **Verification**: Run `npm run build:examples` followed by `npx ts-node --esm tests/e2e/verify-render.ts`.
- **Success Criteria**:
  - Build succeeds.
  - Render completes without error.
  - `output/podcast-visualizer-render-verified.mp4` exists.
  - (Manual Check): Video should have background beep throughout, voice beep starting at 2s, and NO third beep.
