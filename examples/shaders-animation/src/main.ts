import { Helios } from '@helios-project/core';
import { componentDefinition as FlowingGradient } from 'shaders/core/FlowingGradient';
import { componentDefinition as Plasma } from 'shaders/core/Plasma';
import { createHeliosShader } from './heliosShader';

async function init() {
  const helios = new Helios({
    fps: 30,
    duration: 5,
  });

  // Same preset JSON as `createShader` from `shaders/js`, so code exported from the
  // shaders.com editor pastes straight in.
  await createHeliosShader(document.getElementById('shader') as HTMLCanvasElement, {
    components: [
      { type: 'FlowingGradient', id: 'background', props: { speed: 3 } },
      { type: 'Plasma', id: 'plasma', props: { speed: 4, blendMode: 'screen', opacity: 0.2 } },
    ],
  }, {
    helios,
    components: [FlowingGradient, Plasma],
    // Props animated from the composition time render the same on every frame and seek.
    onFrame: (time, shader) => shader.update('plasma', { opacity: Math.min(0.2 + time / 4, 1) }),
  });

  // HTML layers over the shader as usual.
  const title = document.getElementById('title')!;
  helios.subscribe(({ currentTime }) => {
    title.style.opacity = String(Math.min(Math.max(currentTime - 1, 0), 1));
  });

  // Bind to document.timeline so the Renderer can drive us
  helios.bindToDocumentTimeline();

  // Expose helios for the Renderer/Bridge
  (window as any).helios = helios;
}

init();
