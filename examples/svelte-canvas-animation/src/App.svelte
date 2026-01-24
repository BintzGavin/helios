<script>
  import { onMount, onDestroy } from 'svelte';
  import { Helios } from '../../../packages/core/dist/index.js';
  import { createHeliosStore } from './lib/store';

  let canvas;
  let ctx;
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

  // Reactive drawing
  $: if (ctx && $heliosStore) {
    draw($heliosStore.currentFrame);
  }

  function draw(currentFrame) {
      const time = currentFrame / fps * 1000; // in ms
      const progress = (time % (duration * 1000)) / (duration * 1000);

      const width = canvas.width;
      const height = canvas.height;

      // Clear
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, width, height);

      const x = progress * width;
      const y = height / 2;
      const radius = 50;

      // Draw moving circle
      ctx.fillStyle = 'royalblue';
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Draw rotating square
      const squareSize = 100;
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.rotate(progress * Math.PI * 2);
      ctx.fillStyle = 'tomato';
      ctx.fillRect(-squareSize / 2, -squareSize / 2, squareSize, squareSize);
      ctx.restore();
  }

  const resizeCanvas = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };

  onMount(() => {
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  });

  onDestroy(() => {
     if (typeof window !== 'undefined') {
        window.removeEventListener('resize', resizeCanvas);
     }
  });

</script>

<canvas bind:this={canvas} style="display: block; width: 100%; height: 100%;"></canvas>

<style>
  :global(body) {
    margin: 0;
    overflow: hidden;
    background-color: #111;
  }
</style>
