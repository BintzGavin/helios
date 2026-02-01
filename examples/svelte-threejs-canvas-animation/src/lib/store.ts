import { readable } from 'svelte/store';
import type { Helios } from '@helios-project/core';

export const createHeliosStore = (helios: Helios<any>) => {
  return readable(helios.getState(), (set) => {
    // Initial set
    set(helios.getState());
    // Subscribe
    const unsubscribe = helios.subscribe((state) => {
      set(state);
    });
    return unsubscribe;
  });
};
