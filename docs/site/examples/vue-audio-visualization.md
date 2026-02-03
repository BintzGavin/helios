---
title: "Vue Audio Visualization"
description: "Real-time audio visualization using Vue 3 and Helios"
---

# Vue Audio Visualization

This example demonstrates how to integrate Helios with Vue 3's Composition API to create audio visualizations.

## Key Concepts

- **Composables**: Encapsulating Helios logic into reusable functions (`useVideoFrame`).
- **Computed Analysis**: Using `computed` properties to derive audio data from the current frame.
- **Watchers**: Using `watch` to trigger canvas redraws when data changes.

## Implementation

### 1. The Composables

We create a composable to track the video frame.

```javascript
// composables/useVideoFrame.js
import { ref, onUnmounted } from 'vue';

export function useVideoFrame(helios) {
    const frame = ref(helios.getState().currentFrame);

    const unsubscribe = helios.subscribe((state) => {
        frame.value = state.currentFrame;
    });

    onUnmounted(unsubscribe);

    return frame;
}
```

### 2. The Component

The component uses the composable and performs the drawing logic.

```vue
<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { Helios } from '@helios-project/core';
import { useVideoFrame } from './composables/useVideoFrame';

const helios = new Helios({ duration: 10, fps: 30 });
const frame = useVideoFrame(helios);
const canvasRef = ref(null);

// Computed time
const currentTime = computed(() => frame.value / helios.fps);

// Watch for frame changes to redraw
watch(currentTime, (time) => {
    if (!canvasRef.value) return;
    const ctx = canvasRef.value.getContext('2d');

    // Draw logic...
    ctx.clearRect(0, 0, 800, 450);
    ctx.fillText(`Time: ${time.toFixed(2)}`, 20, 30);
});
</script>

<template>
  <canvas ref="canvasRef" width="800" height="450"></canvas>
</template>
```
