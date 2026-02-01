import { readable } from 'svelte/store';

export function createCaptionsStore(helios) {
  // Access initial value from signal if available, or state
  const initial = helios.activeCaptions.value;

  return readable(initial, (set) => {
    // Initial set
    set(helios.activeCaptions.value);

    const unsubscribe = helios.subscribe((state) => {
      set(state.activeCaptions);
    });

    return unsubscribe;
  });
}
