import { Template, CompositionOptions } from './types';

export const vueTemplate: Template = {
  id: 'vue',
  label: 'Vue',
  generate: (name: string, options: CompositionOptions) => {
    const { fps, duration } = options;
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name}</title>
  <style>
    body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background-color: #000; }
    #app { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="./main.ts"></script>
</body>
</html>`;

    const main = `import { createApp } from 'vue';
import App from './App.vue';

createApp(App).mount('#app');
`;

    const appVue = `<script setup lang="ts">
import { Helios } from '@helios-project/core';
import { useVideoFrame } from './composables/useVideoFrame';

// Initialize Helios singleton
const duration = ${duration};
const fps = ${fps};
const helios = new Helios({ duration, fps });
helios.bindToDocumentTimeline();

// Expose to window for debugging/player control
if (typeof window !== 'undefined') {
    (window as any).helios = helios;
}

const frame = useVideoFrame(helios);
</script>

<template>
  <div class="container">
    <div
        class="box"
        :style="{
            opacity: Math.min(1, frame / 30),
            transform: \`scale(\${Math.min(1.5, 0.5 + frame / 150)}) rotate(\${frame * 2}deg)\`
        }"
    >
        Vue DOM
    </div>
    <div class="info">Frame: {{ frame.toFixed(2) }}</div>
  </div>
</template>

<style scoped>
.container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: white;
    font-family: sans-serif;
}
.box {
    width: 200px;
    height: 200px;
    background-color: #42b883;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    font-weight: bold;
    border-radius: 20px;
    box-shadow: 0 0 20px rgba(66, 184, 131, 0.5);
    border: 4px solid #35495e;
}
.info {
    margin-top: 2rem;
    font-size: 1.5rem;
}
</style>
`;

    const useVideoFrame = `import { ref, onUnmounted, Ref } from 'vue';
import { Helios } from '@helios-project/core';

export function useVideoFrame(helios: Helios): Ref<number> {
    const frame = ref(helios.getState().currentFrame);

    const update = (state: any) => {
        frame.value = state.currentFrame;
    };

    const unsubscribe = helios.subscribe(update);

    onUnmounted(() => {
        unsubscribe();
    });

    return frame;
}
`;

    return [
      { path: 'composition.html', content: html },
      { path: 'main.ts', content: main },
      { path: 'App.vue', content: appVue },
      { path: 'composables/useVideoFrame.ts', content: useVideoFrame }
    ];
  }
};
