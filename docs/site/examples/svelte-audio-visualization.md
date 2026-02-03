---
title: "Svelte Audio Visualization"
description: "Real-time audio visualization using Svelte and Helios"
---

# Svelte Audio Visualization

This example demonstrates how to build a reactive audio visualization using Svelte stores and Helios. It shows how to bridge the imperative Helios API with Svelte's declarative reactive system.

## Key Concepts

- **Reactive Stores**: Wrapping `helios` state in a Svelte store (`createHeliosStore`).
- **Derived Analysis**: Creating a derived store that computes audio analysis (RMS, Waveform) based on the current frame.
- **Canvas Rendering**: Using a reactive statement (`$:`) to draw the visualization whenever data changes.

## Implementation

### 1. The Helios Store

First, we create a readable store that exposes the Helios state.

```typescript
// lib/store.ts
import { readable } from 'svelte/store';
import type { Helios } from '@helios-project/core';

export function createHeliosStore(helios: Helios) {
    return readable(helios.getState(), (set) => {
        const unsubscribe = helios.subscribe(set);
        return () => unsubscribe();
    });
}
```

### 2. The Visualization Component

In the component, we combine the Helios store with an audio buffer to derive visualization data.

```svelte
<script>
  import { Helios } from '@helios-project/core';
  import { createHeliosStore } from './lib/store';
  import { onMount } from 'svelte';

  const helios = new Helios({ duration: 10, fps: 30 });
  const heliosStore = createHeliosStore(helios);

  let canvas;

  // Reactive drawing loop
  $: if (canvas && $heliosStore) {
      draw($heliosStore);
  }

  function draw(state) {
      const ctx = canvas.getContext('2d');
      const { width, height } = canvas;

      // Clear background
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, width, height);

      // Draw based on state.currentFrame...
      const t = state.currentFrame / state.fps;
      const x = (t / state.duration) * width;

      ctx.fillStyle = 'red';
      ctx.fillRect(x, 0, 10, height);
  }
</script>

<canvas bind:this={canvas} width={800} height={450}></canvas>
```

## Audio Analysis

For audio visualization, you typically extract an `AudioBuffer` (e.g., using `AudioContext.decodeAudioData`) and then sample it based on the current time.

```typescript
// Pseudo-code for derived audio store
const audioAnalysis = derived([heliosStore, audioBuffer], ([$helios, $buffer]) => {
    if (!$buffer) return { rms: 0, waveform: [] };

    const time = $helios.currentFrame / $helios.fps;
    // Extract RMS and Waveform data from $buffer at 'time'
    return analyzeAudio($buffer, time);
});
```
