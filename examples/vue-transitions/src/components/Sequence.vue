<script setup>
import { computed, inject } from 'vue';

const props = defineProps({
  from: {
    type: Number,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  fps: {
    type: Number,
    default: 30
  }
});

const currentFrame = inject('currentFrame');

const startTime = computed(() => props.from / props.fps);

const isActive = computed(() => {
  return currentFrame.value >= props.from && currentFrame.value < props.from + props.duration;
});
</script>

<template>
  <div v-if="isActive" :style="{ '--sequence-start': startTime + 's', position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }">
    <slot />
  </div>
</template>
