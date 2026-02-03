<script>
  import { Helios } from '@helios-project/core';
  import { createHeliosStore } from './lib/store';
  import { createAudioStore } from './lib/audio';
  import { onMount, tick } from 'svelte';
  import { writable } from 'svelte/store';

  const duration = 10;
  const fps = 30;

  // Init Helios
  const helios = new Helios({ duration, fps });
  helios.bindToDocumentTimeline();
  if (typeof window !== 'undefined') window.helios = helios;

  const heliosStore = createHeliosStore(helios);
  const bufferStore = writable(null);
  const audioStore = createAudioStore(bufferStore, heliosStore);

  let canvas;
  let innerWidth;
  let innerHeight;

  onMount(() => {
    // Generate synthetic audio buffer
    try {
        const sampleRate = 44100;
        const AudioCtor = window.AudioContext || window.webkitAudioContext;

        if (AudioCtor) {
            const ctx = new AudioCtor({ sampleRate });
            const b = ctx.createBuffer(1, sampleRate * duration, sampleRate);
            const data = b.getChannelData(0);

            // Fill data: Sine sweep + Beats
            for (let i = 0; i < data.length; i++) {
                const t = i / sampleRate;
                // Frequency sweep from 100Hz to 1000Hz
                const freq = 100 + (900 * t / duration);
                const sine = Math.sin(2 * Math.PI * freq * t);

                // Beat every 0.5s
                const beatFreq = 2; // Hz
                const beatEnv = Math.exp(-10 * (t * beatFreq % 1)); // Decay envelope
                const kick = Math.sin(2 * Math.PI * 60 * t) * beatEnv;

                data[i] = (sine * 0.5) + (kick * 0.5);
            }
            bufferStore.set(b);
        }
    } catch (e) {
        console.error('Error creating audio buffer:', e);
    }
  });

  // Reactive draw loop
  $: if (canvas && $audioStore) {
      draw();
  }

  // Also react to resizing via bind:innerWidth
  $: if (canvas && innerWidth && innerHeight) {
      draw();
  }

  function draw() {
    if (!canvas) return;

    // Ensure canvas dimensions match window
    if (canvas.width !== innerWidth) canvas.width = innerWidth;
    if (canvas.height !== innerHeight) canvas.height = innerHeight;

    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const { rms, waveform } = $audioStore;
    const currentTime = $heliosStore.currentFrame / fps;

    // Clear
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, width, height);

    // Draw Pulsating Circle (radius based on rms)
    const radius = 50 + (rms * 300);
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 50, 50, ${0.5 + rms})`;
    ctx.fill();

    // Draw Waveform (line)
    ctx.beginPath();
    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 2;

    const windowSize = waveform.length;
    for (let i = 0; i < windowSize; i++) {
        const sample = waveform[i];
        // Map sample (-1 to 1) to y (height to 0)
        const y = (height / 2) + (sample * (height / 4));
        const x = (i / windowSize) * width;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Draw Time Text
    ctx.fillStyle = '#fff';
    ctx.font = '20px monospace';
    ctx.fillText(`Time: ${currentTime.toFixed(2)}s`, 20, 30);
  }
</script>

<svelte:window bind:innerWidth bind:innerHeight />

<canvas bind:this={canvas} style="display: block;"></canvas>

<style>
    :global(body) {
        margin: 0;
        overflow: hidden;
    }
</style>
