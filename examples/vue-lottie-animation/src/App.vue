<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { Helios } from '@helios-project/core';
import lottie from 'lottie-web';
import animationData from './animation.json';

const container = ref(null);
const helios = new Helios({ fps: 30, duration: 2 });
let anim = null;
let unsubscribe = null;

onMounted(() => {
  anim = lottie.loadAnimation({
    container: container.value,
    renderer: 'svg',
    loop: false,
    autoplay: false,
    animationData
  });

  unsubscribe = helios.subscribe(({ currentFrame, fps }) => {
    const timeMs = (currentFrame / fps) * 1000;
    anim.goToAndStop(timeMs, false);
  });
});

onUnmounted(() => {
  if (unsubscribe) unsubscribe();
  if (anim) anim.destroy();
});
</script>

<template>
  <div ref="container" class="lottie-container"></div>
</template>

<style>
.lottie-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
