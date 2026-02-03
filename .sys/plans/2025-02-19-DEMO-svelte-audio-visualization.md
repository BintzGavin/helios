# 2025-02-19-DEMO-svelte-audio-visualization.md

#### 1. Context & Goal
- **Objective**: Create a Svelte example demonstrating real-time audio analysis (RMS, waveforms) using synthesized `AudioBuffer` and Svelte Stores.
- **Trigger**: Vision gap - `react-audio-visualization` and `vue-audio-visualization` exist, but Svelte version is missing.
- **Impact**: Completes the "Audio Visualization" set for the three primary supported frameworks, ensuring Svelte users have idiomatic examples for advanced audio features.

#### 2. File Inventory
- **Create**:
  - `examples/svelte-audio-visualization/vite.config.js`: Build configuration matching other Svelte examples.
  - `examples/svelte-audio-visualization/composition.html`: Entry point for the player.
  - `examples/svelte-audio-visualization/src/main.js`: Bootstrapping script using Svelte 5 `mount`.
  - `examples/svelte-audio-visualization/src/App.svelte`: Main component containing audio synthesis, analysis logic, and canvas rendering.
  - `examples/svelte-audio-visualization/src/lib/store.js`: Svelte store adapter for Helios.

#### 3. Implementation Spec
- **Architecture**:
  - Use **Svelte 5** (consistent with `svelte-dom-animation` using `mount`).
  - Use `helios.subscribe` wrapped in a Svelte `readable` store (in `src/lib/store.js`).
  - Implement audio synthesis (sine sweep + beats) in `onMount` within `App.svelte`.
  - Implement audio analysis (RMS, waveform extraction) reactively using Svelte's `$: ` syntax or derived logic.
  - Use a Canvas element for high-performance rendering of the waveform and visualizer.
  - Ensure the example does not contain its own `package.json` and relies on root workspace dependencies.

- **Pseudo-Code (App.svelte)**:
  ```svelte
  <script>
    import { onMount } from 'svelte';
    import { Helios } from '@helios-project/core';
    import { createHeliosStore } from './lib/store';

    // Init Helios & Store
    const helios = new Helios({ duration: 10, fps: 30 });
    helios.bindToDocumentTimeline();

    // Debug helper
    if (typeof window !== 'undefined') window.helios = helios;

    const store = createHeliosStore(helios);

    // Audio Data State
    let buffer = null;
    let canvas;

    // Generate Audio on Mount
    onMount(() => {
      // 1. Create AudioContext (fallback for webkit)
      // 2. Create Buffer (duration * sampleRate)
      // 3. Fill Channel Data (Sine sweep + Beat kicks)
      // 4. Set buffer state
    });

    // Reactive Analysis Helper
    function analyzeAudio(buf, time, windowSize = 1024) {
      if (!buf) return { rms: 0, waveform: [] };
      // ... (Same logic as React/Vue useAudioData)
      // Calculate start/end sample based on time * sampleRate
      // Compute RMS and extract waveform slice
      return { rms, waveform };
    }

    // Reactive Analysis
    $: currentTime = $store.currentFrame / helios.fps;
    $: analysis = analyzeAudio(buffer, currentTime);

    // Render Loop (Reactive)
    $: if (canvas && analysis) {
       const ctx = canvas.getContext('2d');
       // Clear canvas
       // Draw Pulsating Circle using analysis.rms
       // Draw Waveform using analysis.waveform
       // Draw Text
    }
  </script>

  <canvas bind:this={canvas} style="width: 100%; height: 100%; display: block;" />
  ```

- **Pseudo-Code (src/lib/store.js)**:
  ```javascript
  import { readable } from 'svelte/store';

  export const createHeliosStore = (helios) => {
    return readable(helios.getState(), (set) => {
      // Init
      set(helios.getState());
      // Subscribe
      const unsubscribe = helios.subscribe((state) => {
        set(state);
      });
      return unsubscribe;
    });
  };
  ```

- **Dependencies**: None.

#### 4. Test Plan
- **Verification**:
  - Run `npm run build:examples` to ensure it compiles.
  - Run `npm run verify:e2e` to ensure the rendering pipeline accepts it.
- **Success Criteria**:
  - `output/example-build/svelte-audio-visualization/composition.html` exists.
  - E2E tests pass for the new example.
