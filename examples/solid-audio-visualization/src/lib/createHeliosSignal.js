import { createSignal, onCleanup } from 'solid-js';

export function createHeliosSignal(helios) {
  const [state, setState] = createSignal(helios.getState());
  const unsubscribe = helios.subscribe(setState);
  onCleanup(unsubscribe);
  return state;
}
