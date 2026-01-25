---
title: "Vue Example"
description: "How to use Helios with Vue."
---

# Vue Example

This example demonstrates how to integrate Helios with Vue 3 using the Composition API.

## The Composable: `useVideoFrame`

```javascript
// useVideoFrame.js
import { ref, onUnmounted } from 'vue';

export function useVideoFrame(helios) {
    const frame = ref(helios.getState().currentFrame);

    const update = (state) => {
        frame.value = state.currentFrame;
    };

    const unsubscribe = helios.subscribe(update);

    onUnmounted(() => {
        unsubscribe();
    });

    return frame;
}
```

## The Component

```vue
<script setup>
import { Helios } from '@helios-project/core';
import { useVideoFrame } from './composables/useVideoFrame';

const helios = new Helios({ duration: 5, fps: 30 });
helios.bindToDocumentTimeline();

const frame = useVideoFrame(helios);
</script>

<template>
  <div
    class="box"
    :style="{
        opacity: Math.min(1, frame / 30),
        transform: `rotate(${frame * 2}deg)`
    }"
  >
    Vue
  </div>
</template>

<style scoped>
.box {
    width: 200px;
    height: 200px;
    background-color: #42b883;
}
</style>
```
