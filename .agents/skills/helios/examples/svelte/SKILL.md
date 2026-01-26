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

## Key Concepts

- **Store Pattern:** Svelte's `readable` store is the perfect primitive for wrapping the `helios.subscribe` callback.
- **Reactive Statements (`$:`):** Use reactive statements to trigger redraws whenever `$heliosStore` updates.
- **Singleton Helios:** Initialize `Helios` outside the component script or in a separate module to ensure it persists if the component remounts (though for a root App component, inside `<script>` is fine).

## Source Files

- Example: `examples/svelte-canvas-animation/`
