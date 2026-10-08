---
name: example-vue
description: Patterns for using Helios with Vue. Use when building compositions in a Vue environment.
---

# Vue Composition Patterns

Integrate Helios into Vue components using the Composition API, Refs, and Watchers.

## Quick Start

### 1. Create `useVideoFrame` Composable

This composable subscribes to Helios and provides a reactive frame reference.

```javascript
// composables/useVideoFrame.js
import { ref, onUnmounted } from 'vue';

export function useVideoFrame(helios) {
  const frame = ref(helios.currentFrame.peek());

  const unsubscribe = helios.subscribe((state) => {
    frame.value = state.currentFrame;
  });

  onUnmounted(() => {
    unsubscribe();
  });

  return frame;
}
```

### 2. Create Composition Component

```vue
<script setup>
import { ref, watch, onMounted } from 'vue';
import { Helios } from '@helios-project/core';
import { useVideoFrame } from './composables/useVideoFrame';

// Initialize Singleton
const helios = new Helios({ duration: 10, fps: 30 });
helios.bindToDocumentTimeline();
if (typeof window !== 'undefined') window.helios = helios;

const canvasRef = ref(null);
const frame = useVideoFrame(helios);

// Draw Function
const draw = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Draw logic
  const progress = frame.value / (helios.duration * helios.fps);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillRect(progress * canvas.width, 100, 50, 50);
};

// React to frame updates
watch(frame, draw);

// Initial Draw
onMounted(() => {
  draw();
});
</script>

<template>
  <canvas ref="canvasRef" width="1920" height="1080"></canvas>
</template>
```

## Audio Visualization Pattern

For audio visualization, use a **computed property** to analyze audio data based on the reactive `frame` or `currentTime`.

### 1. Create Audio Analysis Composable

```javascript
// composables/useAudioData.js
import { computed, unref } from 'vue';

export function useAudioData(buffer, currentTime) {
  return computed(() => {
    const b = unref(buffer);
    const t = unref(currentTime);
    if (!b) return { rms: 0, waveform: [] };

    const data = b.getChannelData(0);
    const sampleRate = b.sampleRate;
    const center = Math.floor(t * sampleRate);

    // Analysis logic...
    return { rms: 0.5, waveform: [] };
  });
}
```

### 2. Use in Component

```vue
<script setup>
import { computed, watch } from 'vue';
import { useVideoFrame } from './composables/useVideoFrame';
import { useAudioData } from './composables/useAudioData';

const frame = useVideoFrame(helios);
const currentTime = computed(() => frame.value / helios.fps);
const audioData = useAudioData(buffer, currentTime);

watch(audioData, ({ rms, waveform }) => {
    // Draw logic
});
</script>
```

## Source Files

- Example: `examples/vue-canvas-animation/`
- Example: `examples/vue-audio-visualization/`
