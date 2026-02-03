# Context & Goal
- **Objective**: Scaffold `examples/vue-audio-visualization` to demonstrate audio analysis and visualization using Vue 3 and Helios.
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
  - `App.vue` handles the canvas rendering in a reactive effect (watcher) or layout effect.

## Pseudo-Code

### `src/composables/useAudioData.js`
```javascript
export function useAudioData(buffer, currentTime, windowSize = 1024) {
  // Return a computed property
  return computed(() => {
    if (!buffer.value) return { rms: 0, waveform: [] };

    // Logic:
    // 1. Get channel data from buffer.value
    // 2. Calculate start/end sample indices based on currentTime.value * sampleRate
    // 3. Loop through samples to calculate RMS (root mean square) and extract waveform
    // 4. Return { rms, waveform }
  });
}
```

### `src/App.vue`
```vue
<script setup>
// 1. Instantiate Helios (duration: 10, fps: 30)
// 2. Bind to Document Timeline

// State
const canvasRef = ref(null);
const buffer = ref(null); // AudioBuffer

// Hooks
const frame = useVideoFrame(helios);
const currentTime = computed(() => frame.value / helios.fps);
const { rms, waveform } = useAudioData(buffer, currentTime);

// Lifecycle
onMounted(() => {
  // 1. Create AudioContext
  // 2. Create empty AudioBuffer (duration * sampleRate)
  // 3. Fill with synthetic data (Sine sweep 100Hz->1000Hz + Beat kicks)
  // 4. Set buffer.value
});

// Rendering
watchEffect(() => {
   // Draw to canvasRef.value using 2D context
   // Clear screen
   // Draw circle with radius proportional to rms.value
   // Draw waveform path from waveform.value
});
</script>
```

## Public API Changes
None.

## Dependencies
- Must have `@helios-project/core` built.

# Test Plan
- **Verification**: Run `npm run build` in the root directory.
- **Success Criteria**:
  - The build completes without error.
  - The file `output/example-build/examples/vue-audio-visualization/composition.html` exists.
- **Edge Cases**:
  - `AudioContext` availability (check for `window.AudioContext` or `window.webkitAudioContext`).
  - Resize handling (ensure canvas resizes with window).
