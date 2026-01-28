---
title: "Vue Transitions"
description: "Synchronizing Vue transitions and CSS animations with Helios"
---

# Vue Transitions

This example demonstrates how to synchronize standard Vue transitions and CSS animations with the Helios timeline.

## Concept

By setting `autoSyncAnimations: true` in the Helios constructor, the engine automatically intercepts and synchronizes CSS animations and Web Animations API (WAAPI) animations. This allows you to use standard CSS classes for movement, fading, and other effects, while still maintaining frame-accurate seeking.

## Implementation

### Setup

```vue
<script setup>
import { ref, onMounted, onUnmounted, provide } from 'vue';
import { Helios } from '@helios-project/core';
import Sequence from './components/Sequence.vue';

const currentFrame = ref(0);

// Initialize Helios with autoSyncAnimations: true
const helios = new Helios({
  fps: 30,
  duration: 4,
  autoSyncAnimations: true
});

// Bind to document timeline to allow external drivers (like Studio/Renderer)
// to control the global animation timeline.
helios.bindToDocumentTimeline();

let unsubscribe;

onMounted(() => {
  unsubscribe = helios.subscribe((state) => {
    currentFrame.value = state.currentFrame;
  });
});

onUnmounted(() => {
  if (unsubscribe) unsubscribe();
});

provide('currentFrame', currentFrame);
</script>
```

### CSS Animation

Standard CSS animations defined in your stylesheet will be automatically controlled by Helios.

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.fade-in {
  animation: fadeIn 1s forwards;
}
```

### Sequencing

You can wrap elements in a `<Sequence>` component to control when they appear on the timeline.

```vue
<template>
  <div class="container">
    <!-- Starts at frame 0 -->
    <Sequence :from="0" :duration="60">
      <div class="box fade-in">Vue</div>
    </Sequence>

    <!-- Starts at frame 60 (2 seconds) -->
    <Sequence :from="60" :duration="60">
      <div class="box slide-right">Move</div>
    </Sequence>
  </div>
</template>
```
