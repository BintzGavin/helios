<script setup>
import { ref, provide, onUnmounted } from 'vue';
import { Helios } from '../../../packages/core/dist/index.js';
import Sequence from './components/Sequence.vue';

const helios = new Helios({ duration: 5, fps: 30 });
helios.bindToDocumentTimeline();

if (typeof window !== 'undefined') {
  window.helios = helios;
}

const frame = ref(0);

const unsubscribe = helios.subscribe((state) => {
  frame.value = state.currentFrame;
});

onUnmounted(() => {
  unsubscribe();
});

provide('videoFrame', frame);
</script>

<template>
  <div class="container">
    <h1>Vue Animation Helpers</h1>
    <div>Root Frame: {{ frame.toFixed(2) }}</div>

    <!-- Sequence 1: 0-30 frames -->
    <Sequence :from="0" :durationInFrames="30">
       <div class="box red">Seq 1</div>
    </Sequence>

    <!-- Sequence 2: 30-60 frames -->
    <Sequence :from="30" :durationInFrames="30">
       <div class="box blue">Seq 2</div>
    </Sequence>

    <!-- Sequence 3: Nested -->
    <Sequence :from="60" :durationInFrames="60">
        <div>Wrapper (60-120)</div>
        <Sequence :from="0" :durationInFrames="30">
            <div class="box green">Nested 1</div>
        </Sequence>
        <Sequence :from="30" :durationInFrames="30">
            <div class="box yellow">Nested 2</div>
        </Sequence>
    </Sequence>
  </div>
</template>

<style>
body {
    margin: 0;
    background: #111;
    color: white;
    font-family: sans-serif;
}
.container {
    padding: 20px;
}
.box {
    width: 100px;
    height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    margin: 10px;
    color: white;
}
.red { background: red; }
.blue { background: blue; }
.green { background: green; }
.yellow { background: yellow; color: black; }
</style>
