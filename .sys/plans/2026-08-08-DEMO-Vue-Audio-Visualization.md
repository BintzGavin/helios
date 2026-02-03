# Context & Goal
- **Objective**: Create a Vue 3 example (`examples/vue-audio-visualization`) that demonstrates real-time audio analysis (RMS, waveform) synchronized with Helios.
- **Trigger**: Vision Gap (Parity). The `examples/react-audio-visualization` example exists, but there is no equivalent for Vue, despite the "Any Framework" promise in `README.md`.
- **Impact**: Unlocks the ability for Vue developers to build advanced multimedia compositions (like podcast visualizers or music videos) using Helios, proving the engine's framework-agnostic capabilities.

# File Inventory
- **Create**:
  - `examples/vue-audio-visualization/composition.html`: The HTML entry point.
  - `examples/vue-audio-visualization/vite.config.js`: The local Vite configuration for development.
  - `examples/vue-audio-visualization/src/main.js`: The Vue application entry point.
  - `examples/vue-audio-visualization/src/App.vue`: The main component containing the canvas and logic.
  - `examples/vue-audio-visualization/src/composables/useVideoFrame.js`: A composable to sync Vue state with the Helios frame loop.
  - `examples/vue-audio-visualization/src/composables/useAudioData.js`: A composable to analyze the AudioBuffer based on current time.

- **Modify**: None.

- **Read-Only**:
  - `examples/react-audio-visualization/src/hooks/useAudioData.js` (Reference logic)
  - `examples/vue-canvas-animation/src/composables/useVideoFrame.js` (Reference hook)

# Implementation Spec

## Architecture
- **Framework**: Vue 3 (Composition API)
- **Bundler**: Vite
- **Pattern**:
  - `Helios` singleton instantiated outside components.
  - `useVideoFrame` synchronizes `helios.currentFrame` to a Vue `ref`.
  - `useAudioData` uses a Vue `computed` property to derive visualization data (RMS, waveform) from the raw `AudioBuffer` and `currentTime`.
  - `App.vue` handles the canvas rendering in a reactive watcher.

## Pseudo-Code

### `src/composables/useAudioData.js`
1. Define a function taking `buffer`, `currentTime`, and `windowSize`.
2. Return a computed property.
3. Inside computed: check if buffer exists.
4. Calculate start and end indices based on current time and sample rate.
5. Loop through samples to calculate sum of squares (for RMS) and extract waveform.
6. Return reactive object with `rms` and `waveform`.

### `src/App.vue`
1. Instantiate `Helios` singleton and bind to document timeline.
2. Initialize reactive refs for `buffer` and `canvasRef`.
3. Use `useVideoFrame` to get reactive frame.
4. Compute `currentTime` from frame.
5. Use `useAudioData` to get reactive audio analysis data.
6. On mount: Create `AudioContext`, synthesize audio buffer (sine sweep + beats), and set `buffer.value`.
7. Watch effect: If canvas context exists, clear and draw visualization based on reactive audio data.

## Public API Changes
None.

## Dependencies
- `@helios-project/core` (via workspace dependency).
- `vue` (via root dev dependency).

# Test Plan
- **Verification**: Run `npm install` and then `npx tsx tests/e2e/verify-render.ts examples/vue-audio-visualization/composition.html`.
- **Success Criteria**:
  - The build completes without error.
  - The E2E test passes, confirming the example renders non-black frames for the specified duration.
- **Edge Cases**:
  - `AudioContext` availability checks.
  - Resize handling for canvas.
