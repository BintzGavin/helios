<script setup>
import { ref, onMounted, onUnmounted, provide } from 'vue';
import { Helios } from '../../../packages/core/src/index.ts';
import Sequence from './components/Sequence.vue';

const currentFrame = ref(0);

// Initialize Helios with autoSyncAnimations: true
const helios = new Helios({
  fps: 30,
  duration: 4, // 120 frames
  autoSyncAnimations: true
});

helios.bindToDocumentTimeline();

// Expose to window for debugging/control
if (typeof window !== 'undefined') {
  window.helios = helios;
}

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

<template>
  <div class="container">
    <h1>Vue Transitions</h1>

    <!-- Sequence 1: Starts at frame 0 -->
    <Sequence :from="0" :duration="60">
      <div class="box fade-in" style="background: #42b883; top: 100px; left: 100px; position: absolute;">
        Vue
      </div>
    </Sequence>

    <!-- Sequence 2: Starts at frame 60 (2s) -->
    <Sequence :from="60" :duration="60">
      <div class="box slide-right" style="background: #35495e; top: 250px; left: 100px; position: absolute;">
        Move
      </div>
    </Sequence>
  </div>
</template>

<style>
@import './style.css';
h1 {
  color: white;
  padding: 20px;
  margin: 0;
}
</style>
