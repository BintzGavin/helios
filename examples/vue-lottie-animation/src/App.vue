<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { Helios } from '../../../packages/core/src/index.ts';
import lottie from 'lottie-web';
import animationData from './animation.json';

const container = ref(null);
const helios = new Helios({ fps: 30, duration: 2 }); // Duration 2s matches the square animation (60 frames / 30 fps)

// Bind to document timeline for local preview
helios.bindToDocumentTimeline();

// Expose to window for debugging/player control
if (typeof window !== 'undefined') {
    window.helios = helios;
}

onMounted(() => {
  // 1. Load Animation
  const anim = lottie.loadAnimation({
    container: container.value,
    renderer: 'svg',
    loop: false,
    autoplay: false,
    animationData
  });

  // 2. Subscribe to Helios
  const unsubscribe = helios.subscribe((state) => {
    // We access currentFrame from the state object passed to callback
    const { currentFrame, fps } = state;
    const timeMs = (currentFrame / fps) * 1000;
    anim.goToAndStop(timeMs, false); // false = milliseconds
  });

  onUnmounted(() => {
      unsubscribe();
      anim.destroy();
  });
});
</script>

<template>
  <div class="container">
      <div ref="container" class="lottie-container"></div>
  </div>
</template>

<style scoped>
.container {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f0f0f0;
}
.lottie-container {
    width: 400px;
    height: 400px;
}
</style>
