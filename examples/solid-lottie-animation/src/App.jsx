import { createEffect, onMount, onCleanup } from 'solid-js';
import { createHeliosSignal } from './lib/createHeliosSignal';
import { Helios } from '@helios-project/core';
import lottie from 'lottie-web';
import animationData from './animation.json';

// Initialize Helios if not already present
if (!window.helios) {
  window.helios = new Helios({
    fps: 30,
    duration: 60, // frames
    width: 1920,
    height: 1080,
    autoStart: true,
  });
}

function App() {
  let containerRef;
  const frame = createHeliosSignal(window.helios);
  let animation = null;

  onMount(() => {
    if (!containerRef) return;

    animation = lottie.loadAnimation({
      container: containerRef,
      renderer: 'svg',
      loop: false,
      autoplay: false,
      animationData: animationData
    });

    onCleanup(() => {
      if (animation) {
        animation.destroy();
      }
    });
  });

  createEffect(() => {
    if (!animation) return;

    const state = frame();
    const { currentFrame } = state;
    const fps = window.helios.fps;

    const timeMs = (currentFrame / fps) * 1000;
    animation.goToAndStop(timeMs);
  });

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
  );
}

export default App;
