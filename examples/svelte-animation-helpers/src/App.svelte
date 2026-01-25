<script>
  import { setContext } from 'svelte';
  import { derived } from 'svelte/store';
  import { Helios } from '../../../packages/core/dist/index.js';
  import { createHeliosStore } from './lib/store';
  import { FRAME_CONTEXT_KEY } from './lib/context';
  import Sequence from './lib/Sequence.svelte';

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
  const currentFrame = derived(heliosStore, $s => $s.currentFrame);

  setContext(FRAME_CONTEXT_KEY, currentFrame);
</script>

<div class="container">
    <h1 style:color="white">Svelte Animation Helpers</h1>

    <!-- Sequence 1: 0-30 frames -->
    <Sequence from={0} durationInFrames={30}>
        <div class="box" style:background="red">
            Seq 1
        </div>
    </Sequence>

    <!-- Sequence 2: 30-60 frames -->
    <Sequence from={30} durationInFrames={30}>
        <div class="box" style:background="blue">
            Seq 2
        </div>
    </Sequence>

    <!-- Sequence 3: Nested (Starts at 60, internal sequence starts at 0 rel) -->
    <Sequence from={60} durationInFrames={60}>
         <div style:color="white">Wrapper (60-120)</div>
         <Sequence from={0} durationInFrames={30}>
             <div class="box" style:background="green">
                 Nested 1
             </div>
         </Sequence>
         <Sequence from={30} durationInFrames={30}>
             <div class="box" style:background="yellow" style:color="black">
                 Nested 2
             </div>
         </Sequence>
    </Sequence>
</div>

<style>
  :global(body) {
    margin: 0;
    overflow: hidden;
    background-color: #111;
    font-family: sans-serif;
  }
  .container {
    padding: 20px;
  }
  .box {
    width: 100px;
    height: 100px;
    color: white;
    display: flex;
    justify-content: center;
    align-items: center;
    font-weight: bold;
    margin: 10px;
  }
</style>
