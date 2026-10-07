---
title: "Shaders (WebGPU Effects)"
description: "Use the 200+ WebGPU effects from Shaders in Helios compositions"
---

# Shaders (WebGPU Effects)

[Shaders](https://shaders.com) is an MIT-licensed library of 200+ WebGPU effects: gradients, noise, glass, metal, light, distortions, blurs and transitions. Layers stack and blend on the GPU, and you can design them visually in the [shaders.com editor](https://shaders.com/design-editor).

Shaders runs its own clock off the browser's frame loop. The `shaders` registry component swaps that clock for Helios time, so each frame draws the same way in the player, in `helios render` and on distributed workers, whatever order frames are rendered in.

## Install

```bash
helios add shaders
```

This copies `heliosShader.ts` into your components folder (you own it, edit it freely) and installs the [`shaders`](https://www.npmjs.com/package/shaders) package.

## Usage

`createHeliosShader` takes the same preset JSON as `createShader` from `shaders/js`, so the code the editor exports for **JavaScript** pastes straight in. Import each component you use from `shaders/core/<Name>` and pass it in `components`; the bundle only carries those.

```ts
import { Helios } from '@helios-project/core';
import { componentDefinition as FlowingGradient } from 'shaders/core/FlowingGradient';
import { componentDefinition as Plasma } from 'shaders/core/Plasma';
import { createHeliosShader } from './components/helios/heliosShader';

const helios = new Helios({ fps: 30, duration: 5 });

await createHeliosShader(document.querySelector('canvas')!, {
  components: [
    { type: 'FlowingGradient', id: 'background', props: { speed: 3 } },
    { type: 'Plasma', id: 'plasma', props: { speed: 4, blendMode: 'screen', opacity: 0.2 } },
  ],
}, {
  helios,
  components: [FlowingGradient, Plasma],
  // Animate any prop from the composition time.
  onFrame: (time, shader) => shader.update('plasma', { opacity: Math.min(0.2 + time / 4, 1) }),
});

helios.bindToDocumentTimeline();
window.helios = helios;
```

Give the canvas a CSS size (for example `width: 100vw; height: 100vh`); the shader renders at that size. HTML layered on top of the canvas renders as usual.

It works the same inside React, Vue, Svelte or Solid: call `createHeliosShader` on a canvas ref when the component mounts and `destroy()` when it unmounts.

See the full example in [`examples/shaders-animation`](https://github.com/BintzGavin/helios/tree/main/examples/shaders-animation).

## Rendering

Render in DOM mode, the default. Canvas mode reads the canvas back after the frame is shown, which a WebGPU canvas doesn't support, so it records blank frames.

Helios starts Chromium with WebGPU enabled. Headless Chromium on Linux without a GPU (CI, containers, cloud workers) can't show WebGPU canvases, so frames come out blank. Run a full Chromium under Xvfb there, with Vulkan on SwiftShader:

```bash
HELIOS_BROWSER_ARGS="--enable-features=Vulkan --use-vulkan=swiftshader --enable-unsafe-swiftshader" \
PUPPETEER_EXECUTABLE_PATH=/path/to/chromium \
xvfb-run -a helios render composition.html --no-headless --width 1280 --height 720
```

SwiftShader draws on the CPU, so it is slow: about 0.7 seconds per frame at 640×360 on 4 cores.

## Keeping frames deterministic

Most components are pure functions of time and props. A few are not:

- **Pointer-driven** components (`CursorTrail`, `CursorRipples`, `Liquify`, `Smoke` and the rest of the Interactive group) react to the mouse, which a render doesn't have.
- **Simulations** (fluids, `ReactionDiffusion`, `Boids`, `TimeTrail`, `DataMosh`) build each frame from the previous one. Render them in one sequential pass, not split across distributed workers.
- **`VideoTexture`** plays its video on the wall clock, and **`WebcamTexture`** needs a camera.
- **`Fog`** starts from a random offset on each page load.

## Telemetry

`createShader` and the framework `<Shader>` components send sampled performance telemetry to shaders.com unless you pass `disableTelemetry`. The Helios adapter uses the core renderer directly, which sends none.
