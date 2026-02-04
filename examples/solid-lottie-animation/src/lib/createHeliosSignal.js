import { createSignal, onCleanup, onMount } from 'solid-js';

export function createHeliosSignal(helios) {
  const [state, setState] = createSignal(helios.getState());

  onMount(() => {
    const unsub = helios.subscribe(setState);
    onCleanup(() => {
      unsub();
    });
  });

  return state;
}
