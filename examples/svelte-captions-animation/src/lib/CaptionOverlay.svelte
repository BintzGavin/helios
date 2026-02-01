<script>
  import { createCaptionsStore } from './stores';

  export let helios;

  const activeCaptions = createCaptionsStore(helios);
</script>

{#if $activeCaptions && $activeCaptions.length > 0}
  <div class="captions-container">
    {#each $activeCaptions as cue}
      <div class="caption-cue">
        {cue.text}
      </div>
    {/each}
  </div>
{/if}

<style>
  .captions-container {
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
