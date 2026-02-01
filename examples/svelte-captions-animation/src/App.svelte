<script>
  import { Helios } from '@helios-project/core';
  import CaptionOverlay from './lib/CaptionOverlay.svelte';

  // Sample SRT Data
  const sampleSrt = `
1
00:00:00,500 --> 00:00:02,000
Hello, welcome to Helios!

2
00:00:02,000 --> 00:00:03,500
This is a Svelte example.

3
00:00:03,500 --> 00:00:05,000
Showing how to use captions.
`;

  const helios = new Helios({
    width: 1920,
    height: 1080,
    fps: 30,
    duration: 5, // 5 seconds
    captions: sampleSrt,
    autoSyncAnimations: true
  });

  // Bind to document timeline for Renderer compatibility
  helios.bindToDocumentTimeline();

  if (typeof window !== 'undefined') {
    window.helios = helios;
  }
</script>

<div class="container">
  Background Content
  <CaptionOverlay {helios} />
</div>

<style>
  :global(body) {
    margin: 0;
    overflow: hidden;
    background-color: #222;
    font-family: sans-serif;
  }
  .container {
    width: 100%;
    height: 100%;
    background-color: #222;
    display: flex;
    justify-content: center;
    align-items: center;
    color: #555;
    font-size: 40px;
  }
</style>
