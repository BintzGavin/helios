import { readable } from 'svelte/store';

export const createHeliosStore = (helios) => {
  return readable(helios.getState(), (set) => {
    set(helios.getState());
    const unsubscribe = helios.subscribe((state) => {
      set(state);
    });
    return unsubscribe;
  });
};
