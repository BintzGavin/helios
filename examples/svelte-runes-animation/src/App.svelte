<script lang="ts">
  import { onMount } from 'svelte';
  import { Helios } from '@helios-project/core';
  import { HeliosState } from './lib/helios.svelte.ts';

  // Initialize Helios
  const helios = new Helios({
    duration: 5,
    fps: 30,
    autoSyncAnimations: true
  });

  // Create reactive state wrapper
  const state = new HeliosState(helios);

  // Expose to window for player
  onMount(() => {
    if (typeof window !== 'undefined') {
      (window as any).helios = helios;
    }
  });

  // Derived state for animation logic
  // Progress 0..1
  let progress = $derived(state.currentFrame / (state.duration * state.fps));

  // Animation values
  let x = $derived(progress * 300);
  let rotation = $derived(progress * 360);
</script>

<div class="scene">
  <div
    class="box"
    style="transform: translate({x}px, 0) rotate({rotation}deg);"
  >
    {state.currentFrame}
  </div>
</div>

<style>
  :global(body) {
    margin: 0;
    overflow: hidden;
  }
  .scene {
    width: 100%;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #111;
    color: white;
  }
  .box {
    width: 100px;
    height: 100px;
    background: linear-gradient(45deg, #ff3e00, #ff8c00);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: sans-serif;
    font-weight: bold;
    font-size: 24px;
    will-change: transform;
  }
</style>
