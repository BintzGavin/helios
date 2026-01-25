<script>
  import { getContext, setContext } from 'svelte';
  import { derived } from 'svelte/store';
  import { sequence } from '../../../../packages/core/dist/index.js';
  import { FRAME_CONTEXT_KEY } from './context';

  export let from = 0;
  export let durationInFrames = 0;

  const parentFrameStore = getContext(FRAME_CONTEXT_KEY);

  // Derived store that recalculates whenever parentFrame changes
  const sequenceState = derived(parentFrameStore, ($parentFrame) => {
    return sequence({ frame: $parentFrame, from, durationInFrames });
  });

  const isActive = derived(sequenceState, $s => $s.isActive);
  const relativeFrame = derived(sequenceState, $s => $s.relativeFrame);

  setContext(FRAME_CONTEXT_KEY, relativeFrame);
</script>

{#if $isActive}
  <slot />
{/if}
