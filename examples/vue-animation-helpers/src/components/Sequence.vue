<script setup>
import { inject, provide, computed } from 'vue';

const props = defineProps({
  from: {
    type: Number,
    required: true
  },
  durationInFrames: {
    type: Number,
    required: true
  }
});

const parentFrame = inject('videoFrame');

// If parentFrame is undefined (used outside of context), default to 0
const frameValue = parentFrame || computed(() => 0);

const childFrame = computed(() => frameValue.value - props.from);

const isActive = computed(() => {
  const f = childFrame.value;
  return f >= 0 && f < props.durationInFrames;
});

// Provide the shifted frame to children
provide('videoFrame', childFrame);
</script>

<template>
  <div v-if="isActive" style="display: contents">
    <slot />
  </div>
</template>
