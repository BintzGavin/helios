# 2026-08-11-DEMO-Svelte-Audio-Visualization

## 1. Context & Goal
- **Objective**: Create `examples/svelte-audio-visualization` to demonstrate real-time audio analysis (RMS, waveform) using Svelte derived stores, matching the existing React and Vue examples.
- **Trigger**: Vision gap - Framework parity for Audio Visualization (React and Vue exist, Svelte is missing).
- **Impact**: Enables Svelte developers to build audio-reactive videos using Helios, ensuring consistent feature support across all supported frameworks.

## 2. File Inventory
- **Create**:
  - `examples/svelte-audio-visualization/composition.html`: Entry point.
  - `examples/svelte-audio-visualization/src/main.js`: Svelte app mount.
  - `examples/svelte-audio-visualization/src/App.svelte`: Main visualization logic.
  - `examples/svelte-audio-visualization/src/lib/store.js`: Helios store integration.
  - `examples/svelte-audio-visualization/src/lib/audio.js`: Audio analysis logic (derived store).
- **Modify**: None.
- **Read-Only**: `examples/react-audio-visualization/src/App.jsx` (for logic reference), `examples/vue-audio-visualization/src/composables/useAudioData.js` (for math reference).

## 3. Implementation Spec

### Architecture
- **Svelte Adapter**: Use `svelte/store` (`readable`, `writable`, `derived`) to bridge Helios state.
- **Audio Analysis**: Implement `createAudioStore` as a derived store that reacts to `heliosStore` (frame updates) and `bufferStore` (audio data).
- **Rendering**: Use `<canvas>` for high-performance visualization, updated via Svelte reactive statements (`$:`) or `afterUpdate`.

### Pseudo-Code

#### `src/lib/audio.js`
```javascript
import { derived } from 'svelte/store';

export function createAudioStore(bufferStore, heliosStore, windowSize = 1024) {
  return derived([bufferStore, heliosStore], ([$buffer, $helios]) => {
    if (!$buffer) return { rms: 0, waveform: [] };

    // Calculate currentTime from helios frame and fps
    const currentTime = $helios.currentFrame / $helios.fps;

    // Logic from React/Vue examples:
    // 1. Get channel data
    // 2. Calculate center sample index based on currentTime * sampleRate
    // 3. Extract window of samples around center
    // 4. Calculate RMS (root mean square)

    return { rms, waveform };
  });
}
```

#### `src/App.svelte`
```svelte
<script>
  import { Helios } from '@helios-project/core';
  import { createHeliosStore } from './lib/store';
  import { createAudioStore } from './lib/audio';
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';

  // Init Helios
  const helios = new Helios({ duration: 10, fps: 30 });
  helios.bindToDocumentTimeline();
  if (typeof window !== 'undefined') window.helios = helios;

  const heliosStore = createHeliosStore(helios);
  const bufferStore = writable(null);
  const audioStore = createAudioStore(bufferStore, heliosStore);

  let canvas;

  onMount(() => {
    // Generate synthetic audio buffer (sine sweep + beats)
    // Use AudioContext to create buffer
    // Fill data:
    // - Sine sweep: 100Hz to 1000Hz over duration
    // - Beats: decay envelope every 0.5s
    bufferStore.set(generatedBuffer);

    // Handle resize logic
  });

  // Reactive draw loop
  $: if (canvas && $audioStore) {
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const { rms, waveform } = $audioStore;

    // Clear canvas

    // Draw Pulsating Circle (radius based on rms)

    // Draw Waveform (line)

    // Draw Time Text
  }
</script>

<canvas bind:this={canvas} style="width: 100%; height: 100%; display: block;" />
```

### Public API Changes
- None.

### Dependencies
- None.

## 4. Test Plan
- **Verification**:
  - Run `npm run build:examples` from the root.
  - Run `npm run verify:e2e` from the root.
- **Success Criteria**:
  - `output/example-build/examples/svelte-audio-visualization/composition.html` exists.
  - E2E tests pass, confirming the visualization renders without errors and is discoverable.
- **Edge Cases**:
  - `buffer` is null (initial state).
  - Window resize (ensure canvas resizes).
