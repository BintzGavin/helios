<template>
  <div class="container">
    Background Content
    <CaptionOverlay :helios="helios" />
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { Helios } from '@helios-project/core';
import CaptionOverlay from './components/CaptionOverlay.vue';

// Sample SRT Data
const sampleSrt = `
1
00:00:00,500 --> 00:00:02,000
Hello, welcome to Helios!

2
00:00:02,000 --> 00:00:03,500
This is a Vue 3 example.

3
00:00:03,500 --> 00:00:05,000
Showing how to use captions.
`;

const helios = new Helios({
  width: 1920,
  height: 1080,
  fps: 30,
  duration: 5, // 5 seconds
  captions: sampleSrt,
  autoSyncAnimations: true
});

// Bind to document timeline for Renderer compatibility
helios.bindToDocumentTimeline();

onMounted(() => {
  // Expose helios to window for debugging and potentially some drivers
  window.helios = helios;
});
</script>

<style>
.container {
  width: 100%;
  height: 100%;
  background-color: #222;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #555;
  font-size: 40px;
}
</style>
