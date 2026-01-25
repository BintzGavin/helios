<script setup>
import { Helios } from '../../../packages/core/dist/index.js';
import { useVideoFrame } from './composables/useVideoFrame';

// Initialize Helios singleton
const duration = 5;
const fps = 30;
const helios = new Helios({ duration, fps });
helios.bindToDocumentTimeline();

// Expose to window for debugging/player control
if (typeof window !== 'undefined') {
    window.helios = helios;
}

const frame = useVideoFrame(helios);
</script>

<template>
  <div class="container">
    <div
        class="box"
        :style="{
            opacity: Math.min(1, frame / 30),
            transform: `scale(${Math.min(1.5, 0.5 + frame / 150)}) rotate(${frame * 2}deg)`
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
