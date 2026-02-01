<template>
  <div class="caption-overlay" v-if="activeCaptions.length > 0">
    <div v-for="(cue, index) in activeCaptions" :key="index" class="caption-cue">
      {{ cue.text }}
    </div>
  </div>
</template>

<script setup>
import { useHeliosCaptions } from '../composables/useHeliosCaptions';

const props = defineProps({
  helios: {
    type: Object,
    required: true
  }
});

const activeCaptions = useHeliosCaptions(props.helios);
</script>

<style scoped>
.caption-overlay {
  position: absolute;
  bottom: 50px;
  left: 0;
  width: 100%;
  text-align: center;
  pointer-events: none;
}

.caption-cue {
  display: inline-block;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 24px;
  font-family: Arial, sans-serif;
}
</style>
