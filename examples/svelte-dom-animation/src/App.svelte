<script>
  import { onMount } from 'svelte';
  import { Helios } from '../../../packages/core/src/index.ts';
  import { createHeliosStore } from './lib/store';

  const duration = 5;
  const fps = 30;

  // Initialize Helios
  const helios = new Helios({
    duration,
    fps
  });

  helios.bindToDocumentTimeline();

  if (typeof window !== 'undefined') {
    window.helios = helios;
  }

  const heliosStore = createHeliosStore(helios);
</script>

<div class="container">
    <div
        class="box"
        style:opacity={$heliosStore.currentFrame / (duration * fps)}
        style:transform={`rotate(${$heliosStore.currentFrame * 2}deg)`}
    >
        Svelte DOM
    </div>
</div>

<style>
  :global(body) {
    margin: 0;
    overflow: hidden;
    background-color: #111;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .container {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100vh;
  }
  .box {
    width: 200px;
    height: 200px;
    background-color: royalblue;
    color: white;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 24px;
    font-family: sans-serif;
    border-radius: 10px;
  }
</style>
