<script>
  import { getContext, setContext, onDestroy } from 'svelte';
  import { derived, writable } from 'svelte/store';
  import { sequence } from '../../../../packages/core/dist/index.js';
  import { FRAME_CONTEXT_KEY, SERIES_CONTEXT_KEY } from './context';

  export let from = 0;
  export let durationInFrames = 0;

  const parentFrameStore = getContext(FRAME_CONTEXT_KEY);
  const seriesContext = getContext(SERIES_CONTEXT_KEY);

  // Store props to make them available in derived store
  const props = writable({ from, durationInFrames });
  $: props.set({ from, durationInFrames });

  let storesToDerive = [parentFrameStore, props];
  let actualFromStore;

  // Stable ID for this component instance
  const id = Symbol();

  if (seriesContext) {
    const unregister = seriesContext.register(id, durationInFrames);
    onDestroy(unregister);

    actualFromStore = seriesContext.getOffset(id);
    storesToDerive.push(actualFromStore);
  }

  // Update Series when duration changes (must be top-level reactive statement)
  $: if (seriesContext) {
    seriesContext.update(id, durationInFrames);
  }

  // Derived store that recalculates whenever parentFrame, props, or series offset changes
  const sequenceState = derived(storesToDerive, (values) => {
    const $parentFrame = values[0];
    const $props = values[1];
    // If seriesContext is active, the third value is the offset from Series
    const $actualFrom = seriesContext ? values[2] : undefined;

    const start = seriesContext ? $actualFrom : $props.from;

    return sequence({
        frame: $parentFrame,
        from: start,
        durationInFrames: $props.durationInFrames
    });
  });

  const isActive = derived(sequenceState, $s => $s.isActive);
  const relativeFrame = derived(sequenceState, $s => $s.relativeFrame);

  setContext(FRAME_CONTEXT_KEY, relativeFrame);
</script>

{#if $isActive}
  <slot />
{/if}
