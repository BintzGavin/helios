import { createSignal, onCleanup } from 'solid-js';

export function createHeliosSignal(helios) {
  const [frame, setFrame] = createSignal(helios.currentFrame);

  const unsubscribe = helios.subscribe((f) => {
    setFrame(f);
  });

  onCleanup(() => {
    unsubscribe();
  });

  return frame;
}
