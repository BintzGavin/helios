---
title: "Vue Examples"
description: "Using Helios with Vue"
---

# Vue Examples

Helios integrates easily with Vue's reactivity system.

## DOM Animation

The `vue-dom-animation` example uses Vue's `ref` to store the current frame and `computed` properties to derive animation styles.

### Example Code

```vue
<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Helios } from '@helios-project/core';

const helios = new Helios({ duration: 5, fps: 30 });
helios.bindToDocumentTimeline();

const currentFrame = ref(0);

// Subscribe to updates
let unsubscribe;
onMounted(() => {
  unsubscribe = helios.subscribe((state) => {
    currentFrame.value = state.currentFrame;
  });
});

onUnmounted(() => {
  if (unsubscribe) unsubscribe();
});

const rotation = computed(() => {
  const progress = currentFrame.value / (5 * 30);
  return progress * 360;
});
</script>

<template>
  <div
    class="box"
    :style="{ transform: `rotate(${rotation}deg)` }"
  >
    Frame: {{ currentFrame.toFixed(2) }}
  </div>
</template>
```

## Canvas Animation

Similar to React, for high-performance canvas rendering, you can subscribe to Helios and draw directly to the canvas context, bypassing Vue's template reactivity for the draw loop.
