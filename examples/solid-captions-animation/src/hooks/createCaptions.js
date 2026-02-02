import { createSignal, onCleanup } from 'solid-js';

export function createCaptions(helios) {
  const [captions, setCaptions] = createSignal(helios.activeCaptions.value);

  const unsubscribe = helios.subscribe((state) => {
    setCaptions(state.activeCaptions);
  });

  onCleanup(() => {
    unsubscribe();
  });

  return captions;
}
