<script>
  import { onMount } from 'svelte';
  import { Helios } from '../../../packages/core/src/index.ts';
  import { createHeliosStore } from './lib/store';
  import Sequence from './lib/Sequence.svelte';

  const fps = 30;

  // Initialize synchronously
  const helios = new Helios({
    fps,
    width: 1920,
    height: 1080,
    autoSyncAnimations: true
  });

  const heliosStore = createHeliosStore(helios);
  let currentFrame = 0;

  onMount(() => {
    // Bind to document timeline for CSS animation sync
    helios.bindToDocumentTimeline();

    if (typeof window !== 'undefined') {
      window.helios = helios;
    }
  });

  $: if ($heliosStore) {
    currentFrame = $heliosStore.currentFrame;
  }
</script>

{#if $heliosStore}
  <main>
    <Sequence from={0} {fps}>
      <div class="scene">
        <h1 class="fade-in">Scene 1: Fade In</h1>
        <p class="slide-right">Standard CSS Animations</p>
      </div>
    </Sequence>

    <Sequence from={60} {fps}>
      <div class="scene">
        <h1 class="scale-up">Scene 2: Scale Up</h1>
        <p class="rotate">Synced with Helios</p>
      </div>
    </Sequence>

    <div class="status">Frame: {currentFrame}</div>
  </main>
{/if}

<style>
  :global(body) {
    margin: 0;
    overflow: hidden;
    background: #111;
    color: white;
    font-family: sans-serif;
  }

  main {
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .scene {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
  }

  .status {
    position: absolute;
    bottom: 20px;
    right: 20px;
    font-family: monospace;
    opacity: 0.5;
  }

  /* Animations using var(--sequence-start) for delay */

  .fade-in {
    opacity: 0;
    animation: fadeIn 1s ease-out forwards;
    animation-delay: var(--sequence-start);
  }

  .slide-right {
    transform: translateX(-50px);
    opacity: 0;
    animation: slideRight 1s ease-out forwards;
    animation-delay: calc(var(--sequence-start) + 0.5s); /* Staggered */
  }

  .scale-up {
    transform: scale(0);
    animation: scaleUp 1s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    animation-delay: var(--sequence-start);
  }

  .rotate {
    opacity: 0;
    transform: rotate(-180deg);
    animation: rotateIn 1s ease-out forwards;
    animation-delay: calc(var(--sequence-start) + 0.3s);
  }

  @keyframes fadeIn {
    to { opacity: 1; }
  }

  @keyframes slideRight {
    to { transform: translateX(0); opacity: 1; }
  }

  @keyframes scaleUp {
    to { transform: scale(1); }
  }

  @keyframes rotateIn {
    to { transform: rotate(0); opacity: 1; }
  }
</style>
