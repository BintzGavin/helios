---
title: "Vue Captions Animation"
description: "How to use Helios captions with Vue 3 Composition API"
---

# Vue Captions Animation

This example demonstrates how to integrate Helios caption support with Vue 3 using the Composition API.

## Overview

Helios provides built-in SRT parsing and a reactive `activeCaptions` signal. In Vue, we can wrap this signal in a reactive `ref` or use a composable to bind it to the template.

## Key Concepts

- **`activeCaptions` Signal**: Subscribing to `helios.activeCaptions` to get the current cues.
- **Vue Reactivity**: Updating a Vue `ref` when the signal changes.
- **Styling**: Positioning captions over the video using CSS.

## Example Code

```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { Helios } from '@helios-project/core';
import srtContent from './captions.srt?raw'; // Import SRT as string

const activeCues = ref([]);
const helios = new Helios({
  duration: 10,
  fps: 30,
  captions: srtContent
});

onMounted(() => {
  // Subscribe to Helios state updates
  const unsubscribe = helios.subscribe((state) => {
    activeCues.value = state.activeCaptions;
  });

  onUnmounted(() => {
    unsubscribe();
    helios.dispose();
  });
});
</script>

<template>
  <div class="composition">
    <!-- Your animation content -->
    <div class="captions-overlay">
      <div v-for="cue in activeCues" :key="cue.startTime" class="caption-cue">
        {{ cue.text }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.captions-overlay {
  position: absolute;
  bottom: 20px;
  width: 100%;
  text-align: center;
}

.caption-cue {
  background: rgba(0, 0, 0, 0.7);
  color: white;
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
}
</style>
```
