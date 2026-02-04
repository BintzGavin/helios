<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { Application, Graphics } from 'pixi.js';
import { Helios } from '../../../packages/core/src/index.ts';

const containerRef = ref(null);

const duration = 5;
const fps = 30;
const helios = new Helios({ duration, fps });

helios.bindToDocumentTimeline();

if (typeof window !== 'undefined') {
  window.helios = helios;
}

let app = null;
let unsubscribe = null;
let mounted = false;

onMounted(async () => {
  mounted = true;
  const pixiApp = new Application();

  await pixiApp.init({
    resizeTo: window,
    backgroundColor: 0x111111,
    antialias: true
  });

  // Check if component was unmounted during async init
  if (!mounted) {
    pixiApp.destroy({ removeView: true, children: true });
    return;
  }

  app = pixiApp;

  if (containerRef.value) {
    containerRef.value.appendChild(app.canvas);
  }

  // Create a simple rotating rectangle
  const rect = new Graphics();
  rect.rect(-50, -50, 100, 100);
  rect.fill(0x42b883); // Vue Green

  rect.x = app.screen.width / 2;
  rect.y = app.screen.height / 2;

  app.stage.addChild(rect);

  // Sync with Helios
  unsubscribe = helios.subscribe((state) => {
    const time = state.currentTime;
    // Rotate based on time
    rect.rotation = time * Math.PI;

    // Keep centered on resize
    rect.x = app.screen.width / 2;
    rect.y = app.screen.height / 2;
  });
});

onUnmounted(() => {
  mounted = false;
  if (unsubscribe) unsubscribe();
  if (app) {
    app.destroy({ removeView: true, children: true });
  }
});
</script>

<template>
  <div ref="containerRef" style="width: 100%; height: 100%;"></div>
</template>
