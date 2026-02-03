<script>
  import { onMount } from 'svelte';
  import { Helios } from '@helios-project/core';
  import lottie from 'lottie-web';
  import animationData from './animation.json';

  let container;

  onMount(() => {
    // Initialize Helios
    const helios = new Helios({
      duration: 2,
      fps: 30,
    });

    // Initialize Lottie
    const anim = lottie.loadAnimation({
      container,
      renderer: 'svg',
      loop: false,
      autoplay: false,
      animationData,
    });

    // Subscribe to Helios updates
    const unsubscribe = helios.subscribe(({ currentFrame, fps }) => {
      const timeMs = (currentFrame / fps) * 1000;
      anim.goToAndStop(timeMs, false);
    });

    // Cleanup
    return () => {
      unsubscribe();
      anim.destroy();
    };
  });
</script>

<div bind:this={container} style="width: 100%; height: 100%;"></div>
