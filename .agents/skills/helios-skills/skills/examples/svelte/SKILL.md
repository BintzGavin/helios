---
name: example-svelte
description: Patterns for using Helios with Svelte. Use when building compositions in a Svelte environment, utilizing Svelte stores for reactive frame updates.
---

# Svelte Composition Patterns

Integrate Helios into Svelte components using Svelte Stores to manage frame state reactivity efficiently.

## Quick Start

### 1. Create Helios Store

Wrap the Helios instance in a readable store to make state reactive.

```javascript
// lib/store.js
import { readable } from 'svelte/store';

export const createHeliosStore = (helios) => {
  return readable(helios.getState(), (set) => {
    // Set initial value
    set(helios.getState());

    // Subscribe to updates
    const unsubscribe = helios.subscribe((state) => {
      set(state);
    });

    return unsubscribe;
  });
};
```

### 2. Create Composition Component

```svelte
<!-- App.svelte -->
<script>
  import { onMount, onDestroy } from 'svelte';
  import { Helios } from '@helios-project/core';
  import { createHeliosStore } from './lib/store';

  let canvas;
  let ctx;
  const duration = 5;
  const fps = 30;

  // Initialize Singleton
  const helios = new Helios({ duration, fps });
  helios.bindToDocumentTimeline();

  // Expose to window
  if (typeof window !== 'undefined') window.helios = helios;

  // Create Store
  const heliosStore = createHeliosStore(helios);

  // Reactive Drawing Statement
  $: if (ctx && $heliosStore) {
    draw($heliosStore.currentFrame);
  }

  function draw(frame) {
    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Draw
    const progress = frame / (duration * fps);
    ctx.fillStyle = '#ff3e00';
    ctx.fillRect(progress * width, height / 2 - 50, 100, 100);
  }

  onMount(() => {
    ctx = canvas.getContext('2d');
    canvas.width = 1920;
    canvas.height = 1080;
    // Initial draw
    draw(helios.currentFrame.peek());
  });
</script>

<canvas bind:this={canvas}></canvas>

<style>
  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
```

## Svelte 5 (Runes)

For Svelte 5, use the `$state` rune to create a reactive state class.

### 1. Create Helios State Class

```javascript
// lib/helios.svelte.ts
import { Helios } from '@helios-project/core';

export class HeliosState {
    currentFrame = $state(0);
    fps = $state(0);
    duration = $state(0);
    isPlaying = $state(false);

    constructor(helios) {
        this.fps = helios.fps;
        this.duration = helios.duration;
        this.isPlaying = helios.isPlaying;

        helios.subscribe((state) => {
            this.currentFrame = state.currentFrame;
            this.isPlaying = state.isPlaying;
        });
    }
}
```

### 2. Use in Component

```svelte
<!-- App.svelte -->
<script>
  import { Helios } from '@helios-project/core';
  import { HeliosState } from './lib/helios.svelte.js';

  const helios = new Helios({ duration: 10, fps: 30 });
  const state = new HeliosState(helios);

  // Reactivity works automatically with state properties
  $effect(() => {
    console.log(`Current Frame: ${state.currentFrame}`);
  });
</script>

<div>Frame: {state.currentFrame}</div>
```

## Key Concepts

- **Store Pattern:** Svelte's `readable` store is the perfect primitive for wrapping the `helios.subscribe` callback.
- **Reactive Statements (`$:`):** Use reactive statements to trigger redraws whenever `$heliosStore` updates.
- **Singleton Helios:** Initialize `Helios` outside the component script or in a separate module to ensure it persists if the component remounts (though for a root App component, inside `<script>` is fine).

## Audio Visualization Pattern

For audio visualization, use a **derived store** to compute analysis data (RMS, Waveform) reactively based on the current frame.

### 1. Create Audio Store

```javascript
// lib/audio.js
import { derived } from 'svelte/store';

export function createAudioStore(bufferStore, heliosStore) {
    return derived(
        [bufferStore, heliosStore],
        ([$buffer, $heliosState]) => {
            if (!$buffer || !$heliosState) return { rms: 0, waveform: [] };

            const data = $buffer.getChannelData(0);
            const sampleRate = $buffer.sampleRate;
            const time = $heliosState.currentFrame / $heliosState.fps;

            // Analyze window around current time
            const center = Math.floor(time * sampleRate);
            const windowSize = 1024;
            // ... (FFT logic or simple time-domain analysis) ...

            return { rms: 0.5, waveform: [] }; // Mock result
        }
    );
}
```

### 2. Use in Component

```svelte
<script>
    import { createAudioStore } from './lib/audio';
    // ... setup heliosStore and bufferStore ...

    const audioStore = createAudioStore(bufferStore, heliosStore);

    $: if (ctx && $audioStore) {
        const { rms, waveform } = $audioStore;
        // Draw using rms/waveform
    }
</script>
```

## Source Files

- Example: `examples/svelte-canvas-animation/`
- Example: `examples/svelte-runes-animation/`
- Example: `examples/svelte-audio-visualization/`
